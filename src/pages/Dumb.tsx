import { useState, useRef, useEffect } from 'react';
import { Volume2, Trash2, Copy, Video, VideoOff } from 'lucide-react';
import Webcam from 'react-webcam';
import { Hands, Results } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import '../styles/dumb.css';

type Mode = 'gesture' | 'type' | 'symbol';

export default function Dumb() {
  const [currentMode, setCurrentMode] = useState<Mode>('gesture');
  const [outputText, setOutputText] = useState<string>('Your message will appear here');
  const [history, setHistory] = useState<string[]>([]);
  const [aiMode, setAiMode] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleSpeak = () => {
    if (!outputText || outputText === 'Your message will appear here') return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(outputText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const handleClear = () => {
    setOutputText('Your message will appear here');
  };

  const handleCopy = async () => {
    if (!outputText || outputText === 'Your message will appear here') return;
    
    try {
      await navigator.clipboard.writeText(outputText);
      // Optional: Add toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const toggleCamera = () => {
    setCameraActive(!cameraActive);
  };

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (currentMode !== 'gesture') return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onHandsResults);
    handsRef.current = hands;

    return () => {
      if (handsRef.current) {
        handsRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentMode]);

  // Process webcam frames
  useEffect(() => {
    if (currentMode !== 'gesture' || !cameraActive) return;

    const detectHands = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4 &&
        handsRef.current
      ) {
        const video = webcamRef.current.video;
        await handsRef.current.send({ image: video });
      }
      
      // Process every 200ms to reduce CPU usage
      setTimeout(() => {
        if (cameraActive && currentMode === 'gesture') {
          animationFrameRef.current = requestAnimationFrame(detectHands);
        }
      }, 200);
    };

    detectHands();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, currentMode]);

  // Draw hand landmarks on canvas
  const onHandsResults = (results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw hand landmarks if detected
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw connections (lines between points)
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 5,
        });
        
        // Draw landmarks (dots)
        drawLandmarks(ctx, landmarks, {
          color: '#FF0000',
          lineWidth: 2,
          radius: 5,
        });
      }
    }

    ctx.restore();
  };

  return (
    <div 
      className="dumb-page" 
      role="main" 
      aria-label="Dumb communication page"
      tabIndex={0}
    >
      <div className="dumb-container fade-in">
        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Smart Communication Board
          </h1>
          <p className="text-lg text-gray-600">
            For non-verbal users
          </p>
        </header>

        {/* Mode Switch Bar */}
        <div className="mode-switch-bar flex justify-center gap-4 mb-8">
          <button
            className={`mode-tab ${currentMode === 'gesture' ? 'active' : ''}`}
            onClick={() => setCurrentMode('gesture')}
            aria-pressed={currentMode === 'gesture'}
          >
            Gesture Mode
          </button>
          <button
            className={`mode-tab ${currentMode === 'type' ? 'active' : ''}`}
            onClick={() => setCurrentMode('type')}
            aria-pressed={currentMode === 'type'}
          >
            Type Mode
          </button>
          <button
            className={`mode-tab ${currentMode === 'symbol' ? 'active' : ''}`}
            onClick={() => setCurrentMode('symbol')}
            aria-pressed={currentMode === 'symbol'}
          >
            Symbol Mode
          </button>
        </div>

        {/* Output Display Panel */}
        <div className="output-panel">
          <div className="output-text">
            {outputText}
          </div>
          
          <div className="output-controls">
            <button 
              className="control-btn speak-btn focus-ring"
              onClick={handleSpeak}
              aria-label="Speak message"
            >
              <Volume2 size={24} />
              <span>Speak</span>
            </button>
            
            <button 
              className="control-btn clear-btn focus-ring"
              onClick={handleClear}
              aria-label="Clear message"
            >
              <Trash2 size={24} />
              <span>Clear</span>
            </button>
            
            <button 
              className="control-btn copy-btn focus-ring"
              onClick={handleCopy}
              aria-label="Copy message"
            >
              <Copy size={24} />
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Webcam Section - Only visible in Gesture Mode */}
        {currentMode === 'gesture' && (
          <section 
            className="webcam-section"
            role="region"
            aria-label="Gesture camera"
          >
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
              Gesture Camera
            </h2>
            
            <p className="text-center text-gray-600 mb-4">
              Show your hand gestures in front of the camera
            </p>

            <div className="webcam-container">
              {cameraActive ? (
                <div className="webcam-wrapper">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: 'user',
                    }}
                    className="webcam-video"
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="webcam-canvas"
                  />
                </div>
              ) : (
                <div className="webcam-placeholder">
                  <VideoOff size={64} className="text-gray-400" />
                  <p className="text-gray-500 mt-4">Camera paused</p>
                </div>
              )}
            </div>

            <div className="webcam-controls">
              <button
                className="control-btn camera-btn focus-ring"
                onClick={toggleCamera}
                aria-label={cameraActive ? 'Pause camera' : 'Resume camera'}
              >
                {cameraActive ? (
                  <>
                    <VideoOff size={24} />
                    <span>Pause Camera</span>
                  </>
                ) : (
                  <>
                    <Video size={24} />
                    <span>Resume Camera</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Placeholder for Future Sections */}
        <div className="future-section">
          <p className="text-center text-gray-500 text-sm">
            Additional features will be added here
          </p>
        </div>
      </div>
    </div>
  );
}
