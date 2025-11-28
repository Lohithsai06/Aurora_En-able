let stream = null;
let audioContext = null;
let processor = null;
let chunkBuffer = [];

const SAMPLE_RATE = 16000;
const CHUNK_DURATION_SECONDS = 1.0;
const CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION_SECONDS;

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.cmd === "START_STREAM") {
    await startAudio(msg.streamId);
  }

  if (msg.cmd === "STOP_STREAM") {
    stopAudio(true);
  }
});

async function startAudio(streamId) {
  try {
    console.log("Starting audio with streamId:", streamId);

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      }
    });

    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = audioContext.createMediaStreamSource(stream);
    
    // Add audio processing for better quality
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1.5; // Boost audio slightly
    source.connect(gainNode);

    processor = audioContext.createScriptProcessor(4096, 1, 1);
    gainNode.connect(processor);
    processor.connect(audioContext.destination);

    chunkBuffer = [];
    let lastStatusUpdate = Date.now();

    const flushChunk = (force = false) => {
      if (chunkBuffer.length >= CHUNK_SIZE || (force && chunkBuffer.length >= SAMPLE_RATE)) {
        const take = force ? chunkBuffer.length : CHUNK_SIZE;
        const chunkData = chunkBuffer.splice(0, take);
        const floatChunk = new Float32Array(chunkData);
        
        // Send status to popup
        chrome.runtime.sendMessage({
          type: "POPUP_STATUS",
          text: `🎧 Processing ${(floatChunk.length / SAMPLE_RATE).toFixed(1)}s audio chunk...`,
          color: "#2196F3"
        });

        transcribeAudio(floatChunk);
      }
    };

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      chunkBuffer.push(...inputData);
      
      // Update popup status every 2 seconds
      const now = Date.now();
      if (now - lastStatusUpdate > 2000) {
        chrome.runtime.sendMessage({
          type: "POPUP_STATUS",
          text: `🎵 Capturing audio... (${(chunkBuffer.length / SAMPLE_RATE).toFixed(1)}s buffered)`,
          color: "#4CAF50"
        });
        lastStatusUpdate = now;
      }
      
      flushChunk();
    };

    console.log("Audio capture started successfully");
    
    chrome.runtime.sendMessage({
      type: "POPUP_STATUS",
      text: "✅ Listening... Play audio to see captions!",
      color: "#00c853"
    });
  } catch (error) {
    console.error("Error starting audio capture:", error);
  }
}

async function transcribeAudio(audioData) {
  console.log("transcribeAudio called with CONFIG:", CONFIG);

  if (CONFIG.SERVICE === "demo" || CONFIG.USE_DEMO_MODE) {
    const duration = (audioData.length / SAMPLE_RATE).toFixed(1);
    chrome.runtime.sendMessage({
      cmd: "FORWARD_TRANSCRIPT",
      text: `💬 [Audio captured: ${duration}s]\n\nDemo mode active. Add an API key in config.js to enable real captions.`
    });
    return;
  }

  console.log("Calling transcription service:", CONFIG.SERVICE);

  try {
    if (CONFIG.SERVICE === "assemblyai") {
      await transcribeWithAssemblyAI(audioData);
    } else if (CONFIG.SERVICE === "openai") {
      await transcribeWithOpenAI(audioData);
    }
  } catch (error) {
    console.error("Transcription error:", error);
  }
}

async function transcribeWithAssemblyAI(audioData) {
  console.log("transcribeWithAssemblyAI started");

  try {
    const wavBlob = float32ToWav(audioData, SAMPLE_RATE);
    console.log("WAV blob created, size:", wavBlob.size);

    console.log("Uploading to AssemblyAI...");
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': CONFIG.ASSEMBLYAI_API_KEY
      },
      body: wavBlob
    });

    const uploadData = await uploadResponse.json();
    console.log("Upload response:", uploadData);

    if (!uploadData.upload_url) {
      throw new Error("Failed to upload audio");
    }

    const { upload_url } = uploadData;

    console.log("Requesting transcription...");
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': CONFIG.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ audio_url: upload_url })
    });

    const transcriptData = await transcriptResponse.json();
    console.log("Transcript response:", transcriptData);

    if (!transcriptData.id) {
      throw new Error("Failed to request transcription");
    }

    const { id } = transcriptData;
    console.log("Polling for result...");

    let transcript = null;
    let attempts = 0;
    while (!transcript && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      const resultResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: {
          'authorization': CONFIG.ASSEMBLYAI_API_KEY
        }
      });

      const result = await resultResponse.json();
      console.log("Poll attempt", attempts, "status:", result.status);

      if (result.status === 'completed') {
        transcript = result.text;
      } else if (result.status === 'error') {
        throw new Error(result.error || 'Transcription failed');
      }
    }

    if (transcript) {
      chrome.runtime.sendMessage({
        cmd: "FORWARD_TRANSCRIPT",
        text: transcript
      });
      
      chrome.runtime.sendMessage({
        type: "POPUP_STATUS",
        text: `✅ Transcribed: "${transcript.substring(0, 30)}${transcript.length > 30 ? '...' : ''}"`,
        color: "#00c853"
      });
    } else {
      throw new Error("Transcription timed out");
    }
  } catch (error) {
    console.error("AssemblyAI error:", error);
    throw error;
  }
}

async function transcribeWithOpenAI(audioData) {
  const wavBlob = float32ToWav(audioData, SAMPLE_RATE);

  const formData = new FormData();
  formData.append('file', wavBlob, 'audio.wav');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
    },
    body: formData
  });

  const result = await response.json();

  if (result.text) {
    chrome.runtime.sendMessage({
      cmd: "FORWARD_TRANSCRIPT",
      text: result.text
    });
  }
}

function float32ToWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function stopAudio(flush = false) {
  if (processor) {
    processor.disconnect();
    processor = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (flush && chunkBuffer.length) {
    const remaining = new Float32Array(chunkBuffer.splice(0));
    transcribeAudio(remaining);
  }

  console.log("Audio capture stopped");
}
