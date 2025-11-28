async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA", "WORKERS"],
    justification: "Processing audio for real-time captions"
  });
}

let currentTabId = null;
let isCapturing = false;
let summaryTranscript = "";
let isRecordingForSummary = false;
let soundNotifier = null;

// Initialize: Inject content script into all existing tabs
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, injecting content scripts...");
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url && !tab.url.startsWith('chrome://')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => console.log(`Could not inject into tab ${tab.id}`));
      }
    });
  });
});

// Global sound notifier
function createSoundNotifier() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      // Monitor ALL tabs for any sound/notification
      chrome.tabs.sendMessage(tab.id, { type: "SETUP_SOUND_MONITOR" }).catch(() => {});
    });
  });
}

// Monitor tab updates for audio changes - THIS MONITORS ALL TABS
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.audible !== undefined && changeInfo.audible === true) {
    console.log(`Sound detected in tab ${tabId}: ${tab.title}`);
    
    // Get all tabs
    const allTabs = await chrome.tabs.query({});
    
    // Show visual alert on EVERY tab (including the one making sound)
    for (const t of allTabs) {
      if (t.url && !t.url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(t.id, {
          type: "SOUND_NOTIFICATION",
          tabTitle: tab.title || "Unknown Tab",
          tabId: tabId
        }).catch((err) => {
          console.log(`Could not send to tab ${t.id}:`, err.message);
          // Try injecting content script if it's not there
          chrome.scripting.executeScript({
            target: { tabId: t.id },
            files: ['content.js']
          }).then(() => {
            // Retry sending message after injection
            setTimeout(() => {
              chrome.tabs.sendMessage(t.id, {
                type: "SOUND_NOTIFICATION",
                tabTitle: tab.title || "Unknown Tab",
                tabId: tabId
              }).catch(() => {});
            }, 100);
          }).catch(() => {});
        });
      }
    }
    
    // Also create Chrome system notification
    chrome.notifications.create(`sound-${tabId}-${Date.now()}`, {
      type: "basic",
      iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23ff9800'/%3E%3Ctext x='50' y='70' font-size='60' text-anchor='middle' fill='white'%3E🔔%3C/text%3E%3C/svg%3E",
      title: "🔔 Sound Alert",
      message: `Sound/notification from: ${tab.title || "Unknown Tab"}`,
      priority: 2,
      requireInteraction: false
    });
  }
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === "SOUND_DETECTED") {
    const senderTab = await chrome.tabs.get(sender.tab.id);
    
    // Create Chrome notification for sound alert
    chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23ff9800'/%3E%3Ctext x='50' y='70' font-size='60' text-anchor='middle' fill='white'%3E🔊%3C/text%3E%3C/svg%3E",
      title: "🔊 Sound Notification",
      message: `Sound detected from: ${msg.tabTitle}`,
      priority: 2,
      requireInteraction: false
    });
    
    // Broadcast to all tabs except sender
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id !== sender.tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "SOUND_NOTIFICATION",
            tabTitle: msg.tabTitle
          }).catch(() => {});
        }
      });
    });
  }
  
  if (msg.cmd === "START_STT") {
    try {
      // Stop any existing capture first
      if (isCapturing) {
        chrome.runtime.sendMessage({ cmd: "STOP_STREAM" });
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await ensureOffscreen();

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTabId = tab.id;

      // Get stream ID for the tab (MV3 approved method)
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: currentTabId
      });

      console.log("Got streamId:", streamId);

      // Send stream ID to offscreen document
      chrome.runtime.sendMessage({
        cmd: "START_STREAM",
        streamId: streamId
      });

      isCapturing = true;
      isRecordingForSummary = true; // Auto-start recording for summary
      summaryTranscript = ""; // Reset transcript
      
      // Start global sound monitoring
      createSoundNotifier();
      
      // Send status to popup
      chrome.runtime.sendMessage({
        type: "POPUP_STATUS",
        text: "✅ Audio capture active - Tab audio is being monitored",
        color: "#00c853"
      });
      
      // Notify content script to update button states
      chrome.tabs.sendMessage(currentTabId, {
        type: "CAPTURE_STARTED"
      }).catch(() => {});

    } catch (error) {
      console.error("Error starting capture:", error);
      isCapturing = false;
      
      // Send status to popup
      chrome.runtime.sendMessage({
        type: "POPUP_STATUS",
        text: `❌ Error: ${error.message}`,
        color: "#f44336"
      });
      
      // Send error to content script
      if (currentTabId) {
        try {
          await chrome.tabs.sendMessage(currentTabId, {
            type: "TRANSCRIPT",
            text: `❌ Error: ${error.message}\n\nTry clicking "Stop" then "Start" again.`
          });
        } catch (e) {
          // Content script not ready yet, ignore
        }
      }
    }
  }

  if (msg.cmd === "FORWARD_TRANSCRIPT") {
    // Forward transcript to the active tab
    if (currentTabId) {
      try {
        await chrome.tabs.sendMessage(currentTabId, {
          type: "TRANSCRIPT",
          text: msg.text
        });
        
        // Collect transcript for summary - filter out status messages
        const isStatusMessage = msg.text.includes("Buffered:") || 
                               msg.text.includes("Transcribing") || 
                               msg.text.includes("Error") ||
                               msg.text.includes("⚠️") ||
                               msg.text.includes("❌");
        
        if (isRecordingForSummary && msg.text && !isStatusMessage && msg.text.trim().length > 0) {
          summaryTranscript += " " + msg.text;
          console.log("Collected for summary:", msg.text);
        }
      } catch (err) {
        // Content script might not be ready yet, ignore silently
      }
    }
  }

  if (msg.cmd === "STOP_STT") {
    chrome.runtime.sendMessage({ cmd: "STOP_STREAM" });
    isCapturing = false;
    
    // Notify content script to update button states
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, {
        type: "CAPTURE_STOPPED"
      }).catch(() => {});
    }
    currentTabId = null;
    
    chrome.runtime.sendMessage({
      type: "POPUP_STATUS",
      text: "⏹️ Stopped - No audio being captured",
      color: "#f44336"
    });
  }
  
  if (msg.cmd === "GENERATE_SUMMARY") {
    console.log("Generating summary with transcript:", summaryTranscript);
    
    if (summaryTranscript.trim().length === 0) {
      if (currentTabId) {
        await chrome.tabs.sendMessage(currentTabId, {
          type: "SUMMARY",
          text: "No audio was captured. Please ensure captions are running and capturing audio."
        });
      }
      return;
    }
    
    // Send progress notification
    if (currentTabId) {
      await chrome.tabs.sendMessage(currentTabId, {
        type: "SUMMARY_PROGRESS",
        text: "Generating summary from transcript..."
      });
    }
    
    // Generate summary using AI
    const summary = await generateSummary(summaryTranscript);
    
    if (currentTabId) {
      await chrome.tabs.sendMessage(currentTabId, {
        type: "SUMMARY",
        text: summary
      });
    }
    
    // Reset for next summary
    summaryTranscript = "";
    isRecordingForSummary = false;
  }
});

