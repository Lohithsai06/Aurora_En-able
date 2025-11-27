import { useState, useRef, useEffect } from 'react';
import { Volume2, Trash2, Copy, Video, VideoOff } from 'lucide-react';
import Webcam from 'react-webcam';
import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import '../styles/dumb.css';

type Mode = 'gesture' | 'type' | 'symbol';

// Gesture Mapping
const gestureMap = {
  THUMBS_UP: "YES",
  FIST: "NO",
  PALM: "STOP",
  OK_SIGN: "DONE",
  POINT: "NEXT",
  HELP: "HELP"
} as const;

type GestureType = keyof typeof gestureMap;

export default function Dumb() {
  const [currentMode, setCurrentMode] = useState<Mode>('gesture');
  const [outputText, setOutputText] = useState<string>('Your message will appear here');
  const [history, setHistory] = useState<string[]>([]);
  const [aiMode, setAiMode] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
  const [gestureConfirmed, setGestureConfirmed] = useState<boolean>(false);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gestureBufferRef = useRef<string[]>([]);
  const lastGestureRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Helper: Calculate distance between two landmarks
  const getDistance = (point1: NormalizedLandmark, point2: NormalizedLandmark): number => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Helper: Check if finger is extended
  const isFingerExtended = (landmarks: NormalizedLandmark[], tipIdx: number, pipIdx: number): boolean => {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  };

  // Gesture Detection: Thumbs Up
  const isThumbUp = (landmarks: NormalizedLandmark[]): boolean => {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexMCP = landmarks[5];
    
    // Thumb extended upward and other fingers curled
    const thumbExtended = thumbTip.y < thumbIP.y;
    const indexCurled = landmarks[8].y > landmarks[6].y;
    const middleCurled = landmarks[12].y > landmarks[10].y;
    const ringCurled = landmarks[16].y > landmarks[14].y;
    const pinkyCurled = landmarks[20].y > landmarks[18].y;
    
    return thumbExtended && indexCurled && middleCurled && ringCurled && pinkyCurled;
  };

  // Gesture Detection: Fist
  const isFist = (landmarks: NormalizedLandmark[]): boolean => {
    // All fingers curled
    const indexCurled = landmarks[8].y > landmarks[6].y;
    const middleCurled = landmarks[12].y > landmarks[10].y;
    const ringCurled = landmarks[16].y > landmarks[14].y;
    const pinkyCurled = landmarks[20].y > landmarks[18].y;
    const thumbCurled = landmarks[4].x > landmarks[3].x;
    
    return indexCurled && middleCurled && ringCurled && pinkyCurled && thumbCurled;
  };

  // Gesture Detection: Open Palm
  const isPalm = (landmarks: NormalizedLandmark[]): boolean => {
    // All fingers extended
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleExtended = isFingerExtended(landmarks, 12, 10);
    const ringExtended = isFingerExtended(landmarks, 16, 14);
    const pinkyExtended = isFingerExtended(landmarks, 20, 18);
    
    return indexExtended && middleExtended && ringExtended && pinkyExtended;
  };

  // Gesture Detection: OK Sign
  const isOkSign = (landmarks: NormalizedLandmark[]): boolean => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleExtended = isFingerExtended(landmarks, 12, 10);
    const ringExtended = isFingerExtended(landmarks, 16, 14);
    const pinkyExtended = isFingerExtended(landmarks, 20, 18);
    
    // Thumb and index touching, other fingers extended
    const distance = getDistance(thumbTip, indexTip);
    const touching = distance < 0.05;
    
    return touching && middleExtended && ringExtended && pinkyExtended;
  };

  // Gesture Detection: Pointing
  const isPointing = (landmarks: NormalizedLandmark[]): boolean => {
    // Only index finger extended
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleCurled = landmarks[12].y > landmarks[10].y;
    const ringCurled = landmarks[16].y > landmarks[14].y;
    const pinkyCurled = landmarks[20].y > landmarks[18].y;
    
    return indexExtended && middleCurled && ringCurled && pinkyCurled;
  };

  // Gesture Detection: Help (rapid palm to fist)
  const isHelpGesture = (landmarks: NormalizedLandmark[]): boolean => {
    // This would require tracking state changes over time
    // For now, we'll use a specific hand position as help
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    
    // Hand raised high with all fingers partially curled
    const handRaised = wrist.y < 0.3;
    const partialCurl = landmarks[8].y > landmarks[6].y && landmarks[8].y < landmarks[5].y;
    
    return handRaised && partialCurl;
  };

  // Core Gesture Detection Function
  const detectGesture = (landmarks: NormalizedLandmark[]): string | null => {
    if (!landmarks || landmarks.length !== 21) return null;
    
    if (isThumbUp(landmarks)) return gestureMap.THUMBS_UP;
    if (isOkSign(landmarks)) return gestureMap.OK_SIGN;
    if (isPointing(landmarks)) return gestureMap.POINT;
    if (isFist(landmarks)) return gestureMap.FIST;
    if (isPalm(landmarks)) return gestureMap.PALM;
    if (isHelpGesture(landmarks)) return gestureMap.HELP;
    
    return null;
  };

  // Update output with stability check
  const updateGestureOutput = (gesture: string) => {
    // Add to buffer
    gestureBufferRef.current.push(gesture);
    
    // Keep only last 3 frames
    if (gestureBufferRef.current.length > 3) {
      gestureBufferRef.current.shift();
    }
    
    // Check if gesture is stable (appears in at least 3 frames)
    if (gestureBufferRef.current.length === 3) {
      const allSame = gestureBufferRef.current.every(g => g === gesture);
      
      if (allSame && gesture !== lastGestureRef.current) {
        // Clear any pending debounce
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        // Debounce gesture update
        debounceTimerRef.current = setTimeout(() => {
          setOutputText(gesture);
          setDetectedGesture(gesture);
          setGestureConfirmed(true);
          lastGestureRef.current = gesture;
          
          // Add to history (limit to 5)
          setHistory(prev => {
            const newHistory = [gesture, ...prev];
            return newHistory.slice(0, 5);
          });
          
          // Reset confirmation animation after 500ms
          setTimeout(() => setGestureConfirmed(false), 500);
        }, 300);
      }
    }
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
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
        
        // Detect gesture from landmarks
        const gesture = detectGesture(landmarks);
        if (gesture) {
          updateGestureOutput(gesture);
        } else {
          // Clear buffer if no gesture detected
          gestureBufferRef.current = [];
        }
      }
    } else {
      // No hand detected, clear buffer
      gestureBufferRef.current = [];
      setDetectedGesture(null);
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
        <div className={`output-panel ${gestureConfirmed ? 'gesture-detected' : ''}`}>
          <div 
            className="output-text"
            aria-live="polite"
            aria-atomic="true"
          >
            {outputText}
          </div>
          
          {detectedGesture && (
            <div className="gesture-label">
              Gesture Detected: {detectedGesture}
            </div>
          )}
          
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

            {/* Gesture History */}
            {history.length > 0 && (
              <div className="gesture-history">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Recent Gestures:</h3>
                <div className="history-items">
                  {history.map((item, index) => (
                    <span key={index} className="history-item">
                      {item}
                      {index < history.length - 1 && <span className="history-arrow">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
