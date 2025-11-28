/**
 * Sidebar Script for AI Chatbot
 * Manages API key, chat interface, and AI explanations
 */

// ============================================
// MASTER API KEY - ADD YOUR KEY HERE
// ============================================
const MASTER_API_KEY = 'AIzaSyCw-VWs2mzfTnOj0LnLKs6OtOK3Oxx_xH8';
// Replace 'YOUR_API_KEY_HERE' with your actual Gemini API key
// Example: const MASTER_API_KEY = 'AIzaSyC1234567890abcdefghijklmnop';
// ============================================

// DOM Elements
const apiKeySection = document.getElementById('apiKeySection');
const chatSection = document.getElementById('chatSection');
const settingsSection = document.getElementById('settingsSection');

const accessibilityMode = document.getElementById('accessibilityMode');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleVisibilityBtn = document.getElementById('toggleVisibilityBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');

const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const charCount = document.getElementById('charCount');
const clearChatBtn = document.getElementById('clearChatBtn');

const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const exportChatBtn = document.getElementById('exportChatBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const explanationStyle = document.getElementById('explanationStyle');
const responseLength = document.getElementById('responseLength');
const includeExamples = document.getElementById('includeExamples');
const useAnalogies = document.getElementById('useAnalogies');

// Chat messages array
let chatMessages = [];
let lastUserMessage = ''; // Track last message for re-sending
let abortController = null; // For stopping API requests

/**
 * Initialize sidebar when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Enable Sidebar] 🚀 DOM loaded, initializing...');
  loadAPIKey();
  loadSettings();
  loadChatHistory();
  console.log('[Enable Sidebar] 🔍 Checking for pending text...');
  checkForPendingExplanation();
  setupEventListeners();
  autoResizeTextarea();
  console.log('[Enable Sidebar] ✅ Initialization complete');
});

/**
 * Check for pending text when sidebar becomes visible
 */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('[Enable Sidebar] 👁️ Sidebar became visible, checking for pending text...');
    setTimeout(() => {
      checkForPendingExplanation();
    }, 100);
  }
});

