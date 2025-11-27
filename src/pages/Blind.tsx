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
      route: '/blind/ocr'
    },
    { 
      label: 'Text-to-Speech', 
      icon: <Volume2 size={32} />,
      description: 'Convert any text to natural speech',
      route: '/blind/tts'
    },
    { 
      label: 'Website Reader', 
      icon: <Globe size={32} />,
      description: 'Navigate and read web pages aloud',
      route: '/blind/reader'
    },
    { 
      label: 'Back to Dashboard', 
      icon: <ArrowLeft size={32} />,
      description: 'Return to main dashboard',
      route: '/dashboard'
    }
  ];

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.log('Speech synthesis not available:', error);
    }
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

  // Auto-scroll selected option into view
  useEffect(() => {
    const el = document.getElementById(`option-${selectedIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedIndex]);

  // Voice feedback when selection changes
  useEffect(() => {
    if (isReady && selectedIndex >= 0) {
      speak(`${options[selectedIndex].label}. ${options[selectedIndex].description}`);
    }
  }, [selectedIndex, isReady]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        playNavigationSound();
        setSelectedIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playNavigationSound();
        setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        playSelectSound();
        const route = options[selectedIndex].route;
        setTimeout(() => navigate(route), 200);
      } else if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        if (index < options.length) {
          e.preventDefault();
          playNavigationSound();
          setSelectedIndex(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, navigate, options]);

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
        <div className="blind-options overflow-y-auto max-h-screen focus:outline-none" tabIndex={-1}>
          {options.map((option, index) => (
            <button
              key={index}
              id={`option-${index}`}
              onClick={() => {
                playSelectSound();
                setSelectedIndex(index);
                setTimeout(() => navigate(option.route), 200);
              }}
              className={`blind-option-card ${selectedIndex === index ? 'selected' : ''}`}
              aria-label={`Option ${index + 1}: ${option.label}. ${option.description}`}
              role="button"
              tabIndex={0}
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
