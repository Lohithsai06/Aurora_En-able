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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function Dumb() {
  const [currentMode, setCurrentMode] = useState<Mode>('gesture');
  const [outputText, setOutputText] = useState<string>('Your message will appear here');
  const [history, setHistory] = useState<string[]>([]);
  const [aiMode, setAiMode] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
  const [gestureConfirmed, setGestureConfirmed] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [contextHistory, setContextHistory] = useState<string[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [speechPitch, setSpeechPitch] = useState<number>(1);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [sentenceBuilder, setSentenceBuilder] = useState<string[]>([]);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gestureBufferRef = useRef<string[]>([]);
  const lastGestureRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Set default voice (prefer English)
      if (voices.length > 0 && !selectedVoice) {
        const englishVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        setSelectedVoice(englishVoice);
      }
    };

    loadVoices();
    
    // Chrome needs this event listener
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Auto-speak on output change
  useEffect(() => {
    if (outputText && 
        outputText !== 'Your message will appear here' && 
        voiceEnabled && 
        !aiLoading &&
        detectedGesture) {
      speakText(outputText);
    }
  }, [outputText, voiceEnabled, aiLoading]);

  // Speech synthesis function
  const speakText = (text: string) => {
    if (!text || text === 'Your message will appear here') return;

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.volume = 1;
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      setIsSpeaking(false);
    }
  };

  const handleSpeak = () => {
    if (!outputText || outputText === 'Your message will appear here') return;
    speakText(outputText);
  };

  const handleStopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled === false) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleClear = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setOutputText('Your message will appear here');
    setDetectedGesture(null);
    setAiSuggestions([]);
    setActivePhrase(null);
    setSentenceBuilder([]);
  };

  // Handle Quick Phrase Click
  const handlePhraseClick = async (phrase: string) => {
    setActivePhrase(phrase);
    
    // Add to history
    setHistory(prev => {
      const newHistory = [phrase, ...prev];
      return newHistory.slice(0, 10);
    });

    // Process with AI if enabled
    if (aiMode) {
      setAiLoading(true);
      const aiResponse = await getGeminiResponse(phrase);
      setOutputText(aiResponse);
      setAiLoading(false);
      
      // Get suggestions
      await getAiSuggestions(phrase);
    } else {
      setOutputText(phrase);
    }

    // Visual feedback
    setTimeout(() => setActivePhrase(null), 1000);
  };

  // Handle Symbol Click
  const handleSymbolClick = async (symbol: string, text: string) => {
    const fullText = `${symbol} ${text}`;
    setActivePhrase(fullText);
    
    // Add to history
    setHistory(prev => {
      const newHistory = [text, ...prev];
      return newHistory.slice(0, 10);
    });

    // Process with AI if enabled
    if (aiMode) {
      setAiLoading(true);
      const aiResponse = await getGeminiResponse(text);
      setOutputText(aiResponse);
      setAiLoading(false);
    } else {
      setOutputText(fullText);
    }

    // Visual feedback
    setTimeout(() => setActivePhrase(null), 1000);
  };

  // Sentence Builder Functions
  const addWordToSentence = (word: string) => {
    setSentenceBuilder(prev => [...prev, word]);
  };

  const clearSentence = () => {
    setSentenceBuilder([]);
  };

  const speakBuiltSentence = async () => {
    if (sentenceBuilder.length === 0) return;
    
    const sentence = sentenceBuilder.join(' ');
    
    // Add to history
    setHistory(prev => {
      const newHistory = [sentence, ...prev];
      return newHistory.slice(0, 10);
    });

    // Process with AI if enabled
    if (aiMode) {
      setAiLoading(true);
      const aiResponse = await getGeminiResponse(sentence);
      setOutputText(aiResponse);
      setAiLoading(false);
      
      await getAiSuggestions(sentence);
    } else {
      setOutputText(sentence);
    }

    // Clear builder after speaking
    setSentenceBuilder([]);
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

  const toggleAiMode = () => {
    setAiMode(!aiMode);
  };

  // Gemini AI Request Function
  const getGeminiResponse = async (inputText: string): Promise<string> => {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not found');
      return inputText;
    }

    try {
      const contextPrompt = contextHistory.length > 0
        ? `Previous context: ${contextHistory.join(', ')}. `
        : '';

      const prompt = `${contextPrompt}Convert this into a polite, natural sentence for a speech-impaired user: "${inputText}". Rules: Start with capital letter, end with period, max 2 sentences, no emojis, polite tone.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error('Gemini API request failed');
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || inputText;
      
      // Clean and format response
      return aiText.trim().replace(/[""]/g, '"');
    } catch (error) {
      console.error('Gemini API error:', error);
      return inputText; // Fallback to basic text
    }
  };

  // Get AI Suggestions
  const getAiSuggestions = async (inputText: string): Promise<void> => {
    if (!GEMINI_API_KEY || !aiMode) return;

    try {
      const prompt = `Provide 3 alternative ways to say "${inputText}" with different tones:
1. Friendly tone
2. Urgent tone
3. Neutral tone

Format: Return only the 3 sentences separated by newlines, no numbering or labels.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const suggestions = aiText
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 3);
        
        setAiSuggestions(suggestions);
      }
    } catch (error) {
      console.error('AI Suggestions error:', error);
    }
  };

  // Regenerate AI Sentence
  const regenerateAiSentence = async () => {
    if (!detectedGesture || !aiMode) return;
    
    setAiLoading(true);
    const aiResponse = await getGeminiResponse(detectedGesture);
    setOutputText(aiResponse);
    setAiLoading(false);
    
    // Get new suggestions
    await getAiSuggestions(detectedGesture);
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
  const updateGestureOutput = async (gesture: string) => {
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
        debounceTimerRef.current = setTimeout(async () => {
          setDetectedGesture(gesture);
          setGestureConfirmed(true);
          lastGestureRef.current = gesture;
          
          // Update context history (limit to 3)
          setContextHistory(prev => {
            const newContext = [gesture, ...prev].slice(0, 3);
            return newContext;
          });
          
          // AI Mode Processing
          if (aiMode) {
            setAiLoading(true);
            const aiResponse = await getGeminiResponse(gesture);
            setOutputText(aiResponse);
            setAiLoading(false);
            
            // Get suggestions
            await getAiSuggestions(gesture);
          } else {
            // Basic Mode - show raw gesture
            setOutputText(gesture);
            setAiSuggestions([]);
          }
          
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

        {/* AI Mode Toggle */}
        <div className="ai-mode-toggle-container">
          <label className="ai-toggle-label">
            <span className="toggle-text">Basic Mode</span>
            <button
              className={`ai-toggle-switch ${aiMode ? 'active' : ''}`}
              onClick={toggleAiMode}
              role="switch"
              aria-checked={aiMode}
              aria-label="Toggle AI mode"
            >
              <span className="toggle-slider"></span>
            </button>
            <span className="toggle-text ai-text">
              AI Mode 🤖
            </span>
          </label>
        </div>

        {/* Output Display Panel */}
        <div className={`output-panel ${gestureConfirmed ? 'gesture-detected' : ''} ${aiLoading ? 'ai-loading' : ''} ${isSpeaking ? 'speaking' : ''}`}>
          <div 
            className="output-text"
            aria-live="polite"
            aria-atomic="true"
          >
            {aiLoading ? (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <span>Thinking...</span>
              </div>
            ) : (
              <>
                {outputText}
                {isSpeaking && (
                  <div className="speaking-animation">
                    <span className="pulse-icon">🔊</span>
                    <span className="speaking-text">Speaking...</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {detectedGesture && !aiLoading && (
            <div className="gesture-label">
              Gesture Detected: {detectedGesture}
            </div>
          )}
          
          <div className="output-controls">
            <button 
              className="control-btn speak-btn focus-ring"
              onClick={handleSpeak}
              aria-label="Speak message"
              disabled={aiLoading}
            >
              <Volume2 size={24} />
              <span>Speak</span>
            </button>
            
            <button 
              className="control-btn clear-btn focus-ring"
              onClick={handleClear}
              aria-label="Clear message"
              disabled={aiLoading}
            >
              <Trash2 size={24} />
              <span>Clear</span>
            </button>
            
            <button 
              className="control-btn copy-btn focus-ring"
              onClick={handleCopy}
              aria-label="Copy message"
              disabled={aiLoading}
            >
              <Copy size={24} />
              <span>Copy</span>
            </button>

            {aiMode && detectedGesture && !aiLoading && (
              <button 
                className="control-btn regenerate-btn focus-ring"
                onClick={regenerateAiSentence}
                aria-label="Regenerate AI sentence"
              >
                <span className="regenerate-icon">🔁</span>
                <span>Regenerate</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Suggestions Panel */}
        {aiMode && aiSuggestions.length > 0 && !aiLoading && (
          <div className="ai-suggestions-panel">
            <h3 className="suggestions-title">AI Suggestions</h3>
            <div className="suggestions-list">
              {aiSuggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className="suggestion-item"
                  onClick={() => setOutputText(suggestion)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setOutputText(suggestion);
                    }
                  }}
                >
                  <span className="suggestion-label">
                    {index === 0 ? '😊 Friendly' : index === 1 ? '⚡ Urgent' : '📝 Neutral'}
                  </span>
                  <p className="suggestion-text">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Type Mode - Quick Phrases & Sentence Builder */}
        {currentMode === 'type' && (
          <div className="type-mode-section">
            {/* Quick Phrase Communication Board */}
            <section className="quick-phrases-section" aria-label="Quick communication phrases">
              <h3 className="section-heading">Quick Communication Phrases</h3>
              <div className="phrase-grid">
                {[
                  "Hello",
                  "I need help",
                  "Please wait",
                  "I am in pain",
                  "Thank you",
                  "Call my family",
                  "I am hungry",
                  "I need water"
                ].map((phrase, index) => (
                  <button
                    key={index}
                    className={`phrase-button focus-ring ${activePhrase === phrase ? 'active-phrase' : ''}`}
                    onClick={() => handlePhraseClick(phrase)}
                    aria-label={`Say: ${phrase}`}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </section>

            {/* Sentence Builder Mode */}
            <section className="sentence-builder-section" aria-label="Sentence builder">
              <h3 className="section-heading">Sentence Builder</h3>
              
              <div className="builder-display">
                <div className="built-sentence">
                  {sentenceBuilder.length > 0 ? sentenceBuilder.join(' ') : 'Click words to build a sentence'}
                </div>
              </div>

              <div className="builder-words">
                {['I', 'Need', 'Want', 'Help', 'Water', 'Food', 'Please', 'Now', 'Later', 'Yes', 'No'].map((word, index) => (
                  <button
                    key={index}
                    className="word-button focus-ring"
                    onClick={() => addWordToSentence(word)}
                    aria-label={`Add word: ${word}`}
                  >
                    {word}
                  </button>
                ))}
              </div>

              <div className="builder-controls">
                <button
                  className="control-btn speak-sentence-btn focus-ring"
                  onClick={speakBuiltSentence}
                  disabled={sentenceBuilder.length === 0}
                  aria-label="Speak built sentence"
                >
                  <span>▶ Speak Sentence</span>
                </button>
                <button
                  className="control-btn clear-sentence-btn focus-ring"
                  onClick={clearSentence}
                  disabled={sentenceBuilder.length === 0}
                  aria-label="Clear sentence"
                >
                  <span>🗑 Clear</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Symbol Mode - Icon Communication */}
        {currentMode === 'symbol' && (
          <section className="symbol-mode-section" aria-label="Symbol communication board">
            <h3 className="section-heading">Symbol Communication Board</h3>
            <div className="symbol-grid">
              {[
                { emoji: '🍔', text: 'Food' },
                { emoji: '💧', text: 'Water' },
                { emoji: '🚻', text: 'Toilet' },
                { emoji: '🛏', text: 'Rest' },
                { emoji: '🚨', text: 'Emergency' },
                { emoji: '🏠', text: 'Home' },
                { emoji: '🤕', text: 'Pain' },
                { emoji: '📞', text: 'Call' },
                { emoji: '👨‍⚕️', text: 'Doctor' },
                { emoji: '💊', text: 'Medicine' },
                { emoji: '🌡️', text: 'Temperature' },
                { emoji: '😊', text: 'Happy' },
                { emoji: '😢', text: 'Sad' },
                { emoji: '😴', text: 'Tired' },
                { emoji: '❤️', text: 'Love' },
                { emoji: '👍', text: 'Yes' }
              ].map((item, index) => (
                <button
                  key={index}
                  className={`symbol-tile focus-ring ${activePhrase === `${item.emoji} ${item.text}` ? 'active-phrase' : ''}`}
                  onClick={() => handleSymbolClick(item.emoji, item.text)}
                  aria-label={item.text}
                  title={item.text}
                >
                  <span className="symbol-emoji">{item.emoji}</span>
                  <span className="symbol-text">{item.text}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Voice Controls Panel */}
        <section className="voice-controls-panel" aria-label="Voice controls">
          <h3 className="voice-controls-title">
            {isSpeaking && <span className="speaking-indicator">🔊 </span>}
            Voice Controls
          </h3>

          <div className="voice-controls-grid">
            {/* Mute Toggle */}
            <div className="control-group">
              <label className="control-label">Voice Output</label>
              <button
                className={`voice-toggle-btn ${voiceEnabled ? 'enabled' : 'muted'}`}
                onClick={toggleVoice}
                aria-label={voiceEnabled ? 'Mute voice' : 'Enable voice'}
              >
                <span className="voice-icon">{voiceEnabled ? '🔊' : '🔇'}</span>
                <span>{voiceEnabled ? 'Enabled' : 'Muted'}</span>
              </button>
            </div>

            {/* Replay & Stop Buttons */}
            <div className="control-group">
              <label className="control-label">Playback</label>
              <div className="button-group-inline">
                <button
                  className="control-btn-small replay-btn focus-ring"
                  onClick={handleSpeak}
                  disabled={!outputText || outputText === 'Your message will appear here'}
                  aria-label="Replay voice"
                >
                  <span>🔊 Replay</span>
                </button>
                <button
                  className="control-btn-small stop-btn focus-ring"
                  onClick={handleStopSpeech}
                  disabled={!isSpeaking}
                  aria-label="Stop voice"
                >
                  <span>⏹️ Stop</span>
                </button>
              </div>
            </div>

            {/* Speed Slider */}
            <div className="control-group">
              <label className="control-label" htmlFor="speech-rate">
                Speed: {speechRate.toFixed(1)}x
              </label>
              <input
                id="speech-rate"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="slider focus-ring"
                aria-label="Speech rate"
              />
              <div className="slider-labels">
                <span>0.5x</span>
                <span>2x</span>
              </div>
            </div>

            {/* Pitch Slider */}
            <div className="control-group">
              <label className="control-label" htmlFor="speech-pitch">
                Pitch: {speechPitch.toFixed(1)}
              </label>
              <input
                id="speech-pitch"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="slider focus-ring"
                aria-label="Speech pitch"
              />
              <div className="slider-labels">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="control-group full-width">
              <label className="control-label" htmlFor="voice-select">
                Voice Type
              </label>
              <select
                id="voice-select"
                className="voice-select focus-ring"
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.name === e.target.value);
                  setSelectedVoice(voice || null);
                }}
                aria-label="Select voice type"
              >
                {availableVoices.map((voice, index) => (
                  <option key={index} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Voice Status Message */}
          {!window.speechSynthesis && (
            <div className="voice-error" role="alert">
              ⚠️ Voice output unavailable in this browser
            </div>
          )}
        </section>

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
