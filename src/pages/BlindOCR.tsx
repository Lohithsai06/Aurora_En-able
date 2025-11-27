import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Volume2, Square, RotateCcw, ArrowLeft, FileImage, Loader, Eye, Palette, BarChart3, Type, CheckCircle2, Sparkles } from 'lucide-react';
import Tesseract from 'tesseract.js';
import ColorThief from 'colorthief';
import '../styles/blind-ocr.css';

export default function BlindOCR() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [colorInfo, setColorInfo] = useState('');
  const [chartInfo, setChartInfo] = useState('');
  const [finalSummary, setFinalSummary] = useState('');
  const [announcement, setAnnouncement] = useState('OCR Reader ready. Press U to upload an image.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
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
    if (finalSummary) {
      setAnnouncement('Replaying summary.');
      speak(finalSummary);
    }
  };

  // Convert RGB to color name
  const rgbToColorName = (r: number, g: number, b: number): string => {
    const colors = [
      { name: 'red', rgb: [255, 0, 0] },
      { name: 'orange', rgb: [255, 165, 0] },
      { name: 'yellow', rgb: [255, 255, 0] },
      { name: 'green', rgb: [0, 255, 0] },
      { name: 'blue', rgb: [0, 0, 255] },
      { name: 'purple', rgb: [128, 0, 128] },
      { name: 'pink', rgb: [255, 192, 203] },
      { name: 'brown', rgb: [165, 42, 42] },
      { name: 'gray', rgb: [128, 128, 128] },
      { name: 'white', rgb: [255, 255, 255] },
      { name: 'black', rgb: [0, 0, 0] }
    ];

    let minDistance = Infinity;
    let closestColor = 'unknown';

    colors.forEach(color => {
      const distance = Math.sqrt(
        Math.pow(r - color.rgb[0], 2) +
        Math.pow(g - color.rgb[1], 2) +
        Math.pow(b - color.rgb[2], 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color.name;
      }
    });

    return closestColor;
  };

  // Analyze image colors
  const analyzeColors = (imageElement: HTMLImageElement): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const colorThief = new ColorThief();
        const dominantColor = colorThief.getColor(imageElement);
        const palette = colorThief.getPalette(imageElement, 3);

        const [r, g, b] = dominantColor;
        const brightness = (r + g + b) / 3;
        const brightnessLevel = brightness > 180 ? 'very bright' : brightness > 120 ? 'bright' : brightness > 60 ? 'moderate' : 'dark';
        const colorName = rgbToColorName(r, g, b);

        const secondaryColor = palette[1] ? rgbToColorName(palette[1][0], palette[1][1], palette[1][2]) : 'none';

        const analysis = `The image is mostly ${colorName} with ${secondaryColor} accents. Brightness level: ${brightnessLevel}.`;
        resolve(analysis);
      } catch (error) {
        resolve('Color analysis unavailable.');
      }
    });
  };

  // Simple chart detection
  const detectChart = (imageElement: HTMLImageElement): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('No chart detected.');
          return;
        }

        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Simple heuristics for chart detection
        let verticalLines = 0;
        let horizontalLines = 0;
        let circles = 0;

        // Check for vertical lines (bar chart indicator)
        for (let x = 0; x < canvas.width; x += 10) {
          let lineHeight = 0;
          for (let y = 0; y < canvas.height; y++) {
            const idx = (y * canvas.width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (brightness > 100) lineHeight++;
          }
          if (lineHeight > canvas.height * 0.3) verticalLines++;
        }

        // Check for horizontal lines (line chart indicator)
        for (let y = 0; y < canvas.height; y += 10) {
          let lineWidth = 0;
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (brightness > 100) lineWidth++;
          }
          if (lineWidth > canvas.width * 0.3) horizontalLines++;
        }

        // Determine chart type
        if (verticalLines > 5 && verticalLines > horizontalLines) {
          resolve('Chart detected: bar chart.');
        } else if (horizontalLines > 5 && horizontalLines > verticalLines * 2) {
          resolve('Chart detected: line chart.');
        } else {
          resolve('No chart detected.');
        }
      } catch (error) {
        resolve('Chart detection unavailable.');
      }
    });
  };

  // Process image: OCR + Color + Chart
  const processImage = async (imageSrc: string) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setAnnouncement('Starting image analysis. Please wait.');

    try {
      // OCR Processing
      setCurrentStep('Extracting text from image...');
      setAnnouncement('Extracting text from image...');
      setProcessingProgress(10);
      
      const { data } = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = 10 + Math.round(m.progress * 40);
            setProcessingProgress(progress);
            setAnnouncement(`Text extraction: ${Math.round(m.progress * 100)}% complete.`);
          }
        }
      });
      const cleanedText = data.text.trim().replace(/\s+/g, ' ') || 'No text detected.';
      setOcrText(cleanedText);
      setProcessingProgress(50);
      setAnnouncement('Text extraction complete.');

      // Wait for image to load
      await new Promise((resolve) => {
        if (imageRef.current?.complete) {
          resolve(true);
        } else if (imageRef.current) {
          imageRef.current.onload = () => resolve(true);
        }
      });

      if (!imageRef.current) {
        throw new Error('Image not loaded');
      }

      // Color Analysis
      setCurrentStep('Analyzing colors...');
      setAnnouncement('Analyzing colors...');
      setProcessingProgress(60);
      const colorAnalysis = await analyzeColors(imageRef.current);
      setColorInfo(colorAnalysis);
      setProcessingProgress(75);
      setAnnouncement('Color analysis complete.');

      // Chart Detection
      setCurrentStep('Detecting charts...');
      setAnnouncement('Detecting charts...');
      setProcessingProgress(85);
      const chartAnalysis = await detectChart(imageRef.current);
      setChartInfo(chartAnalysis);
      setProcessingProgress(95);
      setAnnouncement('Chart detection complete.');

      // Generate Final Summary
      const summary = `${colorAnalysis} ${chartAnalysis} Extracted text: "${cleanedText}"`;
      setFinalSummary(summary);
      setProcessingProgress(100);
      setCurrentStep('Complete!');
      setAnnouncement('Summary ready. Reading aloud now.');

      // Auto-play TTS
      setTimeout(() => speak(summary), 500);

      setIsProcessing(false);
    } catch (error) {
      console.error('Processing error:', error);
      setAnnouncement('Error processing image. Please try again.');
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
    speak('Image uploaded. Starting analysis.');

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setSelectedImage(imageSrc);
      processImage(imageSrc);
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
  }, [finalSummary, navigate]);

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
            <h3 className="processing-title">Processing Image</h3>
            <p className="processing-step">{currentStep}</p>
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

        {/* Results Section */}
        {finalSummary && !isProcessing && (
          <div className="results-section">
            {/* Summary Card */}
            <div className="summary-card">
              <div className="summary-header">
                <div className="summary-icon">
                  <Volume2 size={32} />
                </div>
                <h2 className="summary-title">Analysis Summary</h2>
                {isSpeaking && <span className="speaking-badge">Speaking...</span>}
              </div>
              <p className="summary-text">{finalSummary}</p>
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

            {/* Detailed Results Cards */}
            <div className="details-grid">
              <div className="detail-card">
                <div className="detail-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <Palette size={28} />
                </div>
                <h3 className="detail-title">Color Analysis</h3>
                <p className="detail-text">{colorInfo}</p>
              </div>

              <div className="detail-card">
                <div className="detail-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <BarChart3 size={28} />
                </div>
                <h3 className="detail-title">Chart Detection</h3>
                <p className="detail-text">{chartInfo}</p>
              </div>

              <div className="detail-card detail-card-full">
                <div className="detail-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                  <Type size={28} />
                </div>
                <h3 className="detail-title">Extracted Text</h3>
                <p className="detail-text detail-text-wrap">{ocrText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Back Button (always visible when no results) */}
        {!finalSummary && !isProcessing && (
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
