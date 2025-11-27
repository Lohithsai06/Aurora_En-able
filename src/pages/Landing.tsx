import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyPress } from '../hooks/useKeyPress';
import BigButton from '../components/BigButton';
import { Eye, Ear, MessageSquare, Brain, Sparkles, Shield, Zap } from 'lucide-react';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const enterPressed = useKeyPress('Enter');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasNavigated = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Create audio instruction
    const utterance = new SpeechSynthesisUtterance(
      'Welcome to En-able. If you are visually impaired, press Enter to navigate to the blind assistance page. Otherwise, click the button to continue to login.'
    );
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Play audio instruction
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 500);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (enterPressed && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate('/blind');
    }
  }, [enterPressed, navigate]);

  return (
    <div className="landing-page">
      {/* Animated background elements */}
      <div className="bg-decoration">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>

      <div className={`landing-container ${isVisible ? 'fade-in' : ''}`}>
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>Accessibility First Platform</span>
          </div>
          
          <h1 className="hero-title">
            Welcome to <span className="brand-gradient">En-able</span>
          </h1>
          
          <p className="hero-subtitle">
            Empowering everyone with intelligent accessibility tools designed for independence and inclusion
          </p>

          {/* Keyboard Shortcut Alert */}
          <div className="keyboard-alert">
            <div className="alert-icon">
              <Eye size={24} />
            </div>
            <p className="alert-text">
              If visually impaired, press <kbd className="kbd-key">ENTER</kbd> for voice navigation
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="cta-buttons">
            <BigButton 
              onClick={() => navigate('/login')}
              variant="primary"
              ariaLabel="Continue to Login"
            >
              Get Started
            </BigButton>
            
            <BigButton 
              onClick={() => navigate('/dashboard')}
              variant="secondary"
              ariaLabel="Explore Dashboard"
            >
              Explore Dashboard
            </BigButton>
          </div>
        </div>

        {/* Features Grid */}
        <div className="features-section">
          <h2 className="features-title">Comprehensive Accessibility Solutions</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card-icon blue">
                <Eye size={32} />
              </div>
              <h3>Visual Assistance</h3>
              <p>Screen readers, voice navigation, and high-contrast modes for the visually impaired</p>
            </div>

            <div className="feature-card">
              <div className="feature-card-icon purple">
                <Ear size={32} />
              </div>
              <h3>Hearing Support</h3>
              <p>Visual indicators, live captions, and sign language resources for the deaf community</p>
            </div>

            <div className="feature-card">
              <div className="feature-card-icon green">
                <MessageSquare size={32} />
              </div>
              <h3>Speech Tools</h3>
              <p>Text-to-speech, communication boards, and alternative input methods</p>
            </div>

            <div className="feature-card">
              <div className="feature-card-icon orange">
                <Brain size={32} />
              </div>
              <h3>Focus Aids</h3>
              <p>Pomodoro timers, task management, and distraction-free environments for ADHD</p>
            </div>
          </div>
        </div>

        {/* Why Choose Section */}
        <div className="why-section">
          <div className="why-card">
            <Shield size={24} />
            <div>
              <h4>Privacy First</h4>
              <p>Your data stays secure and private</p>
            </div>
          </div>
          <div className="why-card">
            <Zap size={24} />
            <div>
              <h4>Lightning Fast</h4>
              <p>Optimized for speed and performance</p>
            </div>
          </div>
          <div className="why-card">
            <Sparkles size={24} />
            <div>
              <h4>Free Forever</h4>
              <p>Always accessible to everyone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
