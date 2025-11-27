import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Volume2, Square, Pause, Play, RotateCcw, ArrowLeft } from 'lucide-react';
import Tesseract from 'tesseract.js';
import '../styles/blind-ocr-offline.css';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clean OCR text - remove noise, blank lines, weird symbols
 */
function cleanOCRText(rawText: string): string {
  return rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?;:@#$%&*()\-+=]/g, '')
    .trim();
}

/**
 * Rule-based text summarizer
 * Extracts key sentences, dates, numbers, emails
 */
function summarizeText(text: string): string {
  if (!text || text.length < 10) {
    return 'No meaningful text found.';
  }

  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // If short text, return all
  if (sentences.length <= 3) {
    return text;
  }

  // Extract first 2-3 meaningful sentences
  const summary = sentences.slice(0, 3).join('. ') + '.';

  // Extract entities
  const entities: string[] = [];

  // Dates (simple pattern)
  const datePattern = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
  const dates = text.match(datePattern);
  if (dates && dates.length > 0) {
    entities.push(`Dates found: ${dates.slice(0, 3).join(', ')}`);
  }

  // Numbers (currency, percentages)
  const numberPattern = /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d+)?%/g;
  const numbers = text.match(numberPattern);
  if (numbers && numbers.length > 0) {
    entities.push(`Key numbers: ${numbers.slice(0, 3).join(', ')}`);
  }

  // Emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emails = text.match(emailPattern);
  if (emails && emails.length > 0) {
    entities.push(`Email: ${emails[0]}`);
  }

  // Phone numbers
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  const phones = text.match(phonePattern);
  if (phones && phones.length > 0) {
    entities.push(`Phone: ${phones[0]}`);
  }

  // Combine summary with entities
  if (entities.length > 0) {
    return `${summary} ${entities.join('. ')}.`;
  }

  return summary;
}

/**
 * Convert RGB to color name
 */
function rgbToColorName(r: number, g: number, b: number): string {
  const brightness = (r + g + b) / 3;
  let colorName = '';

  // Determine dominant color
  if (r > g && r > b) {
    colorName = r > 200 ? 'light red' : r > 100 ? 'red' : 'dark red';
  } else if (g > r && g > b) {
    colorName = g > 200 ? 'light green' : g > 100 ? 'green' : 'dark green';
  } else if (b > r && b > g) {
    colorName = b > 200 ? 'light blue' : b > 100 ? 'blue' : 'dark blue';
  } else if (r > 200 && g > 200 && b > 200) {
    colorName = 'white or very light';
  } else if (r < 50 && g < 50 && b < 50) {
    colorName = 'black or very dark';
  } else if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
    colorName = brightness > 150 ? 'light gray' : brightness > 80 ? 'gray' : 'dark gray';
  } else if (r > g && r > b && g > b) {
    colorName = 'orange or yellow';
  } else if (r > 150 && g < 100 && b > 150) {
    colorName = 'purple or magenta';
  } else {
    colorName = 'mixed color';
  }

  // Determine tone
  const isWarm = r > b;
  const tone = isWarm ? 'warm tone' : 'cool tone';

  // Brightness description
  const brightnessDesc = brightness > 180 ? 'very bright' : brightness > 120 ? 'medium brightness' : 'dark';

  return `${colorName}, ${tone}, ${brightnessDesc}`;
}

/**
 * Analyze image colors using canvas
 */
function analyzeColors(imageElement: HTMLImageElement): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('Unable to analyze colors');
      return;
    }

    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Sample every 10th pixel for performance
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 40) {
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    resolve(rgbToColorName(r, g, b));
  });
}

/**
 * Detect chart type using canvas pattern analysis
 */
