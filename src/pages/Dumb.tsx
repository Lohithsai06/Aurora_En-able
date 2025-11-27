import { useState, useRef, useEffect } from 'react';
import { Volume2, Trash2, Copy, Video, VideoOff } from 'lucide-react';
import Webcam from 'react-webcam';
import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import '../styles/dumb.css';

type Mode = 'gesture' | 'type' | 'symbol';

// Expanded Gesture Mapping - 17 gestures
const gestureMap = {
  // Core Gestures
  THUMBS_UP: "YES",
  FIST: "NO",
  OPEN_PALM: "STOP",
  OK_SIGN: "DONE",
  POINT_RIGHT: "NEXT",
  POINT_LEFT: "BACK",
  TWO_FINGERS: "WAIT",
  CALL_ME: "CALL",
  HAND_WAVE: "HELLO",
  DOUBLE_PALM: "EMERGENCY",
  // Needs Gestures
  BOTH_HANDS_OPEN: "HELP",
  PALM_TAP: "WATER",
  FIST_SHAKE: "PAIN",
  ONE_FINGER_UP: "ATTENTION",
  DOWN_PALM: "SLOW",
  // Optional Gestures
  HAND_OVER_CHEST: "THANK YOU",
  DOUBLE_FIST: "ANGRY"
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
  const [fastMode, setFastMode] = useState<boolean>(true); // Fast gesture mode enabled by default
  const [isCalibrating, setIsCalibrating] = useState<boolean>(true);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [trackingStatus, setTrackingStatus] = useState<string>('INITIALIZING');
  
  // Chapter 7 - New State Variables
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
  const [emergencyMode, setEmergencyMode] = useState<boolean>(false);
  const [caregiverMode, setCaregiverMode] = useState<boolean>(false);
  const [urgencyDetected, setUrgencyDetected] = useState<boolean>(false);
  const [showUrgencyPrompt, setShowUrgencyPrompt] = useState<boolean>(false);
  const [gestureRepeatCount, setGestureRepeatCount] = useState<{ [key: string]: number }>({});
  
  // Chapter 8 - UI Polish & Performance State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dumb-dark-mode');
    return saved === 'true';
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [browserSupport, setBrowserSupport] = useState({
    camera: true,
    speech: true,
    mediaPipe: true
  });
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gestureBufferRef = useRef<string[]>([]);
  const lastGestureRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const emergencyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const urgencyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const calibrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const calibrationStartRef = useRef<number>(0);
  const previousGestureRef = useRef<string>('');

  // Auto-Calibration System (3 seconds)
  useEffect(() => {
    if (currentMode !== 'gesture' || !cameraActive) return;
    
    setIsCalibrating(true);
    setIsCalibrated(false);
    setTrackingStatus('CALIBRATING');
    calibrationStartRef.current = Date.now();
    
    const calibrationDuration = 2000; // 2 seconds for faster startup
    const updateInterval = 50; // Update progress every 50ms for smoother animation
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - calibrationStartRef.current;
      const progress = Math.min((elapsed / calibrationDuration) * 100, 100);
      setCalibrationProgress(progress);
      
      if (elapsed >= calibrationDuration) {
        clearInterval(progressInterval);
        setIsCalibrating(false);
        setIsCalibrated(true);
        setTrackingStatus('READY');
        setCalibrationProgress(100);
        
        // Show calibrated message
        setTimeout(() => {
          setTrackingStatus('TRACKING');
        }, 1000);
      }
    }, updateInterval);
    
    return () => {
      clearInterval(progressInterval);
    };
  }, [currentMode, cameraActive]);

  // Chapter 8 - Dark Mode Effect
  useEffect(() => {
    localStorage.setItem('dumb-dark-mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Chapter 8 - Browser Support Check
  useEffect(() => {
    const checkSupport = () => {
      const support = {
        camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        speech: 'speechSynthesis' in window,
        mediaPipe: typeof Hands !== 'undefined'
      };
      
      setBrowserSupport(support);
      
      if (!support.speech) {
        console.warn('Speech synthesis not supported');
      }
      if (!support.camera) {
        setCameraError('Camera access not available in this browser');
      }
    };
    
    checkSupport();
  }, []);

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

  // FIXED - Robust Speech synthesis function
  const speakText = (text: string) => {
    if (!text || text === 'Your message will appear here') return;
    if (!voiceEnabled) return;

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
        console.log('Speech started:', text);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('Speech finished');
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

  // FIXED - Auto-speak on output change (removed blocking conditions)
  useEffect(() => {
    if (outputText && 
        outputText !== 'Your message will appear here' && 
        voiceEnabled && 
        !aiLoading) {
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        speakText(outputText);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [outputText, voiceEnabled, aiLoading, speechRate, speechPitch, selectedVoice]);

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
    setSmartSuggestions([]);
    deactivateEmergency();
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
        const errorText = await response.text();
        throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || inputText;
      
      // Clear any previous errors
      setApiError(null);
      
      // Clean and format response
      return aiText.trim().replace(/[""]/g, '"');
    } catch (error) {
      console.error('Gemini API error:', error);
      setApiError('AI service temporarily unavailable. Showing original text.');
      
      // Auto-clear error after 5 seconds
      setTimeout(() => setApiError(null), 5000);
      
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

  // Chapter 7 - Smart Suggestions Function
  const getSmartSuggestions = async (inputText: string): Promise<void> => {
    if (!GEMINI_API_KEY || inputText === 'Your message will appear here') return;

    setSuggestionsLoading(true);
    try {
      const prompt = `Provide 3 alternative ways to express this message in different tones:
1. Polite/Friendly tone
2. Urgent tone  
3. Neutral/Professional tone

Original message: "${inputText}"

Return ONLY the 3 alternative sentences, one per line, no numbering, no labels, no extra text.`;

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
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.match(/^\d+[\.)]/))
          .slice(0, 3);
        
        setSmartSuggestions(suggestions.length === 3 ? suggestions : []);
      }
    } catch (error) {
      console.error('Smart suggestions error:', error);
      setSmartSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Chapter 7 - Handle Suggestion Click
  const handleSuggestionClick = async (suggestion: string) => {
    setOutputText(suggestion);
    
    // Add to history
    setHistory(prev => {
      const newHistory = [`💡 ${suggestion}`, ...prev];
      return newHistory.slice(0, 10);
    });

    // Speak immediately
    if (voiceEnabled) {
      speakText(suggestion);
    }
  };

  // Chapter 7 - Emergency Mode Functions
  const activateEmergency = () => {
    setEmergencyMode(true);
    setOutputText("I NEED IMMEDIATE HELP");
    setShowUrgencyPrompt(false);
    
    // Add to history
    setHistory(prev => {
      const newHistory = ['🚨 EMERGENCY: I NEED IMMEDIATE HELP', ...prev];
      return newHistory.slice(0, 10);
    });

    // Play repeating emergency message
    if (emergencyIntervalRef.current) {
      clearInterval(emergencyIntervalRef.current);
    }

    const playEmergencyMessage = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("EMERGENCY! I NEED IMMEDIATE HELP!");
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    // Play immediately
    playEmergencyMessage();
    
    // Repeat every 3 seconds
    emergencyIntervalRef.current = setInterval(playEmergencyMessage, 3000);

    // Auto-deactivate after 15 seconds
    setTimeout(() => {
      deactivateEmergency();
    }, 15000);
  };

  const deactivateEmergency = () => {
    setEmergencyMode(false);
    if (emergencyIntervalRef.current) {
      clearInterval(emergencyIntervalRef.current);
      emergencyIntervalRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Chapter 7 - Urgency Detection
  const checkUrgency = (gesture: string) => {
    const currentCount = gestureRepeatCount[gesture] || 0;
    const newCount = currentCount + 1;

    setGestureRepeatCount(prev => ({
      ...prev,
      [gesture]: newCount
    }));

    // If HELP gesture repeated 3 times quickly
    if (gesture === 'HELP' && newCount >= 3) {
      setUrgencyDetected(true);
      setShowUrgencyPrompt(true);

      // Reset prompt after 10 seconds
      setTimeout(() => {
        setShowUrgencyPrompt(false);
        setUrgencyDetected(false);
      }, 10000);
    }

    // Reset count after 5 seconds of no activity
    if (urgencyTimerRef.current) {
      clearTimeout(urgencyTimerRef.current);
    }

    urgencyTimerRef.current = setTimeout(() => {
      setGestureRepeatCount({});
    }, 5000);
  };

  // Chapter 7 - History Replay
  const replayHistoryItem = (item: string) => {
    // Remove emoji prefix if exists
    const cleanText = item.replace(/^[🚨💡]\s*/, '');
    setOutputText(cleanText);
    
    if (voiceEnabled) {
      speakText(cleanText);
    }
  };

  // Chapter 7 - Clear History
  const clearHistory = () => {
    setHistory([]);
  };

  // Chapter 7 - Toggle Caregiver Mode
  const toggleCaregiverMode = () => {
    setCaregiverMode(!caregiverMode);
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

  // Gesture Detection: Two Fingers (Peace sign)
  const isTwoFingers = (landmarks: NormalizedLandmark[]): boolean => {
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleExtended = isFingerExtended(landmarks, 12, 10);
    const ringCurled = landmarks[16].y > landmarks[14].y;
    const pinkyCurled = landmarks[20].y > landmarks[18].y;
    const thumbCurled = landmarks[4].x > landmarks[2].x;
    
    return indexExtended && middleExtended && ringCurled && pinkyCurled && thumbCurled;
  };

  // Gesture Detection: Call Me (pinky and thumb extended)
  const isCallGesture = (landmarks: NormalizedLandmark[]): boolean => {
    const thumbExtended = landmarks[4].y < landmarks[3].y;
    const pinkyExtended = isFingerExtended(landmarks, 20, 18);
    const indexCurled = landmarks[8].y > landmarks[6].y;
    const middleCurled = landmarks[12].y > landmarks[10].y;
    const ringCurled = landmarks[16].y > landmarks[14].y;
    
    return thumbExtended && pinkyExtended && indexCurled && middleCurled && ringCurled;
  };

  // Gesture Detection: One Finger Up (Attention)
  const isOneFingerUp = (landmarks: NormalizedLandmark[]): boolean => {
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleCurled = landmarks[12].y > landmarks[10].y;
    const ringCurled = landmarks[16].y > landmarks[14].y;
    const pinkyCurled = landmarks[20].y > landmarks[18].y;
    const thumbCurled = landmarks[4].x > landmarks[2].x;
    
    // Hand should be upright (wrist below index)
    const upright = landmarks[0].y > landmarks[8].y;
    
    return indexExtended && middleCurled && ringCurled && pinkyCurled && thumbCurled && upright;
  };

  // Gesture Detection: Palm Down (SLOW)
  const isPalmDown = (landmarks: NormalizedLandmark[]): boolean => {
    const allExtended = isFingerExtended(landmarks, 8, 6) && 
                       isFingerExtended(landmarks, 12, 10) && 
                       isFingerExtended(landmarks, 16, 14) && 
                       isFingerExtended(landmarks, 20, 18);
    
    // Palm facing down - wrist above fingertips
    const palmDown = landmarks[0].y < landmarks[8].y;
    
    return allExtended && palmDown;
  };

  // Gesture Detection: Point Left
  const isPointLeft = (landmarks: NormalizedLandmark[]): boolean => {
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleCurled = landmarks[12].y > landmarks[10].y;
    const pointingLeft = landmarks[8].x < landmarks[5].x - 0.1;
    
    return indexExtended && middleCurled && pointingLeft;
  };

  // Gesture Detection: Point Right
  const isPointRight = (landmarks: NormalizedLandmark[]): boolean => {
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleCurled = landmarks[12].y > landmarks[10].y;
    const pointingRight = landmarks[8].x > landmarks[5].x + 0.1;
    
    return indexExtended && middleCurled && pointingRight;
  };

  // Gesture Detection: Open Palm (renamed from isPalm)
  const isOpenPalm = (landmarks: NormalizedLandmark[]): boolean => {
    // All fingers extended, palm facing camera
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleExtended = isFingerExtended(landmarks, 12, 10);
    const ringExtended = isFingerExtended(landmarks, 16, 14);
    const pinkyExtended = isFingerExtended(landmarks, 20, 18);
    const palmFacing = landmarks[0].y > landmarks[9].y - 0.1;
    
    return indexExtended && middleExtended && ringExtended && pinkyExtended && palmFacing;
  };

  // Gesture Detection: Hand Over Chest (Thank You)
  const isHandOverChest = (landmarks: NormalizedLandmark[]): boolean => {
    const allExtended = isFingerExtended(landmarks, 8, 6) && 
                       isFingerExtended(landmarks, 12, 10);
    const centerPosition = landmarks[0].x > 0.3 && landmarks[0].x < 0.7;
    const chestHeight = landmarks[0].y > 0.4 && landmarks[0].y < 0.6;
    
    return allExtended && centerPosition && chestHeight;
  };

  // Enhanced Core Gesture Detection Function with All 17 Gestures
  const detectGesture = (landmarks: NormalizedLandmark[]): string | null => {
    if (!landmarks || landmarks.length !== 21) return null;
    
    // Skip detection during calibration
    if (isCalibrating) return null;
    
    // Priority order: Emergency > Needs > Core > Optional
    if (isThumbUp(landmarks)) return gestureMap.THUMBS_UP;
    if (isFist(landmarks)) return gestureMap.FIST;
    if (isOpenPalm(landmarks)) return gestureMap.OPEN_PALM;
    if (isOkSign(landmarks)) return gestureMap.OK_SIGN;
    if (isPointRight(landmarks)) return gestureMap.POINT_RIGHT;
    if (isPointLeft(landmarks)) return gestureMap.POINT_LEFT;
    if (isTwoFingers(landmarks)) return gestureMap.TWO_FINGERS;
    if (isCallGesture(landmarks)) return gestureMap.CALL_ME;
    if (isOneFingerUp(landmarks)) return gestureMap.ONE_FINGER_UP;
    if (isPalmDown(landmarks)) return gestureMap.DOWN_PALM;
    if (isHandOverChest(landmarks)) return gestureMap.HAND_OVER_CHEST;
    
    return null;
  };

  // Instant output with minimal stability check (3 frames, 2/3 consensus)
  const updateGestureOutput = async (gesture: string) => {
    // Add to buffer
    gestureBufferRef.current.push(gesture);
    
    // Keep only last 3 frames for fastest detection
    if (gestureBufferRef.current.length > 3) {
      gestureBufferRef.current.shift();
    }
    
    // Check if gesture is stable (appears in at least 2 out of 3 frames)
    if (gestureBufferRef.current.length >= 3) {
      const gestureCount = gestureBufferRef.current.filter(g => g === gesture).length;
      
      if (gestureCount >= 2 && gesture !== lastGestureRef.current) {
        // Update tracking status
        setTrackingStatus('TRACKING');
        
        // Clear any pending debounce
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        // NO DEBOUNCE - Instant response
        (async () => {
          setDetectedGesture(gesture);
          setGestureConfirmed(true);
          lastGestureRef.current = gesture;
          
          // Update context history (limit to 3)
          setContextHistory(prev => {
            const newContext = [gesture, ...prev].slice(0, 3);
            return newContext;
          });
          
          // Chapter 7 - Check for urgency
          checkUrgency(gesture);

          // AI Mode Processing
          if (aiMode) {
            setAiLoading(true);
            const aiResponse = await getGeminiResponse(gesture);
            setOutputText(aiResponse);
            setAiLoading(false);
            
            // Get suggestions
            await getAiSuggestions(gesture);
            
            // Chapter 7 - Get smart suggestions
            await getSmartSuggestions(aiResponse);
          } else {
            // Basic Mode - show raw gesture
            setOutputText(gesture);
            setAiSuggestions([]);
            
            // Chapter 7 - Get smart suggestions for raw gesture
            await getSmartSuggestions(gesture);
          }
          
          // Add to history (limit to 10)
          setHistory(prev => {
            const newHistory = [gesture, ...prev];
            return newHistory.slice(0, 10);
          });
          
          // Reset confirmation animation after 500ms
          setTimeout(() => setGestureConfirmed(false), 500);
        })();
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
      modelComplexity: 0, // Fastest model for real-time performance
      minDetectionConfidence: 0.5, // Lower threshold for faster detection
      minTrackingConfidence: 0.5, // Lower threshold for smoother tracking
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

  // Real-Time Frame Processing - Process Every Frame for Instant Response
  useEffect(() => {
    if (currentMode !== 'gesture' || !cameraActive) return;

    const processFrame = async () => {
      // Process every single frame with no throttling for instant detection
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4 &&
        handsRef.current
      ) {
        const video = webcamRef.current.video;
        await handsRef.current.send({ image: video });
      }
      
      if (cameraActive && currentMode === 'gesture') {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, currentMode]);

  // Draw hand landmarks on canvas
  const onHandsResults = (results: Results) => {
    // No throttling - process every single result immediately for real-time response
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
      className={`dumb-page ${emergencyMode ? 'emergency-active' : ''} ${caregiverMode ? 'caregiver-mode' : ''} ${darkMode ? 'dark-mode' : ''}`}
      role="main" 
      aria-label="Dumb communication page"
      tabIndex={0}
    >
      <div className="dumb-container fade-in glass-card">
        {/* Chapter 8 - Dark Mode Toggle */}
        <div className="dark-mode-toggle-container">
          <button
            className={`dark-mode-toggle focus-ring ${darkMode ? 'active' : ''}`}
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
          >
            <span className="mode-icon">{darkMode ? '🌞' : '🌙'}</span>
            <span className="mode-text">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Chapter 8 - Error Messages */}
        {(cameraError || apiError) && (
          <div className="error-banner" role="alert" aria-live="polite">
            {cameraError && (
              <div className="error-item camera-error">
                <span className="error-icon">📷</span>
                <span className="error-text">{cameraError}</span>
              </div>
            )}
            {apiError && (
              <div className="error-item api-error">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{apiError}</span>
              </div>
            )}
          </div>
        )}

        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className="section-title text-3xl font-bold text-gray-800 mb-2">
            Smart Communication Board
          </h1>
          <p className="section-subtitle text-lg text-gray-600">
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

        {/* Fast Mode Toggle */}
        {currentMode === 'gesture' && (
          <div className="ai-mode-toggle-container">
            <label className="ai-toggle-label">
              <span className="toggle-text">Normal Speed</span>
              <button
                className={`ai-toggle-switch ${fastMode ? 'active' : ''}`}
                onClick={() => setFastMode(!fastMode)}
                role="switch"
                aria-checked={fastMode}
                aria-label="Toggle fast gesture mode"
              >
                <span className="toggle-slider"></span>
              </button>
              <span className="toggle-text ai-text">
                ⚡ Fast Mode
              </span>
            </label>
          </div>
        )}

        {/* Webcam Section - MOVED TO TOP */}
        {currentMode === 'gesture' && (
          <section 
            className="gesture-top-section"
            role="region"
            aria-label="Gesture camera"
          >
            <div className="gesture-layout">
              {/* LEFT - Webcam Feed */}
              <div className="webcam-container-left">
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
                    {/* Fast Mode Indicator Overlay */}
                    {fastMode && (
                      <div className="fast-mode-indicator" aria-live="polite">
                        <span className="fast-icon">⚡</span>
                        <span className="fast-text">FAST MODE</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="webcam-placeholder">
                    <VideoOff size={64} className="text-gray-400" />
                    <p className="text-gray-500 mt-4 text-xl font-semibold">Camera Paused</p>
                  </div>
                )}

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
              </div>

              {/* RIGHT - Enhanced Live Gesture Display Panel */}
              <div className="gesture-display-panel glass-card soft-shadow">
                <h3 className="gesture-panel-title">DETECTED GESTURE</h3>
                
                {/* Calibration Progress */}
                {isCalibrating && (
                  <div className="calibration-overlay">
                    <div className="calibration-spinner">🎯</div>
                    <div className="calibration-text">Calibrating...</div>
                    <div className="calibration-progress-bar">
                      <div 
                        className="calibration-progress-fill" 
                        style={{width: `${calibrationProgress}%`}}
                      ></div>
                    </div>
                    <div className="calibration-instruction">Hold hand in neutral position</div>
                  </div>
                )}
                
                {/* Calibrated Indicator */}
                {isCalibrated && trackingStatus === 'READY' && !detectedGesture && (
                  <div className="calibrated-badge">
                    <span className="calibrated-icon">✓</span>
                    <span className="calibrated-text">System Calibrated</span>
                  </div>
                )}
                
                {!isCalibrating && detectedGesture ? (
                  <div className={`gesture-text pop-effect ${
                    detectedGesture === 'YES' ? 'gesture-yes' : 
                    detectedGesture === 'NO' ? 'gesture-no' : 
                    detectedGesture === 'HELP' || detectedGesture === 'EMERGENCY' ? 'gesture-help' : 
                    detectedGesture === 'ATTENTION' || detectedGesture === 'PAIN' ? 'gesture-warning' :
                    detectedGesture === 'WATER' || detectedGesture === 'CALL' ? 'gesture-need' :
                    'gesture-default'
                  }`}>
                    {detectedGesture}
                  </div>
                ) : !isCalibrating && (
                  <div className="gesture-waiting">
                    <span className="waiting-icon">👋</span>
                    <p className="waiting-text">Show a hand gesture...</p>
                  </div>
                )}

                <div className="gesture-status">
                  <div className="status-row">
                    <span className="status-dot" style={{
                      background: isCalibrating ? '#f59e0b' : detectedGesture ? '#10b981' : '#9ca3af'
                    }}></span>
                    <span className="status-text">Status: {trackingStatus}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-dot" style={{background: voiceEnabled ? '#10b981' : '#9ca3af'}}></span>
                    <span className="status-text">Voice: {voiceEnabled ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-dot" style={{background: fastMode ? '#f59e0b' : '#9ca3af'}}></span>
                    <span className="status-text">Mode: {fastMode ? '⚡ ULTRA FAST' : 'Normal'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Output Display Panel */}
        <div 
          className={`output-panel glass-card soft-shadow pulse-border ${gestureConfirmed ? 'gesture-detected' : ''} ${aiLoading ? 'ai-loading' : ''} ${isSpeaking ? 'speaking' : ''}`}
          role="region"
          aria-label="Communication output display"
        >
          <div 
            className="output-text"
            aria-live="polite"
            aria-atomic="true"
            role="status"
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

        {/* Chapter 7 - Smart Suggestions Panel */}
        {smartSuggestions.length > 0 && !suggestionsLoading && (
          <div className="smart-suggestions-panel">
            <h3 className="suggestions-title">💡 Smart Suggestions</h3>
            <div className="smart-suggestions-list">
              {smartSuggestions.map((suggestion, index) => (
                <button 
                  key={index} 
                  className="smart-suggestion-pill focus-ring"
                  onClick={() => handleSuggestionClick(suggestion)}
                  aria-label={`Suggestion ${index + 1}: ${suggestion}`}
                >
                  <span className="pill-icon">
                    {index === 0 ? '😊' : index === 1 ? '🚨' : '💼'}
                  </span>
                  <span className="pill-text">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chapter 8 - Enhanced Status Bar */}
        <div className="status-bar glass-card soft-shadow">
          <div className="status-item hover-rise" title="Camera status">
            <span className={`status-indicator ${cameraActive ? 'active' : 'inactive'}`}></span>
            <span className="status-label">
              {cameraActive ? '✅ Camera Active' : '⏸️ Camera Paused'}
            </span>
          </div>
          
          <div className="status-item hover-rise" title="AI processing status">
            <span className={`status-indicator ${aiMode ? 'active' : 'inactive'}`}></span>
            <span className="status-label">
              {aiMode ? '🤖 AI Enabled' : '🔧 Basic Mode'}
            </span>
          </div>
          
          <div className="status-item hover-rise" title="Voice output status">
            <span className={`status-indicator ${voiceEnabled ? 'active' : 'inactive'}`}></span>
            <span className="status-label">
              {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
            </span>
          </div>
          
          {emergencyMode && (
            <div className="status-item emergency-item pulse-effect" title="Emergency mode active">
              <span className="status-indicator active emergency"></span>
              <span className="status-label">🚨 EMERGENCY</span>
            </div>
          )}
        </div>

        {/* Chapter 7 - Status Indicators (Legacy - keeping for compatibility) */}
        <div className="status-indicators">
          {emergencyMode && (
            <div className="status-badge emergency-badge" aria-live="assertive">
              🔴 EMERGENCY ACTIVE
            </div>
          )}
          {aiMode && (
            <div className="status-badge ai-badge">
              🤖 AI Mode Active
            </div>
          )}
          {isSpeaking && (
            <div className="status-badge voice-badge">
              🔈 Voice Playing
            </div>
          )}
          {history.length > 0 && (
            <div className="status-badge history-badge">
              📜 History: {history.length}/10
            </div>
          )}
        </div>

        {/* Chapter 7 - Urgency Detection Prompt */}
        {showUrgencyPrompt && !emergencyMode && (
          <div className="urgency-prompt-overlay" aria-live="assertive">
            <div className="urgency-prompt-card">
              <h3 className="urgency-title">⚠️ Urgency Detected</h3>
              <p className="urgency-message">Multiple HELP gestures detected. Do you need emergency assistance?</p>
              <div className="urgency-actions">
                <button 
                  className="urgency-btn activate-btn focus-ring"
                  onClick={activateEmergency}
                  aria-label="Activate emergency mode"
                >
                  🚨 Yes - Activate Emergency
                </button>
                <button 
                  className="urgency-btn dismiss-btn focus-ring"
                  onClick={() => setShowUrgencyPrompt(false)}
                  aria-label="Dismiss urgency prompt"
                >
                  ✖ No - Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chapter 7 - Emergency Mode Overlay */}
        {emergencyMode && (
          <div className="emergency-overlay" aria-live="assertive" role="alert">
            <div className="emergency-content">
              <div className="emergency-icon">🚨</div>
              <h2 className="emergency-text">I NEED IMMEDIATE HELP</h2>
              <button 
                className="emergency-dismiss-btn focus-ring"
                onClick={deactivateEmergency}
                aria-label="Deactivate emergency mode"
              >
                ✖ Deactivate
              </button>
            </div>
          </div>
        )}

        {/* Chapter 7 - Caregiver Mode Toggle & Emergency Button */}
        <div className="chapter7-controls">
          <button
            className={`caregiver-toggle focus-ring ${caregiverMode ? 'active' : ''}`}
            onClick={toggleCaregiverMode}
            aria-pressed={caregiverMode}
            aria-label="Toggle caregiver display mode"
          >
            <span className="toggle-icon">{caregiverMode ? '👁️' : '👁️‍🗨️'}</span>
            <span>Caregiver Mode</span>
          </button>

          <button
            className="emergency-button focus-ring"
            onClick={activateEmergency}
            aria-label="Activate emergency mode"
            disabled={emergencyMode}
          >
            <span className="emergency-icon">🚨</span>
            <span>EMERGENCY</span>
          </button>
        </div>

        {/* Chapter 7 - Communication History Panel */}
        {history.length > 0 && (
          <div className="history-panel">
            <div className="history-header">
              <h3 className="history-title">📜 Communication History</h3>
              <button 
                className="clear-history-btn focus-ring"
                onClick={clearHistory}
                aria-label="Clear communication history"
              >
                <Trash2 size={16} />
                <span>Clear History</span>
              </button>
            </div>
            <div className="history-scroll">
              {history.map((item, index) => (
                <div 
                  key={index}
                  className="history-item focus-ring"
                  onClick={() => replayHistoryItem(item)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      replayHistoryItem(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Replay message: ${item}`}
                >
                  <span className="history-number">{index + 1}</span>
                  <span className="history-text">{item}</span>
                  <Volume2 size={16} className="replay-icon" />
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
                <button
                  className="control-btn-small test-btn focus-ring"
                  onClick={() => speakText('Voice system active and working correctly')}
                  aria-label="Test voice"
                >
                  <span>🎤 Test</span>
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

        {/* Webcam section moved to top of page - see gesture-top-section above */}

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
