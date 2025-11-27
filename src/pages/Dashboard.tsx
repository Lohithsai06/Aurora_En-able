import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardButton from '../components/CardButton';
import { Ear, MessageSquare, Brain, Eye, Sparkles, Clock, Users, Zap } from 'lucide-react';
import '../styles/dashboard.css';

export default function Dashboard() {
  const [userName, setUserName] = useState('User');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    } else {
      const userData = JSON.parse(user);
      setUserName(userData.name || userData.email);
    }
    
    setIsVisible(true);

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [navigate]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="dashboard-page">
      {/* Animated background elements */}
      <div className="dashboard-bg">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
      </div>

      <div className={`dashboard-container ${isVisible ? 'visible' : ''}`}>
        {/* Hero Header */}
        <div className="dashboard-hero">
          <div className="hero-content">
            <div className="greeting-badge">
              <Sparkles size={16} />
              <span>{getGreeting()}</span>
            </div>
            
            <h1 className="hero-title">
              Welcome back, <span className="user-name-gradient">{userName}</span>
            </h1>
            
            <p className="hero-subtitle">
              Choose the accessibility tool that fits your needs
            </p>

            <div className="time-display">
              <Clock size={18} />
              <span>{formatTime()}</span>
            </div>
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
