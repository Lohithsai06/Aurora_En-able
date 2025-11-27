import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { MessageCircle, Volume2 } from 'lucide-react';
import '../styles/dumb.css';

export default function Dumb() {
  const [inputText, setInputText] = useState('');
  const navigate = useNavigate();

  const quickPhrases = [
    'Hello',
    'Thank you',
    'Yes',
    'No',
    'Please help me',
    'I need assistance',
    'Water please',
    'I understand',
    'Can you repeat?',
    'Goodbye'
  ];

  const speakText = (text: string) => {
    if (!text.trim()) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="dumb-page">
      <div className="dumb-container fade-in">
        <h1 className="dumb-title">
          Non-verbal Communication Support
        </h1>
        <p className="dumb-subtitle">
          Text-to-speech and communication tools
        </p>

        <div className="dumb-content">
          <div className="text-input-section">
            <label htmlFor="speechText" className="input-label">
              <MessageCircle size={24} className="inline mr-2" />
              Type your message
            </label>
            <textarea
              id="speechText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="text-input focus-ring"
              placeholder="Type what you want to say..."
              rows={4}
              aria-label="Text to speech input"
            />
            <button
              onClick={() => speakText(inputText)}
              className="speak-button"
              disabled={!inputText.trim()}
              aria-label="Speak text"
            >
              <Volume2 size={24} />
              <span>Speak</span>
            </button>
          </div>

          <div className="quick-phrases-section">
            <h2 className="section-title">Quick Phrases</h2>
            <p className="section-description">
              Tap any phrase to speak it instantly
            </p>
            <div className="phrases-grid">
              {quickPhrases.map((phrase, index) => (
                <button
                  key={index}
                  onClick={() => speakText(phrase)}
                  className="phrase-button"
                  aria-label={`Speak: ${phrase}`}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>

          <div className="features-section">
            <div className="feature-item">
              <h3>📱 Communication Board</h3>
              <p>Visual symbols and icons for quick communication</p>
            </div>
            <div className="feature-item">
              <h3>⌨️ Predictive Text</h3>
              <p>Smart suggestions to speed up typing</p>
            </div>
            <div className="feature-item">
              <h3>💾 Saved Phrases</h3>
              <p>Save frequently used phrases for quick access</p>
            </div>
          </div>

          <div className="button-group">
            <BigButton onClick={() => navigate('/dashboard')} variant="secondary">
              Back to Dashboard
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  );
}
