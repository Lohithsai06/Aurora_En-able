/**
 * Popup Script for AccessNow Extension
 * Manages the extension popup UI and user preferences
 */

// DOM Elements
const simplificationToggle = document.getElementById('simplificationToggle');
const statusIndicator = document.getElementById('statusIndicator');
const statusDot = statusIndicator.querySelector('.status-dot');
const statusText = statusIndicator.querySelector('.status-text');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const settingsBtn = document.getElementById('settingsBtn');
const helpLink = document.getElementById('helpLink');
const simplificationCountEl = document.getElementById('simplificationCount');
const wordsSimplifiedEl = document.getElementById('wordsSimplified');

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadStatistics();
  setupEventListeners();
});

/**
 * Load user settings from chrome.storage
 */
function loadSettings() {
  chrome.storage.local.get(['simplificationEnabled'], (result) => {
    const isEnabled = result.simplificationEnabled !== false; // Default to true
    
    // Update toggle state
    simplificationToggle.checked = isEnabled;
    
    // Update status indicator
    updateStatusIndicator(isEnabled);
  });
}

/**
 * Load usage statistics
 */
function loadStatistics() {
  chrome.storage.local.get(['todayStats'], (result) => {
    const stats = result.todayStats || {
      simplificationCount: 0,
      wordsSimplified: 0,
      date: new Date().toDateString()
    };
    
    // Check if it's a new day
    const today = new Date().toDateString();
    if (stats.date !== today) {
      // Reset stats for new day
      stats.simplificationCount = 0;
      stats.wordsSimplified = 0;
      stats.date = today;
      chrome.storage.local.set({ todayStats: stats });
    }
    
    // Display stats
    simplificationCountEl.textContent = stats.simplificationCount;
    wordsSimplifiedEl.textContent = stats.wordsSimplified;
  });
}

/**
 * Setup event listeners for UI elements
 */
function setupEventListeners() {
  // Toggle switch change
  simplificationToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    
    // Save preference
    chrome.storage.local.set({ simplificationEnabled: isEnabled }, () => {
      console.log('Simplification enabled:', isEnabled);
      
      // Update status indicator
      updateStatusIndicator(isEnabled);
      
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'updateContextMenu'
      });
      
      // Show feedback
      showToast(isEnabled ? 'Feature enabled' : 'Feature disabled');
    });
  });
  
  // Open sidebar button
  openSidebarBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openSidebar' }, (response) => {
      if (response && response.success) {
        window.close(); // Close popup after opening sidebar
      }
    });
  });
  
  // Settings button
  settingsBtn.addEventListener('click', () => {
    // For now, just show a message
    // In future, could open a dedicated settings page
    showToast('Settings panel coming soon!');
  });
  
  // Help link
  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/accessnow/adhd-helper/wiki'
    });
  });
}

/**
 * Update status indicator based on feature state
 * @param {boolean} isEnabled - Whether the feature is enabled
 */
function updateStatusIndicator(isEnabled) {
  if (isEnabled) {
    statusDot.classList.remove('inactive');
    statusDot.classList.add('active');
    statusText.textContent = 'Feature enabled';
    statusIndicator.classList.remove('disabled');
  } else {
    statusDot.classList.remove('active');
    statusDot.classList.add('inactive');
    statusText.textContent = 'Feature disabled';
    statusIndicator.classList.add('disabled');
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Listen for storage changes to update UI in real-time
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.simplificationEnabled) {
      simplificationToggle.checked = changes.simplificationEnabled.newValue;
      updateStatusIndicator(changes.simplificationEnabled.newValue);
    }
    
    if (changes.todayStats) {
      const stats = changes.todayStats.newValue;
      simplificationCountEl.textContent = stats.simplificationCount || 0;
      wordsSimplifiedEl.textContent = stats.wordsSimplified || 0;
    }
  }
});

/**
 * Increment usage statistics
 * Called from content script when simplification is performed
 */
function incrementStats(wordCount) {
  chrome.storage.local.get(['todayStats'], (result) => {
    const stats = result.todayStats || {
      simplificationCount: 0,
      wordsSimplified: 0,
      date: new Date().toDateString()
    };
    
    stats.simplificationCount++;
    stats.wordsSimplified += wordCount;
    
    chrome.storage.local.set({ todayStats: stats });
  });
}

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'incrementStats') {
    incrementStats(request.wordCount || 0);
  }
});
