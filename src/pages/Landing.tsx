import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyPress } from '../hooks/useKeyPress';
import BigButton from '../components/BigButton';
import { Eye, Ear, MessageSquare, Brain, Sparkles, Shield, Zap, ArrowRight, Star, Volume2 } from 'lucide-react';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const enterPressed = useKeyPress('Enter');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasNavigated = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const playAudioInstruction = () => {
    // Cancel any existing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(
      'Welcome to En-able. If you are visually impaired, press Enter to navigate to the blind assistance page. Otherwise, click the button to continue to login.'
    );
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
    setAudioPlayed(true);
  };

  useEffect(() => {
    setIsVisible(true);
    
    // Try to play audio immediately (may be blocked by browser)
    const tryAutoPlay = setTimeout(() => {
      try {
        playAudioInstruction();
      } catch (error) {
        console.log('Autoplay blocked - user interaction required');
      }
    }, 500);

    // Add click listener to play audio on first user interaction
    const handleFirstInteraction = () => {
      if (!audioPlayed) {
        playAudioInstruction();
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      clearTimeout(tryAutoPlay);
      window.speechSynthesis.cancel();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (enterPressed && !hasNavigated.current) {
      hasNavigated.current = true;
      window.speechSynthesis.cancel();
      navigate('/blind');
    }
  }, [enterPressed, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="landing-page-dark">
      {/* Navigation Bar */}
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
              onClick={() => navigate('/login')}
              className="navbar-login-btn"
              aria-label="Login"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Animated background with grid and gradient */}
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

      {/* Audio Play Button - Shows if autoplay fails */}
      {!audioPlayed && (
        <button 
          onClick={playAudioInstruction}
          className="audio-play-button"
          aria-label="Play audio instructions"
        >
          <Volume2 size={24} />
          <span>Click to hear instructions</span>
        </button>
      )}

      <div className={`landing-container-dark ${isVisible ? 'fade-in-up' : ''}`}>
        {/* Hero Section */}
        <div className="hero-section-dark">
          {/* Premium Badge */}
          <div className="hero-badge-dark">
            <Star className="star-icon" size={14} />
            <span className="badge-text">Next-Gen Accessibility Platform</span>
            <div className="badge-shine"></div>
          </div>
          
          {/* Main Heading */}
          <h1 className="hero-title-dark">
            Unlock Your Full Potential
            <br />
            with <span className="brand-gradient-dark">En-able</span>
          </h1>
          
          {/* Subtitle */}
          <p className="hero-subtitle-dark">
            Experience cutting-edge accessibility technology designed for everyone.
            <br />
            Break barriers, embrace independence, transform possibilities.
          </p>

          {/* Keyboard Shortcut Alert - Enhanced */}
          <div className="keyboard-alert-dark">
            <div className="alert-glow"></div>
            <div className="alert-icon-dark">
              <Eye size={28} className="eye-pulse" />
            </div>
            <div className="alert-content">
              <p className="alert-label">Visually Impaired?</p>
              <p className="alert-text-dark">
                Press <kbd className="kbd-key-dark">ENTER</kbd> for voice-guided navigation
              </p>
            </div>
          </div>

          {/* CTA Buttons - Modern Design */}
          <div className="cta-buttons-dark">
            <button 
              onClick={() => navigate('/dashboard')}
              className="cta-primary-dark"
              aria-label="Explore Dashboard"
            >
              <Sparkles size={18} />
              <span>Explore Dashboard</span>
              <ArrowRight size={20} className="arrow-icon" />
              <div className="button-shine"></div>
            </button>
          </div>
        </div>

        {/* Features Grid - Enhanced Cards */}
        <div className="features-section-dark">
          <div className="section-header">
            <h2 className="section-title-dark">
              Powerful Features
              <span className="title-highlight">Built for Everyone</span>
            </h2>
            <p className="section-subtitle">
              Comprehensive accessibility solutions that adapt to your unique needs
            </p>
          </div>
          
          <div className="features-grid-dark">
            <div className="feature-card-dark blue-card">
              <div className="card-glow blue-glow"></div>
              <div className="feature-icon-container blue-gradient">
                <Eye size={36} />
              </div>
              <h3 className="feature-title-dark">Visual Assistance</h3>
              <p className="feature-desc-dark">
                Advanced screen readers, intelligent voice navigation, and adaptive high-contrast modes
              </p>
              <div className="feature-footer">
                <span className="feature-badge">AI-Powered</span>
              </div>
            </div>

            <div className="feature-card-dark purple-card">
              <div className="card-glow purple-glow"></div>
              <div className="feature-icon-container purple-gradient">
                <Ear size={36} />
              </div>
              <h3 className="feature-title-dark">Hearing Support</h3>
              <p className="feature-desc-dark">
                Real-time captions, visual alerts, and comprehensive sign language resources
              </p>
              <div className="feature-footer">
                <span className="feature-badge">Live Captions</span>
              </div>
            </div>

            <div className="feature-card-dark green-card">
              <div className="card-glow green-glow"></div>
              <div className="feature-icon-container green-gradient">
                <MessageSquare size={36} />
              </div>
              <h3 className="feature-title-dark">Speech Tools</h3>
              <p className="feature-desc-dark">
                Natural text-to-speech, sign language translator.
              </p>
              <div className="feature-footer">
                <span className="feature-badge">Voice Enabled</span>
              </div>
            </div>

            <div className="feature-card-dark orange-card">
              <div className="card-glow orange-glow"></div>
              <div className="feature-icon-container orange-gradient">
                <Brain size={36} />
              </div>
              <h3 className="feature-title-dark">Neuro Assist</h3>
              <p className="feature-desc-dark">
                A chatbot that assist every unique mind.
              </p>
              <div className="feature-footer">
                <span className="feature-badge">Productivity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="footer-cta">
          <h3 className="footer-cta-title">Ready to transform your digital experience?</h3>
          <p className="footer-cta-text">Join thousands who've already embraced accessible technology</p>
          <button 
            onClick={() => navigate('/login')}
            className="footer-cta-button"
          >
            Start Your Journey
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
