import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft, Keyboard } from 'lucide-react';
import { sendToOpenRouter } from '../lib/openrouter';

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
        setAnnouncement(`Extracted ${uniqueBlocks.length} readable blocks from this page.`);
      } else {
        // Fallback: show message if no content found
        setBlocks([
          { type: 'heading', text: 'No readable content found' },
          { type: 'paragraph', text: 'This page may not have standard content structure. Try navigating to a different page with article or blog content.' }
        ]);
        setAnnouncement('No readable content found on this page.');
      }
      
    } catch (error) {
      console.error('Content extraction error:', error);
      setBlocks([
        { type: 'heading', text: 'Extraction Error' },
        { type: 'paragraph', text: 'Unable to extract content from this page. The page structure may not be compatible.' }
      ]);
      setAnnouncement('Error extracting content from page.');
    }
  }

  // Initialize page and extract content
  useEffect(() => {
    setIsVisible(true);
    extractReadableContent();
    setAnnouncement('Website Reader loaded. Use arrow keys to navigate blocks.');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // ArrowDown → next block
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, blocks.length - 1));
      }
      
      // ArrowUp → previous block
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }

      // ESC → Back to blind menu
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/blind');
      }

      // TODO: Implement in later chapters:
      // Enter → Speak the block
      // Shift → Stop TTS
      // Ctrl → Replay
      // A → Read All Mode
      // M → Simple Summary Mode
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [blocks, navigate]);

  // Auto-scroll selected block into view
  useEffect(() => {
    const el = document.getElementById(`block-${selectedIndex}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedIndex]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Aria-live announcer for screen readers */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className={`max-w-4xl mx-auto transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
            <Globe size={48} />
          </div>
          <h1 className="text-5xl font-bold mb-3">Website Reader</h1>
          <p className="text-2xl text-gray-300 flex items-center justify-center gap-3">
            <Keyboard size={24} />
            <span>Navigate this page using arrow keys</span>
          </p>
        </div>

        {/* Modes Section (Placeholder) */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border-2 border-gray-700">
          <h2 className="text-2xl font-bold mb-4">📖 Reading Modes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-xl border-2 border-gray-600">
              <h3 className="text-xl font-semibold mb-2">Interactive</h3>
              <p className="text-gray-400">Navigate block by block</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border-2 border-gray-600">
              <h3 className="text-xl font-semibold mb-2">Continuous</h3>
              <p className="text-gray-400">Read all blocks</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border-2 border-gray-600">
              <h3 className="text-xl font-semibold mb-2">AI Summary</h3>
              <p className="text-gray-400">Quick overview</p>
            </div>
          </div>
        </div>

        {/* Block Viewer Section */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border-2 border-gray-700">
          <h2 className="text-2xl font-bold mb-4">📄 Content Blocks</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {blocks.map((block, i) => (
              <div
                key={i}
                id={`block-${i}`}
                className={`p-6 rounded-xl transition-all duration-300 ${
                  i === selectedIndex
                    ? 'bg-blue-700 border-4 border-blue-400 shadow-lg scale-105'
                    : 'bg-gray-800 border-2 border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl font-bold text-blue-300">#{i + 1}</span>
                  <div className="flex-1">
                    {block.type === 'heading' && (
                      <h3 className="text-2xl font-bold text-yellow-300 leading-relaxed">{block.text}</h3>
                    )}
                    {block.type === 'paragraph' && (
                      <p className="text-xl leading-relaxed">{block.text}</p>
                    )}
                    {block.type === 'list' && (
                      <p className="text-xl leading-relaxed text-green-300">{block.text}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Controls Description */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border-2 border-gray-700">
          <h2 className="text-2xl font-bold mb-4">⌨️ Keyboard Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-lg">
            <div className="bg-gray-800 p-4 rounded-xl">
              <kbd className="bg-blue-600 px-3 py-2 rounded text-white font-bold">↑ ↓</kbd>
              <p className="mt-2 text-gray-300">Navigate blocks</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl">
              <kbd className="bg-green-600 px-3 py-2 rounded text-white font-bold">Enter</kbd>
              <p className="mt-2 text-gray-300">Speak block</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl">
              <kbd className="bg-red-600 px-3 py-2 rounded text-white font-bold">SHIFT</kbd>
              <p className="mt-2 text-gray-300">Stop TTS</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl">
              <kbd className="bg-purple-600 px-3 py-2 rounded text-white font-bold">CTRL</kbd>
              <p className="mt-2 text-gray-300">Replay</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl">
              <kbd className="bg-yellow-600 px-3 py-2 rounded text-white font-bold">A</kbd>
              <p className="mt-2 text-gray-300">Read all mode</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl">
              <kbd className="bg-pink-600 px-3 py-2 rounded text-white font-bold">M</kbd>
              <p className="mt-2 text-gray-300">AI summary</p>
            </div>
          </div>
        </div>

        {/* Footer with Back Button */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-gray-800 px-6 py-4 rounded-xl border-2 border-gray-600">
            <ArrowLeft size={24} />
            <span className="text-xl">Press</span>
            <kbd className="bg-gray-700 px-4 py-2 rounded text-white font-bold text-xl">ESC</kbd>
            <span className="text-xl">to go back to Blind Menu</span>
          </div>
        </div>

      </div>
    </div>
  );
}
