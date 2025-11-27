import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Volume2, Square, RotateCcw, ArrowLeft, FileImage, Loader } from 'lucide-react';
import Tesseract from 'tesseract.js';
import ColorThief from 'colorthief';

export default function BlindOCR() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [colorInfo, setColorInfo] = useState('');
  const [chartInfo, setChartInfo] = useState('');
  const [finalSummary, setFinalSummary] = useState('');
  const [announcement, setAnnouncement] = useState('OCR Reader ready. Press U to upload an image.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
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
    setAnnouncement('Starting image analysis. Please wait.');

    try {
      // OCR Processing
      setAnnouncement('Extracting text from image...');
      const { data } = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setAnnouncement(`Text extraction: ${Math.round(m.progress * 100)}% complete.`);
          }
        }
      });
      const cleanedText = data.text.trim().replace(/\s+/g, ' ') || 'No text detected.';
      setOcrText(cleanedText);
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
      setAnnouncement('Analyzing colors...');
      const colorAnalysis = await analyzeColors(imageRef.current);
      setColorInfo(colorAnalysis);
      setAnnouncement('Color analysis complete.');

      // Chart Detection
      setAnnouncement('Detecting charts...');
      const chartAnalysis = await detectChart(imageRef.current);
      setChartInfo(chartAnalysis);
      setAnnouncement('Chart detection complete.');

      // Generate Final Summary
      const summary = `${colorAnalysis} ${chartAnalysis} Extracted text: "${cleanedText}"`;
      setFinalSummary(summary);
      setAnnouncement('Summary ready. Reading aloud now.');

      // Auto-play TTS
      speak(summary);

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
    setTimeout(() => {
      speak('OCR Reader loaded. Press U to upload an image, R to replay audio, S to stop, or B to go back.');
    }, 500);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6">
            <FileImage size={40} />
          </div>
          <h1 className="text-5xl font-bold mb-4">OCR Reader</h1>
          <p className="text-2xl text-gray-300 mb-6">Upload an image to extract and hear text</p>
          
          {/* Keyboard shortcuts info */}
          <div className="bg-gray-900 border-2 border-gray-700 rounded-xl p-6 text-left max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts:</h2>
            <ul className="space-y-2 text-lg">
              <li><kbd className="bg-gray-700 px-3 py-1 rounded">U</kbd> - Upload Image</li>
              <li><kbd className="bg-gray-700 px-3 py-1 rounded">R</kbd> - Replay Audio</li>
              <li><kbd className="bg-gray-700 px-3 py-1 rounded">S</kbd> - Stop Audio</li>
              <li><kbd className="bg-gray-700 px-3 py-1 rounded">B</kbd> - Back to Menu</li>
            </ul>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-12">
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
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold py-8 px-6 rounded-xl cursor-pointer transition-all border-4 border-blue-400 focus-within:outline-none focus-within:ring-4 focus-within:ring-blue-300"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="flex items-center justify-center gap-4">
              <Upload size={48} />
              <span>Upload Image (Press U)</span>
            </div>
          </label>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-yellow-600 border-4 border-yellow-400 rounded-xl p-8 mb-12 text-center">
            <Loader size={48} className="animate-spin mx-auto mb-4" />
            <p className="text-2xl font-bold">Processing image... Please wait.</p>
            <p className="text-xl mt-2">{announcement}</p>
          </div>
        )}

        {/* Image Preview (for low vision users) */}
        {selectedImage && (
          <div className="mb-12 border-4 border-gray-700 rounded-xl overflow-hidden">
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Uploaded image preview"
              className="w-full h-auto max-h-96 object-contain bg-gray-900"
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* Results Section */}
        {finalSummary && !isProcessing && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-gray-900 border-4 border-green-500 rounded-xl p-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Volume2 size={36} className="text-green-500" />
                Summary
              </h2>
              <p className="text-2xl leading-relaxed text-gray-100">{finalSummary}</p>
            </div>

            {/* Audio Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={replaySummary}
                className="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-6 px-6 rounded-xl transition-all border-4 border-green-400 focus:outline-none focus:ring-4 focus:ring-green-300"
                aria-label="Replay audio summary"
              >
                <div className="flex items-center justify-center gap-3">
                  <RotateCcw size={28} />
                  <span>Replay (R)</span>
                </div>
              </button>

              <button
                onClick={stopSpeech}
                className="bg-red-600 hover:bg-red-700 text-white text-xl font-bold py-6 px-6 rounded-xl transition-all border-4 border-red-400 focus:outline-none focus:ring-4 focus:ring-red-300"
                aria-label="Stop audio"
                disabled={!isSpeaking}
              >
                <div className="flex items-center justify-center gap-3">
                  <Square size={28} />
                  <span>Stop (S)</span>
                </div>
              </button>

              <button
                onClick={() => navigate('/blind')}
                className="bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold py-6 px-6 rounded-xl transition-all border-4 border-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-300"
                aria-label="Back to blind menu"
              >
                <div className="flex items-center justify-center gap-3">
                  <ArrowLeft size={28} />
                  <span>Back (B)</span>
                </div>
              </button>
            </div>

            {/* Detailed Results */}
            <details className="bg-gray-900 border-2 border-gray-700 rounded-xl p-6">
              <summary className="text-2xl font-bold cursor-pointer hover:text-blue-400 transition-colors">
                View Detailed Results
              </summary>
              <div className="mt-6 space-y-4 text-lg">
                <div>
                  <h3 className="font-bold text-xl mb-2 text-blue-400">Color Analysis:</h3>
                  <p className="text-gray-300">{colorInfo}</p>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 text-blue-400">Chart Detection:</h3>
                  <p className="text-gray-300">{chartInfo}</p>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 text-blue-400">Extracted Text:</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{ocrText}</p>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Back Button (always visible) */}
        {!finalSummary && !isProcessing && (
          <div className="text-center">
            <button
              onClick={() => navigate('/blind')}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold py-6 px-8 rounded-xl transition-all border-4 border-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-300"
              aria-label="Back to blind menu"
            >
              <div className="flex items-center justify-center gap-3">
                <ArrowLeft size={28} />
                <span>Back to Menu (B)</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
