import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft, Keyboard } from 'lucide-react';
import { sendToOpenRouter } from '../lib/openrouter';

export default function BlindReader() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Extract readable content (placeholder)
  function extractReadableContent() {
    // TODO: to be implemented next chapter
    // will extract <p>, <h1>, <h2>, <li>, etc.
    setBlocks([
      "Loading blocks…",
      "This is a placeholder for extracted content",
      "Navigation will be implemented in next chapter"
    ]);
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
                className={`p-6 rounded-xl text-xl transition-all duration-300 ${
                  i === selectedIndex
                    ? 'bg-blue-700 border-4 border-blue-400 shadow-lg scale-105'
                    : 'bg-gray-800 border-2 border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl font-bold text-blue-300">#{i + 1}</span>
                  <p className="flex-1 leading-relaxed">{block}</p>
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
