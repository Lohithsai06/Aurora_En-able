import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Volume2, Square, RotateCcw, ArrowLeft, FileImage, Loader, Eye, Sparkles, Zap } from 'lucide-react';
import { analyzeImageForBlind } from '../lib/openrouter';
import '../styles/blind-ocr.css';

export default function BlindOCR() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('OCR Reader ready. Press U to upload an image.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const navigate = useNavigate();

  // Speak text using TTS
  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.log('Speech synthesis not available:', error);
    }
  };

  // Stop TTS
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setAnnouncement('Audio stopped.');
  };

  // Replay audio
  const replaySummary = () => {
    if (summary) {
      setAnnouncement('Replaying summary.');
      speak(summary);
    }
  };

  // Process image with OpenRouter AI
  const processImage = async (file: File, imageSrc: string) => {
    setIsProcessing(true);
    setProcessingProgress(10);
    setError(null);
    setAnnouncement('Sending image to DeepSeek AI for analysis. Please wait.');

    try {
      setProcessingProgress(20);
      setAnnouncement('Preparing image...');
      
      // Send to OpenRouter API with DeepSeek R1
      setProcessingProgress(40);
      setAnnouncement('Analyzing image with DeepSeek R1...');
      const result = await analyzeImageForBlind(file);
      
      // Set results
      setProcessingProgress(90);
      setSummary(result);
      setAnnouncement('Analysis complete. Reading summary aloud.');
      
      setProcessingProgress(100);
      
      // Auto-play TTS
      setTimeout(() => speak(result), 500);
      
      setIsProcessing(false);
    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image. Please try again.';
      setError(errorMessage);
      setAnnouncement(errorMessage);
      speak(errorMessage);
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
      setAnnouncement('Invalid file type. Please upload PNG or JPEG image.');
      speak('Invalid file type. Please upload PNG or JPEG image.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setAnnouncement('File too large. Maximum size is 10 megabytes.');
      speak('File too large. Maximum size is 10 megabytes.');
      return;
    }

    setAnnouncement('Image uploaded. Starting analysis.');
    speak('Image uploaded. Starting analysis with DeepSeek AI.');

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setSelectedImage(imageSrc);
      processImage(file, imageSrc);
    };
    reader.readAsDataURL(file);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
        setAnnouncement('Opening file picker. Press U to upload.');
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        replaySummary();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        stopSpeech();
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        stopSpeech();
        navigate('/blind');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [summary, navigate]);

  // Initial announcement
  useEffect(() => {
    setIsVisible(true);
    setTimeout(() => {
      speak('OCR Reader loaded. Press U to upload an image, R to replay audio, S to stop, or B to go back.');
    }, 500);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="ocr-page">
      {/* Animated background */}
      <div className="ocr-bg">
        <div className="ocr-circle ocr-circle-1"></div>
        <div className="ocr-circle ocr-circle-2"></div>
        <div className="ocr-circle ocr-circle-3"></div>
      </div>

      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className={`ocr-container ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="ocr-header">
          <div className="ocr-icon-badge">
            <Eye size={48} />
          </div>
          <h1 className="ocr-title">OCR Reader</h1>
          <p className="ocr-subtitle">
            <Sparkles size={24} />
            <span>Upload an image to extract and hear text, colors, and charts</span>
          </p>
          
          {/* Keyboard shortcuts info */}
          <div className="shortcuts-card">
            <h2 className="shortcuts-title">⌨️ Keyboard Shortcuts</h2>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>U</kbd>
                <span>Upload Image</span>
              </div>
              <div className="shortcut-item">
                <kbd>R</kbd>
                <span>Replay Audio</span>
              </div>
              <div className="shortcut-item">
                <kbd>S</kbd>
                <span>Stop Audio</span>
              </div>
              <div className="shortcut-item">
                <kbd>B</kbd>
                <span>Back to Menu</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            aria-label="Upload image file"
          />
          <label
            htmlFor="file-upload"
            className="upload-button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="upload-icon">
              <Upload size={56} />
            </div>
            <span className="upload-text">Upload Image</span>
            <span className="upload-hint">Click or press U</span>
          </label>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="processing-card">
            <div className="processing-spinner">
              <Loader size={56} />
            </div>
            <h3 className="processing-title">Analyzing Image with DeepSeek AI</h3>
            <p className="processing-step">Please wait while DeepSeek R1 analyzes your image...</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="progress-text">{processingProgress}% Complete</p>
          </div>
        )}

        {/* Image Preview (for low vision users) */}
        {selectedImage && !isProcessing && (
          <div className="image-preview">
            <div className="preview-label">
              <FileImage size={20} />
              <span>Image Preview</span>
            </div>
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Uploaded image preview"
              className="preview-image"
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* Error Display */}
        {error && !isProcessing && (
          <div className="error-card">
            <h3 className="error-title">⚠️ Error</h3>
            <p className="error-text">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setSummary('');
                setSelectedImage(null);
              }}
              className="error-button"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Section */}
        {summary && !isProcessing && !error && (
          <div className="results-section">
            {/* Summary Card */}
            <div className="summary-card">
              <div className="summary-header">
                <div className="summary-icon">
                  <Zap size={32} />
                </div>
                <h2 className="summary-title">DeepSeek AI Analysis</h2>
                {isSpeaking && <span className="speaking-badge">Speaking...</span>}
              </div>
              <p className="summary-text">{summary}</p>
            </div>

            {/* Audio Controls */}
            <div className="controls-grid">
              <button
                onClick={replaySummary}
                className="control-btn control-btn-replay"
                aria-label="Replay audio summary"
              >
                <RotateCcw size={28} />
                <span>Replay</span>
                <kbd>R</kbd>
              </button>

              <button
                onClick={stopSpeech}
                className="control-btn control-btn-stop"
                aria-label="Stop audio"
                disabled={!isSpeaking}
              >
                <Square size={28} />
                <span>Stop</span>
                <kbd>S</kbd>
              </button>

              <button
                onClick={() => navigate('/blind')}
                className="control-btn control-btn-back"
                aria-label="Back to blind menu"
              >
                <ArrowLeft size={28} />
                <span>Back</span>
                <kbd>B</kbd>
              </button>
            </div>
          </div>
        )}

        {/* Back Button (always visible when no results) */}
        {!summary && !isProcessing && !error && (
          <div className="back-section">
            <button
              onClick={() => navigate('/blind')}
              className="back-button"
              aria-label="Back to blind menu"
            >
              <ArrowLeft size={28} />
              <span>Back to Menu</span>
              <kbd>B</kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
