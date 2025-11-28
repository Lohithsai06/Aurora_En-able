/**
 * Background Service Worker for Enable Extension
 * Handles context menu creation, message passing, and extension lifecycle events
 */

console.log('🚀 [Enable BG] SERVICE WORKER LOADING...');

// ============================================
// MASTER API KEY - ADD YOUR KEY HERE
// ============================================
const MASTER_API_KEY = 'AIzaSyCw-VWs2mzfTnOj0LnLKs6OtOK3Oxx_xH8';
// Replace 'YOUR_API_KEY_HERE' with your actual Gemini API key
// Example: const MASTER_API_KEY = 'AIzaSyC1234567890abcdefghijklmnop';
// ============================================

// Context menu item ID
const CONTEXT_MENU_ID = 'simplify-text';

/**
 * Initialize extension on install or update
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('AccessNow extension installed/updated');
  
  // Set default preferences
  chrome.storage.local.get(['simplificationEnabled'], (result) => {
    if (result.simplificationEnabled === undefined) {
      chrome.storage.local.set({ simplificationEnabled: true });
    }
  });
  
  // Enable side panel to open when clicking extension icon
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[AccessNow] Panel behavior error:', error));
  
  // Create context menu
  createContextMenu();
});

/**
 * Create or update the context menu
 */
function createContextMenu() {
  console.log('📋 [Enable BG] Creating context menu...');
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Simplify Text',
      contexts: ['selection']
    });
    console.log('✅ [Enable BG] Context menu created with ID:', CONTEXT_MENU_ID);
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[Enable BG] Context menu clicked!');
  console.log('[Enable BG] Menu item ID:', info.menuItemId);
  console.log('[Enable BG] Selection text:', info.selectionText);
  console.log('[Enable BG] Tab ID:', tab.id);
  console.log('[Enable BG] Window ID:', tab.windowId);
  
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    console.log('[Enable BG] ✅ Simplify text clicked, opening sidebar immediately...');
    
    // Show notification to confirm click detected
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'AccessNow',
      message: 'Opening sidebar with your selected text...'
    });
    
    // Store the selected text SYNCHRONOUSLY (no await)
    console.log('[Enable BG] 💾 Storing text in storage...');
    chrome.storage.local.set({ pendingSimplifyText: info.selectionText }, () => {
      console.log('[Enable BG] ✅ Text stored successfully');
    });
    
    // Open sidebar IMMEDIATELY (synchronously in the user gesture)
    console.log('[Enable BG] 🚀 Opening sidebar NOW...');
    try {
      chrome.sidePanel.open({ windowId: tab.windowId })
        .then(() => {
          console.log('[Enable BG] ✅ Sidebar opened successfully!');
        })
        .catch((error) => {
          console.error('[Enable BG] ❌ Failed to open sidebar:', error);
          // Fallback: tell user to click extension icon
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'AccessNow',
            message: 'Please click the extension icon to open the sidebar.'
          });
        });
    } catch (error) {
      console.error('[Enable BG] ❌ Error:', error);
    }
  } else {
    console.log('[Enable BG] ⚠️ Menu click ignored - wrong menu or no selection');
  }
});

/**
 * Handle messages from other parts of the extension
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'simplifyText') {
    // Mock API call to simplification service
    // In production, this would call the Gemini API
    simplifyTextAPI(request.text)
      .then(simplifiedText => {
        sendResponse({ success: true, simplifiedText });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate async response
    return true;
  }
  
  if (request.action === 'updateContextMenu') {
    // Update context menu based on enabled state
    createContextMenu();
    sendResponse({ success: true });
  }
  
  if (request.action === 'openSidebar') {
    // Open the sidebar panel
    if (sender.tab && sender.tab.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
      sendResponse({ success: true });
    } else {
      // If called from popup, get current window
      chrome.windows.getCurrent((window) => {
        chrome.sidePanel.open({ windowId: window.id });
        sendResponse({ success: true });
      });
      return true; // Keep channel open for async response
    }
  }
});

/**
 * Simplify text using Gemini API
 * Falls back to mock if no API key
 * 
 * @param {string} text - The text to simplify
 * @returns {Promise<string>} - The simplified text
 */
async function simplifyTextAPI(text) {
  console.log('[AccessNow] Starting text simplification...');
  
  // Get API key from storage (if user added their own)
  const result = await chrome.storage.local.get(['geminiApiKey', 'useOwnApiKey']);
  
  // Use user's key if they enabled it, otherwise use master key
  const apiKey = (result.useOwnApiKey && result.geminiApiKey) ? result.geminiApiKey : MASTER_API_KEY;
  
  console.log('[AccessNow] API Key status:', apiKey ? 'Found' : 'Missing');
  
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.log('[AccessNow] No valid API key, using mock simplification');
    // No valid API key, use mock
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockSimplification(text);
  }
  
  try {
    console.log('[AccessNow] Calling Gemini API...');
    // Call Gemini API with 2.0 Flash (2025 stable model)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are helping someone with ADHD, Autism, or Dyslexia understand complex text. Simplify this text using:
- Short, clear sentences (10-15 words max)
- Simple, everyday words
- Break down complex ideas into steps
- Remove jargon and technical terms
- Keep the main message clear

Original text: "${text}"

Provide ONLY the simplified version, nothing else:`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('[AccessNow] API error response:', response.status, errorData);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[AccessNow] API response received:', data);
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const simplified = data.candidates[0].content.parts[0].text.trim();
      console.log('[AccessNow] Text simplified successfully');
      return simplified;
    }
    
    throw new Error('No response from API');
  } catch (error) {
    console.error('[AccessNow] Gemini API error:', error);
    console.log('[AccessNow] Falling back to mock simplification');
    // Fallback to mock on error
    return mockSimplification(text);
  }
}

/**
 * Mock simplification function
 * Applies basic simplification rules for demonstration
 * 
 * @param {string} text - Original text
 * @returns {string} - Simplified text
 */
function mockSimplification(text) {
  // Simple transformation rules for demonstration
  let simplified = text;
  
  // Replace complex words with simpler alternatives
  const replacements = {
    'utilize': 'use',
    'consequently': 'so',
    'furthermore': 'also',
    'nevertheless': 'but',
    'substantial': 'large',
    'demonstrate': 'show',
    'approximately': 'about',
    'sufficient': 'enough',
    'accelerate': 'speed up',
    'acquire': 'get',
    'additional': 'more',
    'assistance': 'help',
    'commence': 'start',
    'implement': 'do',
    'regarding': 'about',
    'terminate': 'end'
  };
  
  // Apply replacements (case-insensitive)
  for (const [complex, simple] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    simplified = simplified.replace(regex, simple);
  }
  
  // Shorten sentences if they're too long
  const sentences = simplified.match(/[^.!?]+[.!?]+/g) || [simplified];
  simplified = sentences.map(sentence => {
    if (sentence.split(' ').length > 20) {
      return sentence.trim() + ' (This sentence could be simplified further)';
    }
    return sentence.trim();
  }).join(' ');
  
  return simplified;
}

/**
 * Handle keyboard commands
 */
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
      }
    });
  }
});
