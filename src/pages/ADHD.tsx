import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { Timer, ListChecks, Pause, Play, RotateCcw } from 'lucide-react';
import '../styles/adhd.css';

export default function ADHD() {
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState<string[]>(['Sample task - Click to complete']);
  const [newTask, setNewTask] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime((prev) => prev - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setIsRunning(false);
      // Play completion sound
      const utterance = new SpeechSynthesisUtterance('Pomodoro session complete. Time for a break!');
      window.speechSynthesis.speak(utterance);
    }

    return () => clearInterval(interval);
  }, [isRunning, pomodoroTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPomodoroTime(25 * 60);
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask]);
      setNewTask('');
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  return (
    <div className="adhd-page">
      <div className="adhd-container fade-in">
        <h1 className="adhd-title">
          ADHD / Focus Support
        </h1>
        <p className="adhd-subtitle">
          Tools to help you stay focused and organized
        </p>

        <div className="adhd-content">
          {/* Pomodoro Timer */}
          <div className="pomodoro-section">
            <div className="section-header">
              <Timer size={32} className="section-icon" />
              <h2>Pomodoro Timer</h2>
            </div>
            <p className="section-description">
              Work for 25 minutes, then take a 5-minute break
            </p>

            <div className="timer-display">
              <div className="timer-circle">
                <span className="timer-text">{formatTime(pomodoroTime)}</span>
              </div>
            </div>

            <div className="timer-controls">
              <button
                onClick={toggleTimer}
                className="timer-button primary"
                aria-label={isRunning ? 'Pause timer' : 'Start timer'}
              >
                {isRunning ? <Pause size={24} /> : <Play size={24} />}
                <span>{isRunning ? 'Pause' : 'Start'}</span>
              </button>
              <button
                onClick={resetTimer}
                className="timer-button secondary"
                aria-label="Reset timer"
              >
                <RotateCcw size={24} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="tasks-section">
            <div className="section-header">
              <ListChecks size={32} className="section-icon" />
              <h2>Task List</h2>
            </div>
            <p className="section-description">
              Break down your work into manageable tasks
            </p>

            <div className="task-input-group">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a new task..."
                className="task-input focus-ring"
                aria-label="New task input"
              />
              <button
                onClick={addTask}
                className="add-task-button"
                aria-label="Add task"
              >
                Add
              </button>
            </div>

            <ul className="task-list">
              {tasks.map((task, index) => (
                <li key={index} className="task-item">
                  <span className="task-text">{task}</span>
                  <button
                    onClick={() => removeTask(index)}
                    className="remove-task-button"
                    aria-label={`Complete task: ${task}`}
                  >
                    ✓
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Additional Features */}
          <div className="features-section">
            <div className="feature-card">
              <h3>🎯 Focus Mode</h3>
              <p>Block distractions and stay on task</p>
            </div>
            <div className="feature-card">
              <h3>📊 Progress Tracking</h3>
              <p>Monitor your productivity over time</p>
            </div>
            <div className="feature-card">
              <h3>🔔 Smart Reminders</h3>
              <p>Get gentle nudges to stay on track</p>
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