function detectChartType(imageElement: HTMLImageElement): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('no chart detected');
      return;
    }

    // Scale down for faster processing
    const maxSize = 400;
    const scale = Math.min(maxSize / imageElement.naturalWidth, maxSize / imageElement.naturalHeight);
    canvas.width = imageElement.naturalWidth * scale;
    canvas.height = imageElement.naturalHeight * scale;
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Simple edge detection counters
    let verticalEdges = 0;
    let horizontalEdges = 0;
    let diagonalEdges = 0;
    let circularPatterns = 0;

    // Sample pixels and detect edges
    for (let y = 1; y < canvas.height - 1; y += 5) {
      for (let x = 1; x < canvas.width - 1; x += 5) {
        const idx = (y * canvas.width + x) * 4;
        const current = pixels[idx] + pixels[idx + 1] + pixels[idx + 2];
        
        const rightIdx = (y * canvas.width + (x + 1)) * 4;
        const right = pixels[rightIdx] + pixels[rightIdx + 1] + pixels[rightIdx + 2];
        
        const downIdx = ((y + 1) * canvas.width + x) * 4;
        const down = pixels[downIdx] + pixels[downIdx + 1] + pixels[downIdx + 2];

        // Detect strong edges (threshold: 100)
        if (Math.abs(current - right) > 100) verticalEdges++;
        if (Math.abs(current - down) > 100) horizontalEdges++;
        
        // Diagonal detection
        const diagIdx = ((y + 1) * canvas.width + (x + 1)) * 4;
        const diag = pixels[diagIdx] + pixels[diagIdx + 1] + pixels[diagIdx + 2];
        if (Math.abs(current - diag) > 100) diagonalEdges++;
      }
    }

    // Check for circular patterns (simple approximation)
    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      const x = centerX + Math.cos(rad) * (canvas.width / 4);
      const y = centerY + Math.sin(rad) * (canvas.height / 4);
      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        const brightness = pixels[idx] + pixels[idx + 1] + pixels[idx + 2];
        if (brightness < 400) circularPatterns++; // Dark pixels in circle
      }
    }

    // Decision logic
    const totalEdges = verticalEdges + horizontalEdges + diagonalEdges;
    
    if (circularPatterns > 6) {
      resolve('pie chart');
    } else if (verticalEdges > horizontalEdges * 1.5 && verticalEdges > 50) {
      resolve('bar chart');
    } else if (diagonalEdges > 50 && diagonalEdges > verticalEdges) {
      resolve('line chart');
    } else if (totalEdges > 200) {
      resolve('table or grid');
    } else {
      resolve('no chart detected');
    }
  });
}

/**
 * Build final summary combining all analyses
 */
