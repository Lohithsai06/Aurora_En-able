import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Square, Pause, Play, Trash2, ArrowLeft, Mic2, Settings, Sparkles, Zap, Loader2 } from 'lucide-react';
import { sendToOpenRouter } from '../lib/openrouter';
import '../styles/blind-tts.css';

export default function BlindTTS() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [announcement, setAnnouncement] = useState('Text to Speech ready. Type something and press Enter to hear it.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [isVisible, setIsVisible] = useState(false);
  const [useAI, setUseAI] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Select first English voice as default
      const englishVoice = availableVoices.find(voice => voice.lang.startsWith('en')) || availableVoices[0];
      setSelectedVoice(englishVoice);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // AI Summarization function
  const aiSummarize = async () => {
    if (!text.trim()) {
      setAnnouncement('No text to summarize. Please type something first.');
      return;
    }

    setIsSummarizing(true);
    setAnnouncement('Summarizing with AI. Please wait...');
    setSummary('');

    try {
      const prompt = `You are an AI assistant helping blind users. Summarize the following text in a clear, concise, and spoken-friendly way. Keep it short (2-3 sentences max) and easy to understand when read aloud:\n\n${text}`;
      
      const result = await sendToOpenRouter(prompt);
      
      setSummary(result);
      setAnnouncement('Summary ready. Speaking now...');
      
      // Auto-speak the summary
      setTimeout(() => speakText(result), 500);
      
    } catch (error) {
      console.error('AI Summarization error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to summarize text. Please try again.';
      setAnnouncement(errorMsg);
      setSummary('');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Speak text (can be original text or summary)
  const speakText = (textToSpeak: string) => {
    if (!textToSpeak.trim()) {
      setAnnouncement('No text to speak.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = speed;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setAnnouncement('Speaking text.');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setAnnouncement('Finished speaking.');
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setAnnouncement('Error speaking text.');
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setAnnouncement('Speech synthesis not available.');
    }
  };

  // Speak original text or trigger AI summary
  const speak = async () => {
    if (!text.trim()) {
      setAnnouncement('No text to speak. Please type something first.');
      return;
    }

    if (useAI) {
      await aiSummarize();
    } else {
      speakText(text);
    }
  };

  // Pause speech
  const pauseSpeech = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setAnnouncement('Paused.');
    }
  };

  // Resume speech
  const resumeSpeech = () => {
    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setAnnouncement('Resumed.');
    }
  };

  // Stop speech
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setAnnouncement('Stopped.');
  };

  // Clear text
  const clearText = () => {
    setText('');
    setSummary('');
    stopSpeech();
    setAnnouncement('Text cleared.');
    textareaRef.current?.focus();
  };

  // Replay summary or original text
  const replayAudio = () => {
    if (summary) {
      speakText(summary);
      setAnnouncement('Replaying AI summary.');
    } else if (text) {
      speakText(text);
      setAnnouncement('Replaying text.');
    }
  };

  // Handle voice change
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = voices.find(v => v.name === e.target.value) || null;
    setSelectedVoice(voice);
    setAnnouncement(`Voice changed to ${voice?.name || 'default'}.`);
  };

  // Handle speed change
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
    setAnnouncement(`Speed set to ${newSpeed.toFixed(1)}x.`);
  };

  // Handle Enter key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      speak();
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // ENTER → summarize + speak (works everywhere)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        speak();
        return;
      }

      // CTRL → replay summary
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'Control') {
        e.preventDefault();
        replayAudio();
        setAnnouncement('Replaying summary.');
        return;
      }

      // SHIFT → stop speech
      if (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === 'Shift') {
        e.preventDefault();
        stopSpeech();
        setAnnouncement('Speech stopped.');
        return;
      }

      // ESC → back to blind menu
      if (e.key === 'Escape') {
        e.preventDefault();
        stopSpeech();
        setAnnouncement('Returning to blind menu.');
        navigate('/blind');
        return;
      }

      // OPTIONAL: P → pause
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        pauseSpeech();
        setAnnouncement('Speech paused.');
        return;
      }

      // OPTIONAL: C → resume
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        resumeSpeech();
        setAnnouncement('Speech resumed.');
        return;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [summary, text, navigate]);

  // Initial announcement and animation
  useEffect(() => {
    setIsVisible(true);
    
    setTimeout(() => {
      const msg = new SpeechSynthesisUtterance(
        'Text to Speech page loaded. Type your text and press Enter to speak it. Toggle AI mode to get a summary first. Press SHIFT to stop, P to pause, C to resume, CTRL to replay, or ESC to go back.'
      );
      msg.rate = 0.9;
      window.speechSynthesis.speak(msg);
    }, 500);

    // Focus textarea after announcement
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 1000);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="tts-page">
      {/* Animated background */}
      <div className="tts-bg">
        <div className="tts-circle tts-circle-1"></div>
        <div className="tts-circle tts-circle-2"></div>
        <div className="tts-circle tts-circle-3"></div>
      </div>

      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className={`tts-container ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="tts-header">
          <div className="tts-icon-badge">
            <Volume2 size={48} />
          </div>
          <h1 className="tts-title">Text-to-Speech with AI</h1>
          <p className="tts-subtitle">
            <Sparkles size={24} />
            <span>Type text, optionally summarize with AI, then listen</span>
          </p>
        </div>

        {/* AI Toggle */}
        <div className="ai-toggle-card">
          <div className="ai-toggle-content">
            <div className="ai-toggle-label">
              <Zap size={24} />
              <span>AI Summary Mode</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => {
                  setUseAI(e.target.checked);
                  setAnnouncement(e.target.checked ? 'AI summarization enabled' : 'AI summarization disabled');
                }}
                aria-label="Toggle AI summarization"
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <p className="ai-toggle-description">
            {useAI 
              ? '✅ Enabled: Text will be summarized by AI before speaking'
              : '❌ Disabled: Original text will be spoken directly'
            }
          </p>
        </div>

        {/* Keyboard shortcuts info */}
        <div className="shortcuts-card">
          <h2 className="shortcuts-title">⌨️ Keyboard Shortcuts</h2>
          <div className="shortcuts-grid">
            <div className="shortcut-item">
              <kbd>Enter</kbd>
              <span>Speak Text</span>
            </div>
            <div className="shortcut-item">
              <kbd>SHIFT</kbd>
              <span>Stop</span>
            </div>
            <div className="shortcut-item">
              <kbd>CTRL</kbd>
              <span>Replay</span>
            </div>
            <div className="shortcut-item">
              <kbd>ESC</kbd>
              <span>Back to Menu</span>
            </div>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="input-section">
          <label htmlFor="text-input" className="input-label">
            <Mic2 size={20} />
            <span>Your Text</span>
            {text.length > 0 && (
              <span className="char-count">{text.length} characters</span>
            )}
          </label>
          <textarea
            ref={textareaRef}
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste your text here... Press Enter to speak, Shift+Enter for new line."
            className="text-input"
            rows={8}
            aria-label="Text input for speech"
            autoFocus
          />
        </div>

        {/* AI Summary Display */}
        {summary && (
          <div className="summary-display">
            <div className="summary-header">
              <Sparkles size={24} />
              <h3>AI Summary</h3>
            </div>
            <p className="summary-text">{summary}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {isSummarizing && (
          <div className="loading-card">
            <Loader2 size={32} className="spin-animation" />
            <span>Summarizing with DeepSeek AI...</span>
          </div>
        )}

        {/* Settings Panel */}
        <div className="settings-panel">
          <div className="settings-header">
            <Settings size={24} />
            <span>Voice Settings</span>
          </div>
          
          <div className="settings-grid">
            {/* Voice Selection */}
            <div className="setting-item">
              <label htmlFor="voice-select" className="setting-label">
                Voice
              </label>
              <select
                id="voice-select"
                value={selectedVoice?.name || ''}
                onChange={handleVoiceChange}
                className="setting-select"
                aria-label="Select voice"
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Speed Control */}
            <div className="setting-item">
              <label htmlFor="speed-slider" className="setting-label">
                Speed: {speed.toFixed(1)}x
              </label>
              <input
                id="speed-slider"
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={handleSpeedChange}
                className="setting-slider"
                aria-label="Speech speed control"
              />
              <div className="slider-labels">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {isSpeaking && (
          <div className="status-card">
            <div className="status-icon">
              {isPaused ? <Pause size={28} /> : <Volume2 size={28} />}
            </div>
            <span className="status-text">
              {isPaused ? 'Paused' : 'Speaking...'}
            </span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="controls-section">
          <button
            onClick={speak}
            className="control-btn control-btn-speak"
            aria-label={useAI ? "Summarize and speak" : "Speak text"}
            disabled={!text.trim() || isSummarizing}
          >
            {useAI ? <Zap size={28} /> : <Play size={28} />}
            <span>{useAI ? 'Summarize & Speak' : 'Speak'}</span>
            <kbd>Enter</kbd>
          </button>

          <button
            onClick={pauseSpeech}
            className="control-btn control-btn-pause"
            aria-label="Pause speech"
            disabled={!isSpeaking || isPaused}
          >
            <Pause size={28} />
            <span>Pause</span>
            <kbd>P</kbd>
          </button>

          <button
            onClick={resumeSpeech}
            className="control-btn control-btn-resume"
            aria-label="Resume speech"
            disabled={!isPaused}
          >
            <Play size={28} />
            <span>Resume</span>
            <kbd>C</kbd>
          </button>

          <button
            onClick={clearText}
            className="control-btn control-btn-clear"
            aria-label="Clear text"
            disabled={!text}
          >
            <Trash2 size={28} />
            <span>Clear</span>
          </button>
        </div>

        {/* Keyboard Shortcut Instructions */}
        <div className="shortcut-instructions">
          <p className="shortcut-text">
            <kbd className="shortcut-key">ESC</kbd>
            <span>Press ESC to go back</span>
          </p>
          <p className="shortcut-text">
            <kbd className="shortcut-key">CTRL</kbd>
            <span>Press CTRL to replay</span>
          </p>
          <p className="shortcut-text">
            <kbd className="shortcut-key">SHIFT</kbd>
            <span>Press SHIFT to stop</span>
          </p>
        </div>


      </div>
    </div>
  );
}
