import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardButton from '../components/CardButton';
import { Ear, MessageSquare, Brain } from 'lucide-react';
import '../styles/dashboard.css';

export default function Dashboard() {
  const [userName, setUserName] = useState('User');
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    } else {
      const userData = JSON.parse(user);
      setUserName(userData.name || userData.email);
    }
  }, [navigate]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header fade-in">
          <h1 className="dashboard-title">
            Welcome, <span className="user-name">{userName}</span>
          </h1>
          <p className="dashboard-subtitle">
            Select the accessibility tool you need
          </p>
        </div>

        <div className="dashboard-grid slide-up">
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
  );
}
