import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardButton from '../components/CardButton';
import { Ear, MessageSquare, Brain, Eye, Search, Settings, HelpCircle, User } from 'lucide-react';
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
    <div className="dashboard-page bg-gradient-to-b from-[#f7faff] to-[#eef2f7] min-h-screen py-16">
      <div className="dashboard-container max-w-7xl mx-auto px-6 lg:px-10">
        <div className="dashboard-header fade-in text-center">
          <h1 className="dashboard-title text-3xl font-semibold text-gray-800">
            Welcome, <span className="user-name text-blue-600 font-bold">{userName}</span>
          </h1>
          <p className="dashboard-subtitle text-gray-500 text-lg mt-2">
            Select an assistive tool to get started.
          </p>
        </div>

        <div className="quick-actions mt-8 flex gap-6 justify-center">
          <div className="rounded-xl bg-white shadow-md p-4 flex items-center gap-4 text-gray-700 hover:scale-105 transition-transform cursor-pointer">
            <Search size={18} /> <span className="font-medium">Search</span>
          </div>
          <div className="rounded-xl bg-white shadow-md p-4 flex items-center gap-4 text-gray-700 hover:scale-105 transition-transform cursor-pointer">
            <Settings size={18} /> <span className="font-medium">Settings</span>
          </div>
          <div className="rounded-xl bg-white shadow-md p-4 flex items-center gap-4 text-gray-700 hover:scale-105 transition-transform cursor-pointer">
            <HelpCircle size={18} /> <span className="font-medium">Help</span>
          </div>
          <div className="rounded-xl bg-white shadow-md p-4 flex items-center gap-4 text-gray-700 hover:scale-105 transition-transform cursor-pointer">
            <User size={18} /> <span className="font-medium">Profile</span>
          </div>
        </div>

        <div className="feature-grid mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 slide-up">
          <CardButton
            title="Visual Assistance"
            description="Screen readers, voice navigation, and audio feedback"
            icon={<Eye />}
            onClick={() => navigate('/blind')}
          />

          <CardButton
            title="Hearing Support"
            description="Visual indicators, captions, and sign language support"
            icon={<Ear />}
            onClick={() => navigate('/deaf')}
          />

          <CardButton
            title="Speech Tools"
            description="Text-to-speech, communication boards, and alternative input"
            icon={<MessageSquare />}
            onClick={() => navigate('/dumb')}
          />

          <CardButton
            title="Focus Aids"
            description="Task management, timers, and distraction-free tools"
            icon={<Brain />}
            onClick={() => navigate('/adhd')}
          />
        </div>
      </div>
    </div>
  );
}