async function generateSummary(transcript) {
  try {
    console.log("Generating AI summary for transcript:", transcript.substring(0, 100));
    
    if (transcript.trim().length < 50) {
      return "Not enough content to summarize. Need at least 50 characters.";
    }
    
    // Use Hugging Face Inference API (FREE) for summarization
    const HF_API_KEY = "hf_placeholder"; // User can add their free API key from huggingface.co
    
    try {
      const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: transcript,
          parameters: {
            max_length: 150,
            min_length: 30,
            do_sample: false
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result[0] && result[0].summary_text) {
          return `AI Summary:\n\n${result[0].summary_text}\n\nWords captured: ${transcript.split(' ').length}`;
        }
      }
    } catch (apiError) {
      console.log("API summarization failed, using fallback:", apiError);
    }
    
    // Fallback: Improved extractive summary
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    if (sentences.length === 0) {
      return "Not enough content to summarize.";
    }
    
    // Take key sentences based on position and length
    let summary = "";
    const numSentences = Math.min(5, sentences.length);
    const step = Math.floor(sentences.length / numSentences);
    
    const keySentences = [];
    for (let i = 0; i < numSentences; i++) {
      const idx = Math.min(i * step, sentences.length - 1);
      keySentences.push(sentences[idx].trim());
    }
    
    summary = keySentences.join(". ") + ".";
    
    return `Summary:\n\n${summary}\n\nTotal: ${sentences.length} sentences captured.`;
  } catch (error) {
    console.error("Summary generation error:", error);
    return "Error generating summary. Please try again.";
  }
}
