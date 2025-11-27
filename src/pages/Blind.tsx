import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { BookOpen, Volume2, Globe, ArrowLeft, Eye, Keyboard, Zap } from 'lucide-react';
import '../styles/blind.css';

export default function Blind() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const hasSpoken = useRef(false);

  const options = [
    { 
      label: 'OCR Reader', 
      icon: <BookOpen size={32} />,
      description: 'Extract and read text from images',
      action: () => speak('OCR Reader selected. This feature will read text from images.') 
    },
    { 
      label: 'Text-to-Speech', 
      icon: <Volume2 size={32} />,
      description: 'Convert any text to natural speech',
      action: () => speak('Text to Speech selected. This feature will read any text on screen.') 
    },
    { 
      label: 'Website Reader', 
      icon: <Globe size={32} />,
      description: 'Navigate and read web pages aloud',
      action: () => speak('Website Reader selected. This feature will read web pages aloud.') 
    },
    { 
      label: 'Back to Dashboard', 
      icon: <ArrowLeft size={32} />,
      description: 'Return to main dashboard',
      action: () => navigate('/dashboard') 
    }
  ];

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const playNavigationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.05);
  };

  const playSelectSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.15;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  useEffect(() => {
    setIsReady(true);
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
        playNavigationSound();
        setSelectedIndex((prev) => {
          const newIndex = (prev + 1) % options.length;
          speak(options[newIndex].label + '. ' + options[newIndex].description);
          return newIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playNavigationSound();
        setSelectedIndex((prev) => {
          const newIndex = (prev - 1 + options.length) % options.length;
          speak(options[newIndex].label + '. ' + options[newIndex].description);
          return newIndex;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        playSelectSound();
        options[selectedIndex].action();
      } else if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        if (index < options.length) {
          e.preventDefault();
          playNavigationSound();
          setSelectedIndex(index);
          speak(options[index].label + '. ' + options[index].description);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  return (
    <div className="blind-page">
      {/* Animated background */}
      <div className="blind-bg-pattern"></div>

      <div className={`blind-container ${isReady ? 'active' : ''}`}>
        {/* Header Section */}
        <div className="blind-header">
          <div className="blind-icon-badge">
            <Eye size={40} />
          </div>
          <h1 className="blind-title">
            Blind Assistance Mode
          </h1>
          <p className="blind-instruction">
            <Keyboard size={20} />
            <span>Use ↑ ↓ Arrow Keys to Navigate • Press Enter to Select</span>
          </p>
        </div>

        {/* Options Grid */}
        <div className="blind-options">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                playSelectSound();
                option.action();
              }}
              className={`blind-option-card ${selectedIndex === index ? 'selected' : ''}`}
              aria-label={`${option.label}. ${option.description}`}
            >
              <div className="option-number">{index + 1}</div>
              
              <div className="option-icon">
                {option.icon}
              </div>
              
              <div className="option-content">
                <h3 className="option-title">{option.label}</h3>
                <p className="option-description">{option.description}</p>
              </div>
              
              {selectedIndex === index && (
                <div className="option-indicator">
                  <Zap size={24} />
                  <span>Selected</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Help Section */}
        <div className="blind-help">
          <div className="help-grid">
            <div className="help-item">
              <Keyboard size={20} />
              <span>Number keys (1-4) for quick access</span>
            </div>
            <div className="help-item">
              <Volume2 size={20} />
              <span>Audio feedback on every action</span>
            </div>
            <div className="help-item">
              <Eye size={20} />
              <span>High contrast for partial vision</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
