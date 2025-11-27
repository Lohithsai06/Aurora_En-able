import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyPress } from '../hooks/useKeyPress';
import BigButton from '../components/BigButton';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const enterPressed = useKeyPress('Enter');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
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
      <div className="landing-container fade-in">
        <div className="landing-content">
          <h1 className="landing-title">
            Welcome to <span className="text-gradient">En-able</span>
          </h1>
          <p className="landing-subtitle">
            Empowering accessibility for everyone
          </p>

          <div className="landing-cta slide-up">
            <div className="cta-box">
              <p className="cta-text">
                👁️ If visually impaired, press <kbd className="kbd-key">ENTER</kbd>
              </p>
            </div>
          </div>

          <div className="landing-buttons">
            <BigButton 
              onClick={() => navigate('/login')}
              variant="primary"
              ariaLabel="Continue to Login"
            >
              Continue to Login
            </BigButton>
            
            <BigButton 
              onClick={() => navigate('/dashboard')}
              variant="secondary"
              ariaLabel="Not visually impaired? Click here"
            >
              Not visually impaired? Click here
            </BigButton>
          </div>

          <div className="landing-features">
            <div className="feature-item">
              <span className="feature-icon">👁️</span>
              <span>Visual Assistance</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👂</span>
              <span>Hearing Support</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🗣️</span>
              <span>Speech Tools</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🧠</span>
              <span>Focus Aids</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
