import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { BookOpen, Volume2, Globe, ArrowLeft, Eye, Keyboard, Zap, LogOut } from 'lucide-react';
import '../styles/blind.css';
import '../styles/landing.css';

export default function Blind() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.speechSynthesis.cancel();
      window.removeEventListener('scroll', handleScroll);
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
      {/* Navigation Bar - Match Dashboard */}
      <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#gradient1)" />
                <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="url(#gradient2)" />
                <defs>
                  <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b82f6" />
                    <stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="gradient2" x1="2" y1="12" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span>En-able</span>
          </div>
          <div className="navbar-actions">
            <button 
              onClick={() => navigate('/dashboard')}
              className="navbar-login-btn"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft size={18} />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Animated background - Same as Dashboard */}
      <div className="dark-bg-decoration">
        <div className="grid-overlay"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="floating-particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </div>

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
