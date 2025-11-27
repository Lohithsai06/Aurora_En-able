import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Square, Pause, Play, Trash2, ArrowLeft, Mic2, Settings, Sparkles } from 'lucide-react';
import '../styles/blind-tts.css';

export default function BlindTTS() {
  const [text, setText] = useState('');
  const [announcement, setAnnouncement] = useState('Text to Speech ready. Type something and press Enter to hear it.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [isVisible, setIsVisible] = useState(false);
  
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

  // Speak text
  const speak = () => {
    if (!text.trim()) {
      setAnnouncement('No text to speak. Please type something first.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
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
    stopSpeech();
    setAnnouncement('Text cleared.');
    textareaRef.current?.focus();
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
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in textarea
      if (document.activeElement === textareaRef.current) {
        return;
      }

      const key = e.key.toLowerCase();
      
      if (key === 's') {
        e.preventDefault();
        stopSpeech();
      } else if (key === 'p') {
        e.preventDefault();
        if (isPaused) {
          resumeSpeech();
        } else {
          pauseSpeech();
        }
      } else if (key === 'r') {
        e.preventDefault();
        resumeSpeech();
      } else if (key === 'c') {
        e.preventDefault();
        clearText();
      } else if (key === 'b') {
        e.preventDefault();
        stopSpeech();
        navigate('/blind');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSpeaking, isPaused, navigate]);

  // Initial announcement and animation
  useEffect(() => {
    setIsVisible(true);
    
    setTimeout(() => {
      const msg = new SpeechSynthesisUtterance(
        'Text to Speech page loaded. Type your text and press Enter to hear it. Press S to stop, P to pause, R to resume, C to clear, or B to go back.'
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
          <h1 className="tts-title">Text-to-Speech</h1>
          <p className="tts-subtitle">
            <Sparkles size={24} />
            <span>Type something and press Enter to hear it</span>
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
              <kbd>S</kbd>
              <span>Stop</span>
            </div>
            <div className="shortcut-item">
              <kbd>P</kbd>
              <span>Pause/Resume</span>
            </div>
            <div className="shortcut-item">
              <kbd>C</kbd>
              <span>Clear Text</span>
            </div>
            <div className="shortcut-item">
              <kbd>B</kbd>
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
            aria-label="Speak text"
            disabled={!text.trim()}
          >
            <Play size={28} />
            <span>Speak</span>
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
            <kbd>R</kbd>
          </button>

          <button
            onClick={stopSpeech}
            className="control-btn control-btn-stop"
            aria-label="Stop speech"
            disabled={!isSpeaking}
          >
            <Square size={28} />
            <span>Stop</span>
            <kbd>S</kbd>
          </button>

          <button
            onClick={clearText}
            className="control-btn control-btn-clear"
            aria-label="Clear text"
            disabled={!text}
          >
            <Trash2 size={28} />
            <span>Clear</span>
            <kbd>C</kbd>
          </button>
        </div>

        {/* Back Button */}
        <div className="back-section">
          <button
            onClick={() => {
              stopSpeech();
              navigate('/blind');
            }}
            className="back-button"
            aria-label="Back to blind menu"
          >
            <ArrowLeft size={28} />
            <span>Back to Menu</span>
            <kbd>B</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