function buildFinalSummary(colorDesc: string, chartType: string, textSummary: string): string {
  let summary = `The image appears ${colorDesc}. `;
  
  if (chartType !== 'no chart detected') {
    summary += `A ${chartType} was identified. `;
  } else {
    summary += `No charts or graphs detected. `;
  }
  
  summary += `Extracted text: ${textSummary}`;
  
  return summary;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BlindOCROffline() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [colorDescription, setColorDescription] = useState('');
  const [chartType, setChartType] = useState('');
  const [finalSummary, setFinalSummary] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [announcement, setAnnouncement] = useState('Offline OCR Reader ready. Press U to upload an image.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const navigate = useNavigate();

  // ============================================
  // TTS FUNCTIONS
  // ============================================

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.log('Speech synthesis not available:', error);
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setAnnouncement('Audio stopped.');
  };

  const pauseSpeech = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setAnnouncement('Audio paused.');
    }
  };

  const resumeSpeech = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setAnnouncement('Audio resumed.');
    }
  };

  const replaySummary = () => {
    if (finalSummary) {
      setAnnouncement('Replaying summary.');
      speak(finalSummary);
    }
  };

  // ============================================
  // IMAGE PROCESSING
  // ============================================

  const processImage = async (imageSrc: string) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setAnnouncement('Starting local image analysis.');

    try {
      const imgElement = imageRef.current;
      if (!imgElement) throw new Error('Image element not found');

      // Wait for image to load
      await new Promise<void>((resolve) => {
        if (imgElement.complete) {
          resolve();
        } else {
          imgElement.onload = () => resolve();
        }
      });

      // Step 1: OCR with Tesseract
      setProcessingProgress(10);
      setAnnouncement('Extracting text with Tesseract OCR...');

      const { data } = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProcessingProgress(10 + Math.floor(m.progress * 40));
          }
        },
      });

      const cleanedText = cleanOCRText(data.text);
      setExtractedText(cleanedText);
      setProcessingProgress(50);
      setAnnouncement('Text extraction complete. Analyzing colors...');

      // Step 2: Color Analysis
      const colors = await analyzeColors(imgElement);
      setColorDescription(colors);
      setProcessingProgress(70);
      setAnnouncement('Color analysis complete. Detecting charts...');

      // Step 3: Chart Detection
      const chart = await detectChartType(imgElement);
      setChartType(chart);
      setProcessingProgress(85);
      setAnnouncement('Chart detection complete. Building summary...');

      // Step 4: Summarize Text
      const textSummary = summarizeText(cleanedText);
      
      // Step 5: Build Final Summary
      const summary = buildFinalSummary(colors, chart, textSummary);
      setFinalSummary(summary);
      setProcessingProgress(100);
      setAnnouncement('Analysis complete. Reading summary aloud.');

      // Auto-play TTS
      setTimeout(() => speak(summary), 500);

      setIsProcessing(false);
    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image. Please try again.';
      setAnnouncement(errorMessage);
      speak(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
      setAnnouncement('Invalid file type. Please upload PNG or JPEG image.');
      speak('Invalid file type. Please upload PNG or JPEG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setSelectedImage(imageSrc);
      setAnnouncement('Image uploaded. Starting local analysis.');
      speak('Image uploaded. Starting analysis.');
      setTimeout(() => processImage(imageSrc), 500);
    };
    reader.readAsDataURL(file);
  };

  const resetOCR = () => {
    stopSpeech();
    setSelectedImage(null);
    setExtractedText('');
    setColorDescription('');
    setChartType('');
    setFinalSummary('');
    setProcessingProgress(0);
    setAnnouncement('OCR reset. Press U to upload a new image.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case 'u':
          e.preventDefault();
          fileInputRef.current?.click();
          setAnnouncement('Upload dialog opened.');
          break;
        case 'r':
          e.preventDefault();
          replaySummary();
          break;
        case 's':
          e.preventDefault();
          stopSpeech();
          break;
        case 'p':
          e.preventDefault();
          pauseSpeech();
          break;
        case 'c':
          e.preventDefault();
          resumeSpeech();
          break;
        case 'b':
          e.preventDefault();
          navigate('/blind');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [finalSummary, isSpeaking, isPaused, navigate]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="blind-ocr-offline-container">
      {/* Screen Reader Announcements */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header */}
      <header className="ocr-header">
        <h1 className="ocr-title">📄 Offline OCR Reader</h1>
        <p className="ocr-subtitle">Local image analysis - No internet required</p>
      </header>

      {/* Upload Section */}
      {!selectedImage && !isProcessing && (
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileUpload}
            className="file-input-hidden"
            aria-label="Upload image file"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="upload-button"
            aria-label="Upload image for OCR analysis"
          >
            <Upload size={48} />
            <span className="upload-text">Upload Image</span>
            <kbd className="keyboard-hint">Press U</kbd>
          </button>
          <p className="upload-hint">Supports PNG, JPG, JPEG</p>
        </div>
      )}

      {/* Image Preview (Hidden) */}
      {selectedImage && (
        <img
          ref={imageRef}
          src={selectedImage}
          alt="Uploaded for OCR"
          className="image-hidden"
        />
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="processing-card">
          <div className="processing-spinner"></div>
          <h3 className="processing-title">Analyzing Image Locally</h3>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
          <p className="processing-percent">{processingProgress}%</p>
          <p className="processing-step">{announcement}</p>
        </div>
      )}

      {/* Results Section */}
      {finalSummary && !isProcessing && (
        <div className="results-section">
          {/* Summary Card */}
          <div className="summary-card">
            <h2 className="summary-title">Analysis Results</h2>
            {isSpeaking && <span className="speaking-badge">Speaking...</span>}
            {isPaused && <span className="paused-badge">Paused</span>}
            <p className="summary-text">{finalSummary}</p>
          </div>

          {/* TTS Controls */}
          <div className="tts-controls">
            <button
              onClick={replaySummary}
              disabled={isSpeaking && !isPaused}
              className="tts-button"
              aria-label="Replay summary"
            >
              <Volume2 size={24} />
              <span>Replay (R)</span>
            </button>
            <button
              onClick={pauseSpeech}
              disabled={!isSpeaking || isPaused}
              className="tts-button"
              aria-label="Pause audio"
            >
              <Pause size={24} />
              <span>Pause (P)</span>
            </button>
            <button
              onClick={resumeSpeech}
              disabled={!isPaused}
              className="tts-button"
              aria-label="Resume audio"
            >
              <Play size={24} />
              <span>Resume (C)</span>
            </button>
            <button
              onClick={stopSpeech}
              disabled={!isSpeaking && !isPaused}
              className="tts-button tts-button-danger"
              aria-label="Stop audio"
            >
              <Square size={24} />
              <span>Stop (S)</span>
            </button>
          </div>

          {/* Detail Cards */}
          <div className="details-grid">
            <div className="detail-card">
              <h3 className="detail-title">🎨 Colors</h3>
              <p className="detail-text">{colorDescription}</p>
            </div>
            <div className="detail-card">
              <h3 className="detail-title">📊 Chart Type</h3>
              <p className="detail-text">{chartType}</p>
            </div>
            <div className="detail-card detail-card-full">
              <h3 className="detail-title">📝 Extracted Text</h3>
              <p className="detail-text">{extractedText || 'No text found'}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button onClick={resetOCR} className="action-button" aria-label="Upload new image">
              <RotateCcw size={24} />
              <span>New Image (U)</span>
            </button>
            <button
              onClick={() => navigate('/blind')}
              className="action-button action-button-secondary"
              aria-label="Back to blind menu"
            >
              <ArrowLeft size={24} />
              <span>Back (B)</span>
            </button>
          </div>
        </div>
      )}

      {/* Back Button (Empty State) */}
      {!selectedImage && !isProcessing && (
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
  );
}
