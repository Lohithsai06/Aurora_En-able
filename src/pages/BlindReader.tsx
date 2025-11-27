import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft, Keyboard } from 'lucide-react';
import { sendToOpenRouter } from '../lib/openrouter';
import '../styles/blind-reader.css';

// Block type definition
interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list';
  text: string;
}

export default function BlindReader() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<'interactive' | 'continuous' | 'summary'>('interactive');
  const [summaryText, setSummaryText] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Announce helper for aria-live
  const announce = (msg: string) => {
    setAnnouncement(msg);
  };

  // TTS utility functions
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    msg.rate = 0.9;
    msg.pitch = 1;
    window.speechSynthesis.speak(msg);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
  };

  const replay = (text: string) => {
    speak(text);
  };

  const pauseSpeech = () => {
    window.speechSynthesis.pause();
  };

  const resumeSpeech = () => {
    window.speechSynthesis.resume();
  };

  // Read-All Continuous Mode
  const readAll = async () => {
    stop();
    announce('Starting continuous reading of all blocks.');
    
    for (let i = 0; i < blocks.length; i++) {
      if (mode !== 'continuous') {
        stop();
        return;
      }
      
      setSelectedIndex(i);
      announce(`Reading block ${i + 1} of ${blocks.length}`);
      speak(blocks[i].text);
      
      // Wait until speech ends before continuing
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(check);
            resolve();
          }
        }, 250);
      });
    }

    announce('Finished reading all content.');
  };

  // AI Simple Summary Mode
  const requestAISummary = async () => {
    setIsGeneratingSummary(true);
    announce('Generating AI summary, please wait.');
    
    const fullText = blocks.map(b => b.text).join(' ');
    
    const promptText = `You are an accessibility assistant helping blind users. Summarize the following webpage in 5-10 simple, clear sentences. Make it easy to understand. Avoid jargon and unnecessary details. Focus on the main points.

Text to summarize:
${fullText}`;

    try {
      const aiResponse = await sendToOpenRouter(promptText);
      setSummaryText(aiResponse);
      setIsGeneratingSummary(false);
      announce('AI summary ready. Speaking summary now.');
      
      // Wait a moment then speak
      setTimeout(() => {
        speak(aiResponse);
      }, 500);
    } catch (err) {
      console.error('AI summary error:', err);
      setIsGeneratingSummary(false);
      announce('Error: AI summary failed. Please try again.');
      setSummaryText('Failed to generate summary. Please check your internet connection and try again.');
    }
  };

  // Segment long text into readable chunks (2 sentences max)
  function segmentText(text: string): string[] {
    const sentences = text.split(/(?<=[.?!])\s+/);
    const segments = [];

    for (let i = 0; i < sentences.length; i += 2) {
      const chunk = sentences.slice(i, i + 2).join(' ');
      if (chunk.trim()) {
        segments.push(chunk);
      }
    }

    return segments.length > 0 ? segments : [text];
  }

  // Normalize and clean text
  function cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }

  // Junk filtering
  function isJunk(text: string, tagName: string): boolean {
    // Too short
    if (text.length < 5) return true;

    // Unwanted content patterns
    const junkPatterns = [
      /cookie/i,
      /subscribe/i,
      /advert/i,
      /advertisement/i,
      /signup/i,
      /sign up/i,
      /newsletter/i,
      /privacy policy/i,
      /terms of service/i,
      /©\s*\d{4}/,
      /all rights reserved/i
    ];

    if (junkPatterns.some(pattern => pattern.test(text))) return true;

    // Numbers only
    if (/^\d+$/.test(text)) return true;

    // Navigation-like text
    if (tagName === 'A' && text.length < 20) return true;

    // Repetitive words (same word 3+ times)
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (Object.values(wordCounts).some(count => count >= 3)) return true;

    return false;
  }

  // Calculate content score for readability
  function getContentScore(element: Element): number {
    let score = 0;
    const text = element.textContent || '';
    
    // Positive signals
    if (text.length > 100) score += 10;
    if (text.length > 200) score += 10;
    if (element.querySelectorAll('p').length > 2) score += 5;
    if (text.match(/\./g)?.length || 0 > 5) score += 5;
    
    // Negative signals
    const className = element.className || '';
    const id = element.id || '';
    const negativePatterns = [
      'nav', 'menu', 'sidebar', 'footer', 'header', 
      'ad', 'comment', 'social', 'share', 'related'
    ];
    
    if (negativePatterns.some(p => className.includes(p) || id.includes(p))) {
      score -= 20;
    }
    
    return score;
  }

  // Find main content area using simplified readability algorithm
  function findMainContent(): Element | null {
    const candidates = document.querySelectorAll('article, main, [role="main"], .content, .post, .article, #content, #main');
    
    if (candidates.length > 0) {
      let bestCandidate: Element | null = null;
      let bestScore = -Infinity;
      
      candidates.forEach(candidate => {
        const score = getContentScore(candidate);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      });
      
      return bestCandidate;
    }
    
    // Fallback: find div with most paragraph content
    const divs = Array.from(document.querySelectorAll('div'));
    return divs.reduce((best, current) => {
      const currentScore = getContentScore(current);
      const bestScore = best ? getContentScore(best) : -Infinity;
      return currentScore > bestScore ? current : best;
    }, null as Element | null);
  }

  // Extract readable content
  function extractReadableContent() {
    try {
      // Find main content area
      const mainContent = findMainContent() || document.body;
      
      // Extract readable elements
      const nodes = mainContent.querySelectorAll('h1, h2, h3, h4, p, li, blockquote');
      const extracted: ContentBlock[] = [];
      
      nodes.forEach(el => {
        const rawText = el.textContent?.trim() || '';
        if (!rawText) return;
        
        const text = cleanText(rawText);
        const tagName = el.tagName;
        
        // Apply junk filtering
        if (isJunk(text, tagName)) return;
        
        // Categorize by element type
        if (tagName === 'H1' || tagName === 'H2' || tagName === 'H3' || tagName === 'H4') {
          extracted.push({ type: 'heading', text });
        } else if (tagName === 'LI') {
          extracted.push({ type: 'list', text: '• ' + text });
        } else if (tagName === 'P' || tagName === 'BLOCKQUOTE') {
          extracted.push({ type: 'paragraph', text });
        }
      });
      
      // Segment long paragraphs for better readability
      const finalBlocks: ContentBlock[] = [];
      
      extracted.forEach(item => {
        if (item.type === 'paragraph' && item.text.length > 150) {
          const segments = segmentText(item.text);
          segments.forEach(seg => {
            finalBlocks.push({ type: 'paragraph', text: seg });
          });
        } else {
          finalBlocks.push(item);
        }
      });
      
      // Remove duplicates
      const uniqueBlocks = finalBlocks.filter((block, index, self) => 
        index === self.findIndex(b => b.text === block.text)
      );
      
      // Update state
      if (uniqueBlocks.length > 0) {
        setBlocks(uniqueBlocks);
        setSelectedIndex(0);
        announce(`Website reader loaded with ${uniqueBlocks.length} readable blocks.`);
      } else {
        // Fallback: show message if no content found
        setBlocks([
          { type: 'heading', text: 'No readable content found' },
          { type: 'paragraph', text: 'This page may not have standard content structure. Try navigating to a different page with article or blog content.' }
        ]);
        announce('No readable content found on this page.');
      }
      
    } catch (error) {
      console.error('Content extraction error:', error);
      setBlocks([
        { type: 'heading', text: 'Extraction Error' },
        { type: 'paragraph', text: 'Unable to extract content from this page. The page structure may not be compatible.' }
      ]);
      announce('Error extracting content from page.');
    }
  }

  // Initialize page and extract content
  useEffect(() => {
    setIsVisible(true);
    extractReadableContent();
    
    // Initial TTS announcement
    setTimeout(() => {
      speak('Website Reader loaded. Press I for interactive mode, A for read-all mode, or M for AI summary mode. Use arrow keys to navigate, Enter to speak, Shift to stop, Control to replay, or Escape to go back.');
    }, 500);

    return () => {
      stop();
    };
  }, []);

  // Handle mode changes
  useEffect(() => {
    if (blocks.length === 0) return;

    if (mode === 'continuous') {
      announce('Continuous read-all mode selected. Reading entire page automatically.');
      readAll();
    } else if (mode === 'summary') {
      announce('AI simple summary mode selected. Generating summary.');
      requestAISummary();
    } else {
      stop();
      announce('Interactive mode selected. Use arrow keys to navigate blocks.');
    }
  }, [mode]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Mode selection shortcuts
      if (e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        setMode('interactive');
        return;
      }

      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        setMode('continuous');
        return;
      }

      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        setMode('summary');
        return;
      }

      // Summary mode - limited controls
      if (mode === 'summary') {
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'Control') {
          e.preventDefault();
          if (summaryText) {
            replay(summaryText);
            announce('Replaying AI summary.');
          }
          return;
        }

        if (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === 'Shift') {
          e.preventDefault();
          stop();
          announce('Stopped reading.');
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          stop();
          announce('Returning to blind menu.');
          navigate('/blind');
          return;
        }

        return; // Disable other keys in summary mode
      }

      // Continuous mode - limited controls
      if (mode === 'continuous') {
        if (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === 'Shift') {
          e.preventDefault();
          stop();
          setMode('interactive');
          announce('Stopped continuous reading. Switched to interactive mode.');
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          stop();
          announce('Returning to blind menu.');
          navigate('/blind');
          return;
        }

        return; // Disable other keys in continuous mode
      }

      // Interactive mode - full controls
      if (mode === 'interactive') {
        // ArrowDown → next block
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = Math.min(prev + 1, blocks.length - 1);
            if (next !== prev) {
              announce(`Moved to block ${next + 1}`);
            }
            return next;
          });
          return;
        }
        
        // ArrowUp → previous block
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = Math.max(prev - 1, 0);
            if (next !== prev) {
              announce(`Moved to block ${next + 1}`);
            }
            return next;
          });
          return;
        }

        // Enter → Speak selected block
        if (e.key === 'Enter') {
          e.preventDefault();
          const block = blocks[selectedIndex];
          if (block) {
            announce(`Reading block ${selectedIndex + 1}`);
            speak(block.text);
          }
          return;
        }

        // Shift → Stop TTS
        if (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === 'Shift') {
          e.preventDefault();
          stop();
          announce('Stopped reading.');
          return;
        }

        // Ctrl → Replay current block
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'Control') {
          e.preventDefault();
          const block = blocks[selectedIndex];
          if (block) {
            replay(block.text);
            announce('Replaying current block.');
          }
          return;
        }

        // ESC → Back to blind menu
        if (e.key === 'Escape') {
          e.preventDefault();
          stop();
          announce('Returning to blind menu.');
          navigate('/blind');
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [blocks, selectedIndex, mode, summaryText, navigate]);

  // Auto-scroll selected block into view
  useEffect(() => {
    const el = document.getElementById(`block-${selectedIndex}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedIndex]);

  return (
    <div className="reader-page">
      {/* Animated Background */}
      <div className="reader-bg">
        <div className="reader-particle"></div>
        <div className="reader-particle"></div>
        <div className="reader-particle"></div>
        <div className="reader-particle"></div>
        <div className="reader-particle"></div>
      </div>

      {/* Aria-live announcer for screen readers */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className={`reader-container ${isVisible ? 'visible' : ''}`}>
        
        {/* Header Section */}
        <div className="reader-header">
          <div className="reader-icon-badge">
            <Globe size={48} />
          </div>
          <h1 className="reader-title">Website Reader</h1>
          <p className="reader-subtitle">
            <Keyboard size={24} />
            <span>Navigate this page using arrow keys</span>
          </p>
        </div>

        {/* Modes Section */}
        <div className="mode-section">
          <h2 className="mode-title">📖 Reading Modes</h2>
          <div className="mode-grid">
            <button
              onClick={() => setMode('interactive')}
              className={`mode-card ${mode === 'interactive' ? 'mode-card-active' : ''}`}
              aria-label="Interactive mode - navigate block by block"
            >
              <h3>Interactive</h3>
              <p>Navigate block by block with full control</p>
              <kbd className="mode-kbd">I</kbd>
            </button>
            <button
              onClick={() => setMode('continuous')}
              className={`mode-card ${mode === 'continuous' ? 'mode-card-active' : ''}`}
              aria-label="Continuous mode - read all blocks automatically"
            >
              <h3>Continuous</h3>
              <p>Read all blocks automatically</p>
              <kbd className="mode-kbd">A</kbd>
            </button>
            <button
              onClick={() => setMode('summary')}
              className={`mode-card ${mode === 'summary' ? 'mode-card-active' : ''}`}
              aria-label="AI Summary mode - get intelligent overview"
            >
              <h3>AI Summary</h3>
              <p>Get a quick intelligent overview</p>
              <kbd className="mode-kbd">M</kbd>
            </button>
          </div>
        </div>

        {/* AI Summary Display */}
        {mode === 'summary' && (
          <div className="summary-section">
            <h2 className="summary-title">🤖 AI Summary</h2>
            {isGeneratingSummary ? (
              <div className="summary-loading">
                <div className="spinner"></div>
                <p>Generating AI summary, please wait...</p>
              </div>
            ) : summaryText ? (
              <div className="summary-content">
                <p>{summaryText}</p>
              </div>
            ) : (
              <p className="summary-placeholder">Summary will appear here...</p>
            )}
          </div>
        )}

        {/* Block Viewer Section */}
        <div className="blocks-section">
          <h2 className="blocks-title">📄 Content Blocks</h2>
          <div className="blocks-container">
            {blocks.map((block, i) => (
              <div
                key={i}
                id={`block-${i}`}
                className={`content-block ${i === selectedIndex ? 'selected' : ''}`}
              >
                <div className="block-content">
                  <span className="block-number">#{i + 1}</span>
                  <div className="block-text-wrapper">
                    {block.type === 'heading' && (
                      <h3 className="block-heading">{block.text}</h3>
                    )}
                    {block.type === 'paragraph' && (
                      <p className="block-paragraph">{block.text}</p>
                    )}
                    {block.type === 'list' && (
                      <p className="block-list">{block.text}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Controls Description */}
        <div className="controls-section">
          <h2 className="controls-title">⌨️ Keyboard Controls</h2>
          <div className="controls-grid">
            <div className="control-item">
              <div className="control-key blue">↑ ↓</div>
              <p className="control-label">Navigate blocks</p>
            </div>
            <div className="control-item">
              <div className="control-key green">Enter</div>
              <p className="control-label">Speak block</p>
            </div>
            <div className="control-item">
              <div className="control-key red">SHIFT</div>
              <p className="control-label">Stop TTS</p>
            </div>
            <div className="control-item">
              <div className="control-key purple">CTRL</div>
              <p className="control-label">Replay</p>
            </div>
            <div className="control-item">
              <div className="control-key yellow">A</div>
              <p className="control-label">Read all mode</p>
            </div>
            <div className="control-item">
              <div className="control-key pink">M</div>
              <p className="control-label">AI summary</p>
            </div>
          </div>
        </div>

        {/* Footer with Back Button */}
        <div className="reader-footer">
          <div className="back-info">
            <ArrowLeft size={24} />
            <span>Press</span>
            <kbd className="back-key">ESC</kbd>
            <span>to go back to Blind Menu</span>
          </div>
        </div>

      </div>
    </div>
  );
}