// Also check when window gains focus
window.addEventListener('focus', () => {
  console.log('[Enable Sidebar] 🎯 Window gained focus, checking for pending text...');
  setTimeout(() => {
    checkForPendingExplanation();
  }, 100);
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // API Key management
  toggleVisibilityBtn.addEventListener('click', toggleAPIKeyVisibility);
  saveApiKeyBtn.addEventListener('click', saveAPIKey);
  clearApiKeyBtn.addEventListener('click', clearAPIKey);
  apiKeyInput.addEventListener('input', validateAPIKeyInput);
  
  // Chat functionality
  sendBtn.addEventListener('click', sendMessage);
  document.getElementById('stopBtn').addEventListener('click', () => {
    if (abortController) {
      console.log('[Enable Sidebar] Aborting request...');
      abortController.abort();
    }
  });
  chatInput.addEventListener('keypress', handleKeyPress);
  chatInput.addEventListener('input', updateCharCount);
  clearChatBtn.addEventListener('click', clearChat);
  
  // Settings
  settingsToggleBtn.addEventListener('click', toggleSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  exportChatBtn.addEventListener('click', exportChat);
  
  // Accessibility mode - save immediately when changed
  if (accessibilityMode) {
    accessibilityMode.addEventListener('change', () => {
      const mode = accessibilityMode.value;
      console.log('[Enable Sidebar] 🎯 Accessibility mode changed to:', mode);
      chrome.storage.local.set({ accessibilityMode: mode }, () => {
        console.log('[Enable Sidebar] ✅ Mode saved:', mode);
        
        const modeNames = {
          adhd: 'ADHD Support',
          dyslexic: 'Dyslexic Support',
          autism: 'Autism Support',
          neurodivergent: 'Neurodivergent (General)'
        };
        
        // If there's a last message, offer to re-send it with new mode
        if (lastUserMessage) {
          console.log('[Enable Sidebar] 🔄 Re-sending last message with new mode...');
          
          // Add a system message showing mode change
          const systemMsg = document.createElement('div');
          systemMsg.className = 'chat-message system-message';
          systemMsg.innerHTML = `
            <div class="message-content" style="background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center; color: #374151; font-size: 13px;">
              🔄 <strong>Switched to ${modeNames[mode]}</strong> - Getting new response...
            </div>
          `;
          chatHistory.appendChild(systemMsg);
          chatHistory.scrollTop = chatHistory.scrollHeight;
          
          // Re-send the last message after a brief delay
          setTimeout(() => {
            chatInput.value = lastUserMessage;
            sendMessage();
          }, 500);
        }
      });
    });
  }
  
  // Advanced: Use own API key button
  const useOwnApiKeyBtn = document.getElementById('useOwnApiKeyBtn');
  if (useOwnApiKeyBtn) {
    useOwnApiKeyBtn.addEventListener('click', showAPIKeyInput);
  }
  
  // Example prompts
  const examplePrompts = document.querySelectorAll('.example-prompt');
  examplePrompts.forEach(prompt => {
    prompt.addEventListener('click', (e) => {
      chatInput.value = e.target.textContent.replace(/['"]/g, '');
      chatInput.focus();
      updateCharCount();
    });
  });
}

/**
 * Load API key from storage
 */
function loadAPIKey() {
  chrome.storage.local.get(['geminiApiKey', 'useOwnApiKey'], (result) => {
    // Always use master key and hide API section
    apiKeySection.style.display = 'none';
    chatSection.style.display = 'flex';
    
    // Load user's API key into settings if they have one
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });
}

/**
 * Save API key to storage (encrypted)
 */
async function saveAPIKey() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showAPIKeyStatus('Please enter an API key', 'error');
    return;
  }
  
  // Validate API key format using crypto utils
  if (!cryptoUtils.validateApiKey(apiKey)) {
    showAPIKeyStatus('Invalid API key format. Gemini keys start with "AIza" and are 39 characters', 'error');
    return;
  }
  
  try {
    // Encrypt and save to storage
    await cryptoUtils.secureSet('geminiApiKey', apiKey);
    await chrome.storage.local.set({ useOwnApiKey: true });
    
    showAPIKeyStatus('🔒 API key encrypted and saved! ✓', 'success');
    chatSection.style.display = 'flex';
    
    // Clear any previous error messages
    setTimeout(() => {
      apiKeyStatus.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('[Enable Security] Failed to save API key:', error);
    showAPIKeyStatus('Failed to save API key securely', 'error');
  }
}

/**
 * Clear API key from storage (secure removal)
 */
async function clearAPIKey() {
  if (confirm('Are you sure you want to clear your API key and switch back to the default?')) {
    try {
      await cryptoUtils.secureRemove('geminiApiKey');
      await chrome.storage.local.remove(['useOwnApiKey']);
      
      apiKeyInput.value = '';
      showAPIKeyStatus('🔒 API key securely cleared', 'success');
      apiKeySection.style.display = 'none';
      chatSection.style.display = 'flex';
    } catch (error) {
      console.error('[Enable Security] Failed to clear API key:', error);
      showAPIKeyStatus('Failed to clear API key', 'error');
    }
  }
}

/**
 * Show API key input section for advanced users
 */
function showAPIKeyInput() {
  // Show settings instead of dedicated API section
  settingsSection.classList.remove('hidden');
  chatSection.classList.add('hidden');
  apiKeyInput.focus();
}

/**
 * Toggle API key visibility
 */
function toggleAPIKeyVisibility() {
  const type = apiKeyInput.type === 'password' ? 'text' : 'password';
  apiKeyInput.type = type;
  toggleVisibilityBtn.textContent = type === 'password' ? '👁️' : '🙈';
}

/**
 * Validate API key input
 */
function validateAPIKeyInput() {
  const apiKey = apiKeyInput.value.trim();
  if (apiKey && !apiKey.startsWith('AIza')) {
    showAPIKeyStatus('⚠️ Gemini API keys typically start with "AIza"', 'warning');
  } else {
    apiKeyStatus.textContent = '';
  }
}

/**
 * Show API key status message
 */
function showAPIKeyStatus(message, type = 'info') {
  apiKeyStatus.textContent = message;
  apiKeyStatus.className = `api-key-status ${type}`;
}

/**
 * Send message to AI
 */
async function sendMessage() {
  const message = chatInput.value.trim();
  
  if (!message) {
    return;
  }
  
  // Store the last user message
  lastUserMessage = message;
  console.log('[AccessNow] Stored last message:', lastUserMessage.substring(0, 50) + '...');
  
  // Add user message to chat
  addMessageToChat('user', message);
  
  // Clear input
  chatInput.value = '';
  updateCharCount();
  
  // Show typing indicator and stop button
  const typingId = showTypingIndicator();
  sendBtn.style.display = 'none';
  document.getElementById('stopBtn').style.display = 'flex';
  chatInput.disabled = true;
  
  try {
    // Get AI response
    const response = await getAIResponse(message);
    
    // Remove typing indicator
    removeTypingIndicator(typingId);
    
    // Add AI response with typing effect
    await addMessageWithTypingEffect('ai', response);
    
  } catch (error) {
    removeTypingIndicator(typingId);
    if (error.name === 'AbortError') {
      addMessageToChat('ai', 'Response stopped.');
    } else {
      addMessageToChat('error', `Error: ${error.message}`);
    }
  } finally {
    // Hide stop button, show send button
    sendBtn.style.display = 'flex';
    document.getElementById('stopBtn').style.display = 'none';
    chatInput.disabled = false;
    abortController = null;
  }
  
  // Save chat history
  saveChatHistory();
}

/**
 * Get AI response using Gemini API (with encrypted key support)
 * Falls back to error message if no API key
 */
async function getAIResponse(message) {
  // Sanitize input for security
  const sanitizedMessage = cryptoUtils.sanitizeInput(message);
  
  // Check if API key exists
  const result = await new Promise((resolve) => {
    chrome.storage.local.get([
      'useOwnApiKey', 
      'accessibilityMode',
      'explanationStyle', 
      'responseLength', 
      'includeExamples', 
      'useAnalogies'
    ], resolve);
  });
  
  // Retrieve encrypted API key if user has one
  let apiKey = MASTER_API_KEY;
  if (result.useOwnApiKey) {
    const decryptedKey = await cryptoUtils.secureGet('geminiApiKey');
    if (decryptedKey) {
      apiKey = decryptedKey;
      console.log('[Enable API] Using encrypted user API key');
    }
  } else {
    console.log('[Enable API] Using default API key');
  }
  
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('API key not configured. Please contact support.');
  }
  
  try {
    const prompt = buildPrompt(sanitizedMessage, result);
    
    // Create abort controller for this request
    abortController = new AbortController();
    
    // Call Gemini API with 2.0 Flash (2025 stable model)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: result.responseLength === 'short' ? 512 : 
                           result.responseLength === 'detailed' ? 2048 : 1024,
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error('Rate limit reached. Please try again in a moment.');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key. Please check your settings.');
      } else if (response.status === 400) {
        throw new Error('Bad request. Please try rephrasing your question.');
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    
    throw new Error('No response from API');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Build prompt with ADHD-friendly instructions
 */
function buildPrompt(userMessage, settings) {
  const style = settings.explanationStyle || 'moderate';
  const includeExamples = settings.includeExamples !== false;
  const useAnalogies = settings.useAnalogies !== false;
  const mode = settings.accessibilityMode || 'adhd';
  
  console.log('[Enable Prompt] 🎯 Building prompt with mode:', mode);
  console.log('[Enable Prompt] Settings received:', settings);
  
  // Detect if this is a text simplification request
  const isSimplification = userMessage.toLowerCase().includes('simplify this text');
  
  // Mode-specific instructions
  const modeInstructions = {
    adhd: {
      name: 'ADHD',
      focus: '- **ADHD Focus**: Very short sentences (6-10 words)\n- Break information into tiny chunks\n- Use numbered lists for sequences\n- Bold key points for easy scanning\n- Frequent paragraph breaks (every 2-3 sentences)\n- Start each section with an emoji for visual anchors',
      tone: 'energetic and encouraging'
    },
    dyslexic: {
      name: 'Dyslexia',
      focus: '- **Dyslexia Focus**: Simple common words only\n- Avoid long complex words\n- Use phonetic-friendly language\n- Short lines with lots of white space\n- Clear headings with ### markers\n- Bullet points instead of long paragraphs',
      tone: 'patient and supportive'
    },
    autism: {
      name: 'Autism',
      focus: '- **Autism Focus**: Direct, literal language\n- No idioms, metaphors, or sarcasm\n- Concrete examples over abstract concepts\n- Predictable structure with clear headings\n- Step-by-step instructions\n- Explain implied meanings explicitly',
      tone: 'clear, direct, and literal'
    },
    neurodivergent: {
      name: 'Neurodivergent',
      focus: '- **Neurodivergent Focus**: Multiple formats (text + structure)\n- Both visual and text explanations\n- Flexible pacing information\n- Multiple ways to understand same concept\n- Clear organization with headings\n- Options for detail level',
      tone: 'adaptable and inclusive'
    }
  };
  
  const currentMode = modeInstructions[mode];
  
  let styleInstructions = '';
  if (style === 'simple') {
    styleInstructions = '- Use VERY simple language (5th grade level)\n- Short sentences (8-12 words)\n- Bullet points for lists';
  } else if (style === 'moderate') {
    styleInstructions = '- Use clear, conversational tone\n- Short paragraphs (2-3 sentences)\n- Well-organized structure';
  } else { // detailed
    styleInstructions = '- Use clear, professional language\n- Concise sentences (12-15 words)\n- Comprehensive but organized';
  }
  
  if (isSimplification) {
    return `You are a friendly AI assistant helping someone with ${currentMode.name} understand complex text. Your job is to simplify text in a ${currentMode.tone} way.

FORMATTING RULES:
✨ Use emojis to make it friendly and engaging (1-2 per section, not excessive)
✨ Use proper markdown:
   - Use **bold** for emphasis (ensure it's properly closed: **text**)
   - Use ### for headings
   - Use bullet points (- or •) for lists
   - Use numbered lists (1. 2. 3.) for steps
   - Add blank lines between sections for readability

SIMPLIFICATION RULES:
📝 Rewrite at 5th-grade reading level
${currentMode.focus}
📝 Use simple, everyday words
📝 Use analogies that relate to everyday life
📝 Be ${currentMode.tone}
${includeExamples ? '📝 Include a simple example' : ''}

User's request: "${userMessage}"

Provide a simplified, friendly version with proper formatting and structure:`;  
  }
  
  return `You are a friendly AI assistant helping someone with ${currentMode.name}. Your goal is to make information easy to understand in a ${currentMode.tone} way.

FORMATTING RULES:
✨ Use emojis to make it friendly (1-2 per section, not excessive)
✨ Use proper markdown:
   - Use **bold** for key terms (ensure it's closed: **text**)
   - Use ### for headings
   - Use bullet points (- or •) for lists
   - Use numbered lists (1. 2. 3.) for steps
   - Add blank lines between sections

CONTENT RULES:
${currentMode.focus}
${styleInstructions}
${includeExamples ? '- Provide concrete examples when helpful' : '- Avoid unnecessary examples'}
${useAnalogies ? '- Use simple analogies to explain difficult concepts' : '- Explain concepts directly without analogies'}

User's question: "${userMessage}"

Provide a clear, friendly, well-formatted response following the rules above:`;
}

/**
 * Generate mock AI response (kept as fallback)
 * TODO: Remove after API is confirmed working
 */
function generateMockResponse(message, style, includeExamples, useAnalogies) {
  const responses = {
    simple: `Here's a simple explanation:\n\n${message} is like when you ${useAnalogies ? 'play with building blocks' : 'learn something new'}. ${includeExamples ? '\n\nFor example: Imagine you have a toy car. When you push it, it moves forward. That\'s similar to how this works!' : ''}`,
    
    moderate: `Let me break this down for you:\n\n${message} involves several key concepts that work together. ${useAnalogies ? 'Think of it like organizing your room - everything has its place and purpose.' : ''}\n\n${includeExamples ? 'Example: If you were explaining this to a friend, you\'d say it\'s similar to how apps on your phone communicate with the internet.' : 'The main idea is that different parts interact to create a whole system.'}`,
    
    detailed: `Comprehensive explanation:\n\n${message} is a complex topic that requires understanding multiple interconnected concepts. ${useAnalogies ? 'An apt analogy would be a city\'s infrastructure - various systems (water, electricity, transportation) working in harmony.' : ''}\n\n${includeExamples ? 'Consider this practical example: Modern smartphones utilize this principle when processing user inputs and generating outputs through sophisticated algorithms.' : 'This involves systematic processing, data transformation, and result generation.'}`
  };
  
  return responses[style] || responses.moderate;
}

/**
 * Add message to chat UI
 */
function addMessageToChat(type, content) {
  // Remove welcome message if it exists
  const welcomeMsg = chatHistory.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}-message`;
  
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (type === 'user') {
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="message-sender">You</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${escapeHtml(content)}</div>
    `;
  } else if (type === 'ai') {
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="message-sender">🤖 AI Assistant</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${formatAIResponse(content)}</div>
      <div class="message-actions">
        <button class="action-btn copy-btn" title="Copy response">📋 Copy</button>
        <button class="action-btn speak-btn" title="Read aloud">🔊 Speak</button>
      </div>
    `;
    
    // Add copy functionality
    const copyBtn = messageDiv.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => copyResponse(content, copyBtn));
    
    // Add speak functionality
    const speakBtn = messageDiv.querySelector('.speak-btn');
    speakBtn.addEventListener('click', () => toggleSpeak(content, speakBtn));
    
  } else if (type === 'error') {
    messageDiv.innerHTML = `
      <div class="message-content error">⚠️ ${escapeHtml(content)}</div>
    `;
  }
  
  chatHistory.appendChild(messageDiv);
  
  // Store message
  chatMessages.push({ type, content, timestamp });
  
  // Scroll to bottom
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Add message with ADHD-friendly typing effect
 * Shows 3 words at a time with 120ms delay
 */
async function addMessageWithTypingEffect(type, content) {
  // Remove welcome message if it exists
  const welcomeMsg = chatHistory.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}-message`;
  
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-sender">🤖 AI Assistant</span>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-content"></div>
    <div class="message-actions">
      <button class="action-btn copy-btn" title="Copy response">📋 Copy</button>
      <button class="action-btn speak-btn" title="Read aloud">🔊 Speak</button>
    </div>
  `;
  
  chatHistory.appendChild(messageDiv);
  const contentDiv = messageDiv.querySelector('.message-content');
  
  // For better formatting, show content in larger chunks (sentences/lines)
  // instead of word-by-word to preserve markdown structure
  const lines = content.split(/\n+/);
  const delayMs = 200; // Delay between lines
  
  // Display lines with typing effect
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Add line break before new line (except first)
    if (i > 0) {
      contentDiv.innerHTML += '<br>';
    }
    
    contentDiv.innerHTML += formatAIResponse(line);
    
    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Wait before showing next line
    if (i + 1 < lines.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Add copy functionality
  const copyBtn = messageDiv.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => copyResponse(content, copyBtn));
  
  // Add speak functionality
  const speakBtn = messageDiv.querySelector('.speak-btn');
  speakBtn.addEventListener('click', () => toggleSpeak(content, speakBtn));
  
  // Store message
  chatMessages.push({ type, content, timestamp });
}

/**
 * Format AI response with markdown-like styling
 */
function formatAIResponse(content) {
  let formatted = escapeHtml(content);
  
  // Headings: ### Heading
  formatted = formatted.replace(/###\s*(.+?)(\n|$)/g, '<h3 style="margin: 12px 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">$1</h3>');
  formatted = formatted.replace(/##\s*(.+?)(\n|$)/g, '<h2 style="margin: 14px 0 10px 0; font-size: 18px; font-weight: 600; color: #1f2937;">$1</h2>');
  
  // Bold text: **text**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic text: *text* (but not ** at start)
  formatted = formatted.replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1</em>');
  
  // Code blocks: `code`
  formatted = formatted.replace(/`(.+?)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;">$1</code>');
  
  // Bullet points: - item or • item
  formatted = formatted.replace(/^[\-\u2022]\s*(.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
  
  // Numbered lists: 1. item
  formatted = formatted.replace(/^\d+\.\s*(.+)$/gm, '<li style="margin-left: 20px; list-style-type: decimal;">$1</li>');
  
  // Line breaks (double newline = paragraph)
  formatted = formatted.replace(/\n\n/g, '<br><br>');
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Wrap consecutive <li> in <ul>
  formatted = formatted.replace(/(<li style="margin-left: 20px;">.*?<\/li>(?:<br>)?)+/g, (match) => {
    return '<ul style="margin: 8px 0; padding-left: 0;">' + match.replace(/<br>/g, '') + '</ul>';
  });
  
  return formatted;
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message typing-indicator';
  typingDiv.id = 'typing-' + Date.now();
  typingDiv.innerHTML = `
    <div class="message-header">
      <span class="message-sender">🤖 AI Assistant</span>
    </div>
    <div class="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  
  chatHistory.appendChild(typingDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  return typingDiv.id;
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator(id) {
  const typing = document.getElementById(id);
  if (typing) {
    typing.remove();
  }
}

/**
 * Copy response to clipboard
 */
async function copyResponse(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

/**
 * Toggle text-to-speech (play/pause)
 */
let currentSpeakButton = null;

function toggleSpeak(text, button) {
  // If speech is currently active
  if (speechSynthesis.speaking) {
    // If clicking the same button that's currently speaking, stop it
    if (currentSpeakButton === button) {
      speechSynthesis.cancel();
      button.innerHTML = '🔊 Speak';
      button.classList.remove('speaking');
      currentSpeakButton = null;
      return;
    } else {
      // Different button clicked, stop current and start new
      speechSynthesis.cancel();
      if (currentSpeakButton) {
        currentSpeakButton.innerHTML = '🔊 Speak';
        currentSpeakButton.classList.remove('speaking');
      }
    }
  }
  
  // Clean text by removing markdown formatting
  const cleanText = text
    .replace(/\*\*/g, '')           // Remove bold **
    .replace(/\*/g, '')             // Remove italic *
    .replace(/#{1,6}\s/g, '')       // Remove headers #
    .replace(/`{1,3}/g, '')         // Remove code blocks ```
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Remove links [text](url) -> text
    .replace(/[-*_]{3,}/g, '')      // Remove horizontal rules ---
    .replace(/^\s*[-*+]\s/gm, '')   // Remove bullet points
    .replace(/^\s*\d+\.\s/gm, '')   // Remove numbered lists
    .replace(/>\s/g, '')            // Remove blockquotes >
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove miscellaneous symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Remove dingbats
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Remove emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Remove transport & map symbols
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Remove flags
    .replace(/🔊|⏸️|📋|💡|🧠|✨|🎯/g, '') // Remove specific emojis used in UI
    .replace(/\n{3,}/g, '\n\n')     // Reduce multiple newlines
    .trim();
  
  // Start new speech
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.9; // Slightly slower for better comprehension
  utterance.pitch = 1;
  utterance.volume = 1;
  
  // Update button state
  button.innerHTML = '■ Stop';
  button.classList.add('speaking');
  currentSpeakButton = button;
  
  // Reset button when speech ends
  utterance.onend = () => {
    button.innerHTML = '🔊 Speak';
    button.classList.remove('speaking');
    currentSpeakButton = null;
  };
  
  utterance.onerror = () => {
    button.innerHTML = '🔊 Speak';
    button.classList.remove('speaking');
    currentSpeakButton = null;
  };
  
  // Speak
  speechSynthesis.speak(utterance);
}

/**
 * Handle Enter key press
 */
function handleKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/**
 * Update character count
 */
function updateCharCount() {
  const count = chatInput.value.length;
  charCount.textContent = `${count} / 2000`;
  
  if (count > 2000) {
    charCount.style.color = '#ef4444';
  } else {
    charCount.style.color = '';
  }
  
  autoResizeTextarea();
}

/**
 * Auto-resize textarea
 */
function autoResizeTextarea() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
}

/**
 * Clear chat history
 */
function clearChat() {
  if (confirm('Clear all chat messages?')) {
    chatMessages = [];
    chatHistory.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-icon">👋</div>
        <h3>Chat cleared!</h3>
        <p>Start a new conversation.</p>
      </div>
    `;
    saveChatHistory();
  }
}

/**
 * Toggle settings panel
 */
function toggleSettings() {
  settingsSection.classList.toggle('hidden');
  chatSection.classList.toggle('hidden');
}

/**
 * Load settings
 */
function loadSettings() {
  chrome.storage.local.get([
    'accessibilityMode',
    'explanationStyle', 
    'responseLength', 
    'includeExamples', 
    'useAnalogies'
  ], (result) => {
    if (accessibilityMode) accessibilityMode.value = result.accessibilityMode || 'adhd';
    explanationStyle.value = result.explanationStyle || 'moderate';
    responseLength.value = result.responseLength || 'medium';
    includeExamples.checked = result.includeExamples !== false;
    useAnalogies.checked = result.useAnalogies !== false;
  });
}

/**
 * Save settings
 */
function saveSettings() {
  const settings = {
    accessibilityMode: accessibilityMode ? accessibilityMode.value : 'adhd',
    explanationStyle: explanationStyle.value,
    responseLength: responseLength.value,
    includeExamples: includeExamples.checked,
    useAnalogies: useAnalogies.checked
  };
  
  chrome.storage.local.set(settings, () => {
    alert('Settings saved successfully!');
  });
}

/**
 * Load chat history from storage
 */
function loadChatHistory() {
  chrome.storage.local.get(['chatHistory'], (result) => {
    if (result.chatHistory && result.chatHistory.length > 0) {
      chatMessages = result.chatHistory;
      
      // Remove welcome message
      const welcomeMsg = chatHistory.querySelector('.welcome-message');
      if (welcomeMsg) {
        welcomeMsg.remove();
      }
      
      // Render messages
      chatMessages.forEach(msg => {
        addMessageToChat(msg.type, msg.content);
      });
    }
  });
}

/**
 * Save chat history to storage
 */
function saveChatHistory() {
  chrome.storage.local.set({ chatHistory: chatMessages });
}

/**
 * Export chat as text file
 */
function exportChat() {
  if (chatMessages.length === 0) {
    alert('No messages to export');
    return;
  }
  
  let text = 'AccessNow AI Chat Export\n';
  text += '========================\n\n';
  
  chatMessages.forEach(msg => {
    if (msg.type === 'user') {
      text += `You: ${msg.content}\n\n`;
    } else if (msg.type === 'ai') {
      text += `AI: ${msg.content}\n\n`;
    }
  });
  
  // Create download
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `accessnow-chat-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Check for pending explanation from content script
 */
function checkForPendingExplanation() {
  console.log('[Enable Sidebar] 🔎 Checking storage for pending text...');
  chrome.storage.local.get(['pendingExplanation', 'pendingSimplifyText', 'accessibilityMode'], (result) => {
    console.log('[Enable Sidebar] Storage result:', result);
    console.log('[Enable Sidebar] pendingSimplifyText:', result.pendingSimplifyText);
    console.log('[Enable Sidebar] pendingExplanation:', result.pendingExplanation);
    
    const mode = result.accessibilityMode || 'adhd';
    const modeNames = {
      adhd: 'ADHD',
      dyslexic: 'Dyslexia', 
      autism: 'Autism',
      neurodivergent: 'Neurodivergent'
    };
    
    // Check for simplify text first (higher priority)
    if (result.pendingSimplifyText) {
      console.log('[Enable Sidebar] ✅ Found pending text to simplify:', result.pendingSimplifyText.substring(0, 50) + '...');
      const prompt = `Please simplify this text for someone with ${modeNames[mode]} (use short sentences, simple words):\n\n"${result.pendingSimplifyText}"`;
      console.log('[Enable Sidebar] Setting input value to:', prompt.substring(0, 100) + '...');
      chatInput.value = prompt;
      updateCharCount();
      
      // Clear pending text
      console.log('[Enable Sidebar] 🗑️ Clearing pending text from storage...');
      chrome.storage.local.remove(['pendingSimplifyText']);
      
      // Auto-send after a brief delay
      console.log('[Enable Sidebar] ⏱️ Scheduling auto-send in 500ms...');
      setTimeout(() => {
        console.log('[Enable Sidebar] 📤 Auto-sending simplification request...');
        sendMessage();
      }, 500);
    }
    // Otherwise check for pending explanation
    else if (result.pendingExplanation) {
      console.log('[Enable Sidebar] ✅ Found pending explanation request');
      chatInput.value = `Explain this text in simple terms: "${result.pendingExplanation}"`;
      updateCharCount();
      
      // Clear pending explanation
      chrome.storage.local.remove(['pendingExplanation']);
      
      // Auto-send after a brief delay
      setTimeout(() => {
        sendMessage();
      }, 500);
    } else {
      console.log('[Enable Sidebar] ℹ️ No pending text found');
    }
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
