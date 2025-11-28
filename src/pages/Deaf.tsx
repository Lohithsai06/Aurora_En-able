import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { Volume2, VolumeX, Subtitles, Video, ArrowLeft, ArrowRight } from 'lucide-react';
import '../styles/deaf.css';
import '../styles/landing.css';

export default function Deaf() {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [visualAlertsEnabled, setVisualAlertsEnabled] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showVisualAlert = (message: string) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'visual-alert';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
      alertDiv.remove();
    }, 3000);
  };

  return (
    <div className="deaf-page">
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

      {/* Animated background */}
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

      <div className="landing-container-dark fade-in-up">
        {/* Hero Section - Matching Landing Page */}
        <div className="hero-section-dark">
          <div className="hero-badge-dark">
            <Subtitles className="star-icon" size={14} />
            <span className="badge-text">Hearing Accessibility Platform</span>
            <div className="badge-shine"></div>
          </div>
          
          <h1 className="hero-title-dark">
            Comprehensive
            <br />
            <span className="brand-gradient-dark">Deaf</span> Support
          </h1>
          
          <p className="hero-subtitle-dark">
            Advanced visual communication and caption tools designed for everyone.
            <br />
            Real-time accessibility, visual alerts, seamless integration.
          </p>
        </div>

        {/* Features Grid - Matching Landing Page Layout */}
        <div className="features-section-dark">
          <div className="section-header">
            <h2 className="section-title-dark">
              Accessibility Features
              <span className="title-highlight">Built for You</span>
            </h2>
            <p className="section-subtitle">
              Comprehensive hearing support solutions that adapt to your unique communication needs
            </p>
          </div>
          
          <div className="features-grid-dark">
            {/* Live Captions Card */}
            <div className="feature-card-dark blue-card">
              <div className="card-glow blue-glow"></div>
              <div className="feature-icon-container blue-gradient">
                <Subtitles size={36} />
              </div>
              <h3 className="feature-title-dark">Live Captions</h3>
              <p className="feature-desc-dark">
                Real-time speech-to-text captions for all audio content with high accuracy
              </p>
              <div className="feature-footer">
                <button
                  onClick={() => {
                    setCaptionsEnabled(!captionsEnabled);
                    showVisualAlert(captionsEnabled ? 'Captions Disabled' : 'Captions Enabled');
                  }}
                  className={`cta-primary-dark ${captionsEnabled ? 'active' : ''}`}
                  aria-label={`Captions ${captionsEnabled ? 'enabled' : 'disabled'}`}
                >
                  {captionsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span>{captionsEnabled ? 'Enabled' : 'Enable Now'}</span>
                  <div className="button-shine"></div>
                </button>
              </div>
            </div>

            {/* Visual Alerts Card */}
            <div className="feature-card-dark purple-card">
              <div className="card-glow purple-glow"></div>
              <div className="feature-icon-container purple-gradient">
                <Video size={36} />
              </div>
              <h3 className="feature-title-dark">Visual Alerts</h3>
              <p className="feature-desc-dark">
                Screen flashes and visual notifications for important environmental sounds
              </p>
              <div className="feature-footer">
                <button
                  onClick={() => {
                    setVisualAlertsEnabled(!visualAlertsEnabled);
                    showVisualAlert(visualAlertsEnabled ? 'Visual Alerts Disabled' : 'Visual Alerts Enabled');
                  }}
                  className={`cta-primary-dark ${visualAlertsEnabled ? 'active' : ''}`}
                  aria-label={`Visual alerts ${visualAlertsEnabled ? 'enabled' : 'disabled'}`}
                >
                  {visualAlertsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span>{visualAlertsEnabled ? 'Enabled' : 'Enable Now'}</span>
                  <div className="button-shine"></div>
                </button>
              </div>
            </div>

            {/* Sign Language Tool Card */}
            <div className="feature-card-dark green-card">
              <div className="card-glow green-glow"></div>
              <div className="feature-icon-container green-gradient">
                <span style={{fontSize: '36px'}}>🤟</span>
              </div>
              <h3 className="feature-title-dark">Sign Language</h3>
              <p className="feature-desc-dark">
                Connect with certified sign language interpreters instantly
              </p>
              <div className="feature-footer">
                <span className="feature-badge">Coming Soon</span>
              </div>
            </div>

            {/* Text Chat Tool Card */}
            <div className="feature-card-dark orange-card">
              <div className="card-glow orange-glow"></div>
              <div className="feature-icon-container orange-gradient">
                <span style={{fontSize: '36px'}}>💬</span>
              </div>
              <h3 className="feature-title-dark">Text Chat</h3>
              <p className="feature-desc-dark">
                Real-time text communication system for seamless interaction
              </p>
              <div className="feature-footer">
                <span className="feature-badge">Available</span>
              </div>
            </div>

            {/* Sound Notifications Tool Card */}
            <div className="feature-card-dark blue-card">
              <div className="card-glow blue-glow"></div>
              <div className="feature-icon-container blue-gradient">
                <span style={{fontSize: '36px'}}>🔔</span>
              </div>
              <h3 className="feature-title-dark">Sound Alerts</h3>
              <p className="feature-desc-dark">
                Visual indicators for doorbell, alarms, and environmental alerts
              </p>
              <div className="feature-footer">
                <span className="feature-badge">Live</span>
              </div>
            </div>

            {/* Emergency Features Card */}
            <div className="feature-card-dark purple-card">
              <div className="card-glow purple-glow"></div>
              <div className="feature-icon-container purple-gradient">
                <span style={{fontSize: '36px'}}>🚨</span>
              </div>
              <h3 className="feature-title-dark">Emergency Support</h3>
              <p className="feature-desc-dark">
                Immediate visual emergency alerts and communication assistance
              </p>
              <div className="feature-footer">
                <span className="feature-badge">24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA - Matching Landing Page */}
        <div className="footer-cta">
          <h3 className="footer-cta-title">Ready to enhance your communication experience?</h3>
          <p className="footer-cta-text">Join thousands who've embraced accessible hearing technology</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="footer-cta-button"
          >
            Back to Dashboard
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
