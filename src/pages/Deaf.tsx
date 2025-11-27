import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { Volume2, VolumeX, Subtitles, Video } from 'lucide-react';
import '../styles/deaf.css';

export default function Deaf() {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [visualAlertsEnabled, setVisualAlertsEnabled] = useState(true);
  const navigate = useNavigate();

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
      <div className="deaf-container fade-in">
        <h1 className="deaf-title">
          Deaf / Hard of Hearing Support
        </h1>
        <p className="deaf-subtitle">
          Visual communication and caption tools
        </p>

        <div className="deaf-content">
          <div className="feature-section">
            <div className="feature-header">
              <Subtitles size={32} className="feature-icon" />
              <h2>Live Captions</h2>
            </div>
            <p className="feature-description">
              Real-time speech-to-text captions for all audio content
            </p>
            <div className="toggle-container">
              <button
                onClick={() => {
                  setCaptionsEnabled(!captionsEnabled);
                  showVisualAlert(captionsEnabled ? 'Captions Disabled' : 'Captions Enabled');
                }}
                className={`toggle-button ${captionsEnabled ? 'active' : ''}`}
                aria-label={`Captions ${captionsEnabled ? 'enabled' : 'disabled'}`}
              >
                {captionsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                <span>{captionsEnabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
          </div>

          <div className="feature-section">
            <div className="feature-header">
              <Video size={32} className="feature-icon" />
              <h2>Visual Alerts</h2>
            </div>
            <p className="feature-description">
              Screen flashes and notifications for important sounds
            </p>
            <div className="toggle-container">
              <button
                onClick={() => {
                  setVisualAlertsEnabled(!visualAlertsEnabled);
                  showVisualAlert(visualAlertsEnabled ? 'Visual Alerts Disabled' : 'Visual Alerts Enabled');
                }}
                className={`toggle-button ${visualAlertsEnabled ? 'active' : ''}`}
                aria-label={`Visual alerts ${visualAlertsEnabled ? 'enabled' : 'disabled'}`}
              >
                {visualAlertsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                <span>{visualAlertsEnabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
          </div>

          <div className="feature-section">
            <div className="feature-header">
              <h2>Available Tools</h2>
            </div>
            <div className="tools-grid">
              <div className="tool-card">
                <h3>🎯 Sign Language Interpreter</h3>
                <p>Connect with certified sign language interpreters</p>
              </div>
              <div className="tool-card">
                <h3>📝 Text Chat</h3>
                <p>Real-time text communication system</p>
              </div>
              <div className="tool-card">
                <h3>🔔 Sound Notifications</h3>
                <p>Visual indicators for doorbell, alarms, and alerts</p>
              </div>
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
