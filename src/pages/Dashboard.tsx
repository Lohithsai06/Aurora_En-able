import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardButton from '../components/CardButton';
import { Ear, MessageSquare, Brain, Eye, Sparkles, Clock, Users, Zap, LogOut, Sun, Cloud, Sunset, Moon } from 'lucide-react';
import '../styles/landing.css';
import '../styles/dashboard.css';

export default function Dashboard() {
  const [userName, setUserName] = useState('User');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isVisible, setIsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    } else {
      const userData = JSON.parse(user);
      setUserName(userData.displayName || userData.name || userData.email);
    }
    
    setIsVisible(true);

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Handle scroll
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Sun, message: 'Start your day with accessibility' };
    if (hour < 17) return { text: 'Good Afternoon', icon: Cloud, message: 'Making the web accessible for everyone' };
    if (hour < 21) return { text: 'Good Evening', icon: Sunset, message: 'Evening productivity at your fingertips' };
    return { text: 'Good Night', icon: Moon, message: 'Accessibility never sleeps' };
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const greeting = getGreeting();

  return (
    <div className="dashboard-page-dark">
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
              onClick={handleLogout}
              className="navbar-login-btn"
              aria-label="Logout"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Animated background - Same as Landing */}
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

      <div className={`dashboard-container ${isVisible ? 'visible' : ''}`}>
        {/* Hero Header */}
        <div className="dashboard-hero">
          <div className="hero-content">
            <div className="greeting-section">
              <div className="greeting-badge">
                <greeting.icon className="greeting-emoji" size={28} />
                <span className="greeting-text">{greeting.text}</span>
              </div>
              
              <div className="date-time-row">
                <div className="date-badge">
                  <span>{formatDate()}</span>
                </div>
                <div className="time-badge">
                  <Clock size={16} />
                  <span>{formatTime()}</span>
                </div>
              </div>
            </div>

            <div className="welcome-message">
              <h1 className="hero-title">
                Welcome back,
              </h1>
              <h2 className="user-name-display">
                <span className="user-name-gradient">{userName}</span>
                <Sparkles className="sparkle-icon" size={32} />
              </h2>
            </div>
            
            <p className="hero-subtitle">
              {greeting.message}
            </p>

            <div className="hero-divider"></div>

            <p className="hero-instruction">
              Select your accessibility tool below to get started
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Zap size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-value">4</p>
              <p className="stat-label">Tools Available</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-value">24/7</p>
              <p className="stat-label">Always Accessible</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <Sparkles size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-value">Free</p>
              <p className="stat-label">No Cost Ever</p>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="tools-section">
          <div className="section-header">
            <h2 className="section-title">Accessibility Tools</h2>
            <p className="section-description">Select the tool designed for your specific needs</p>
          </div>

          <div className="dashboard-grid">
            <CardButton
              title="Blind / Visual Impairment"
              description="Screen readers, voice navigation, and audio feedback"
              icon={<Eye size={48} />}
              onClick={() => navigate('/blind')}
            />

            <CardButton
              title="Deaf / Hard of Hearing"
              description="Visual indicators, captions, and sign language support"
              icon={<Ear size={48} />}
              onClick={() => navigate('/deaf')}
            />

            <CardButton
              title="Non-verbal / Speech Impaired"
              description="Text-to-speech, communication boards, and alternative input"
              icon={<MessageSquare size={48} />}
              onClick={() => navigate('/dumb')}
            />

            <CardButton
              title="ADHD / Focus Support"
              description="Task management, timers, and distraction-free tools"
              icon={<Brain size={48} />}
              onClick={() => navigate('/adhd')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
