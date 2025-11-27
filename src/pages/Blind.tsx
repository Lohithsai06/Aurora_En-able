import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import '../styles/blind.css';

export default function Blind() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const hasSpoken = useRef(false);

  const options = [
    { label: 'OCR Reader', action: () => speak('OCR Reader selected. This feature will read text from images.') },
    { label: 'Text-to-Speech', action: () => speak('Text to Speech selected. This feature will read any text on screen.') },
    { label: 'Website Reader', action: () => speak('Website Reader selected. This feature will read web pages aloud.') },
    { label: 'Back to Dashboard', action: () => navigate('/dashboard') }
  ];

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!hasSpoken.current) {
      hasSpoken.current = true;
      setTimeout(() => {
        speak('Blind assistance mode activated. Use arrow keys to navigate between options and press Enter to select. Current option: OCR Reader.');
      }, 500);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = (prev + 1) % options.length;
          speak(options[newIndex].label);
          return newIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = (prev - 1 + options.length) % options.length;
          speak(options[newIndex].label);
          return newIndex;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        options[selectedIndex].action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, options]);

  return (
    <div className="blind-page">
      <div className="blind-container">
        <h1 className="blind-title">
          Blind Assistance Mode
        </h1>
        <p className="blind-instruction">
          Use ↑ ↓ Arrow Keys to Navigate • Press Enter to Select
        </p>

        <div className="blind-options">
          {options.map((option, index) => (
            <BigButton
              key={index}
              onClick={option.action}
              variant={selectedIndex === index ? 'primary' : 'secondary'}
              className={`blind-button ${selectedIndex === index ? 'selected' : ''}`}
              ariaLabel={option.label}
            >
              <span className="button-index">{index + 1}</span>
              <span className="button-label">{option.label}</span>
              {selectedIndex === index && <span className="button-indicator">◀ Selected</span>}
            </BigButton>
          ))}
        </div>

        <div className="blind-help">
          <p>Press any option number (1-4) or use arrow keys for navigation</p>
        </div>
      </div>
    </div>
  );
}
