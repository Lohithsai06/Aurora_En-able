/**
 * Content Script for AccessNow Extension
 * Injected into all web pages to handle text selection and display simplified text
 */

// Track if modal is currently open
let isModalOpen = false;
let currentModal = null;

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'simplifyText') {
    handleTextSimplification(request.text);
  } else if (request.action === 'showError') {
    showErrorNotification(request.error);
  }
});

/**
 * Handle text simplification request
 * @param {string} selectedText - The text to simplify
 */
async function handleTextSimplification(selectedText) {
  console.log('[AccessNow Content] Starting text simplification for:', selectedText.substring(0, 50) + '...');
  
  // Close any existing modal
  closeModal();
  
  // Show loading state
  showLoadingModal();
  console.log('[AccessNow Content] Loading modal displayed');
  
  try {
    // Send request to background script for API call
    console.log('[AccessNow Content] Sending message to background script...');
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'simplifyText', text: selectedText },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });
    
    console.log('[AccessNow Content] Response received:', response);
    
    if (response.success) {
      console.log('[AccessNow Content] Displaying simplified text modal');
      // Show the simplified text in modal
      showSimplificationModal(selectedText, response.simplifiedText);
    } else {
      console.error('[AccessNow Content] Simplification failed:', response.error);
      throw new Error(response.error || 'Failed to simplify text');
    }
  } catch (error) {
    console.error('[AccessNow Content] Error in simplification:', error);
    closeModal();
    showErrorNotification(`Error: ${error.message}`);
  }
}

/**
 * Show loading modal while processing
 */
function showLoadingModal() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Create loading modal
  const modal = createModalElement();
  modal.innerHTML = `
    <div class="accessnow-modal-content loading">
      <div class="accessnow-spinner"></div>
      <p>Simplifying text...</p>
    </div>
  `;
  
  // Position modal near selected text
  positionModal(modal, rect);
  
  document.body.appendChild(modal);
  currentModal = modal;
  isModalOpen = true;
}

/**
 * Show modal with original and simplified text side-by-side
 * @param {string} originalText - The original selected text
 * @param {string} simplifiedText - The simplified version
 */
function showSimplificationModal(originalText, simplifiedText) {
  // Close loading modal
  closeModal();
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Create modal
  const modal = createModalElement();
  modal.innerHTML = `
    <div class="accessnow-modal-content">
      <div class="accessnow-modal-header">
        <h3>📝 Text Simplification</h3>
        <button class="accessnow-close-btn" title="Close">&times;</button>
      </div>
      
      <div class="accessnow-comparison">
        <div class="accessnow-text-panel">
          <div class="accessnow-panel-header">
            <span class="accessnow-label">Original</span>
          </div>
          <div class="accessnow-text-content original">
            ${escapeHtml(originalText)}
          </div>
        </div>
        
        <div class="accessnow-divider"></div>
        
        <div class="accessnow-text-panel">
          <div class="accessnow-panel-header">
            <span class="accessnow-label">Simplified</span>
            <button class="accessnow-copy-btn" title="Copy simplified text">
              📋 Copy
            </button>
          </div>
          <div class="accessnow-text-content simplified">
            ${escapeHtml(simplifiedText)}
          </div>
        </div>
      </div>
      
      <div class="accessnow-modal-footer">
        <button class="accessnow-explain-btn">🤖 Explain with AI</button>
        <button class="accessnow-done-btn">Done</button>
      </div>
    </div>
  `;
  
  // Position modal near selected text
  positionModal(modal, rect);
  
  // Add event listeners
  const closeBtn = modal.querySelector('.accessnow-close-btn');
  const doneBtn = modal.querySelector('.accessnow-done-btn');
  const copyBtn = modal.querySelector('.accessnow-copy-btn');
  const explainBtn = modal.querySelector('.accessnow-explain-btn');
  
  closeBtn.addEventListener('click', closeModal);
  doneBtn.addEventListener('click', closeModal);
  copyBtn.addEventListener('click', () => copyToClipboard(simplifiedText, copyBtn));
  explainBtn.addEventListener('click', () => openAIChatbot(simplifiedText));
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  document.body.appendChild(modal);
  currentModal = modal;
  isModalOpen = true;
}

/**
 * Create base modal element
 * @returns {HTMLElement} - The modal container
 */
function createModalElement() {
  const modal = document.createElement('div');
  modal.className = 'accessnow-modal';
  modal.setAttribute('data-accessnow', 'true');
  return modal;
}

/**
 * Position modal near the selected text
 * @param {HTMLElement} modal - The modal element
 * @param {DOMRect} rect - The bounding rectangle of selected text
 */
function positionModal(modal, rect) {
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;
  
  // Default position: below the selection
  let top = rect.bottom + scrollY + 10;
  let left = rect.left + scrollX;
  
  // Adjust if modal would go off screen
  setTimeout(() => {
    const modalRect = modal.getBoundingClientRect();
    
    // Check if modal goes below viewport
    if (top + modalRect.height > window.innerHeight + scrollY) {
      top = rect.top + scrollY - modalRect.height - 10;
    }
    
    // Check if modal goes off right edge
    if (left + modalRect.width > window.innerWidth + scrollX) {
      left = window.innerWidth + scrollX - modalRect.width - 20;
    }
    
    // Ensure modal doesn't go off left edge
    if (left < scrollX) {
      left = scrollX + 20;
    }
    
    modal.style.top = `${Math.max(top, scrollY + 20)}px`;
    modal.style.left = `${Math.max(left, scrollX + 20)}px`;
  }, 0);
  
  modal.style.top = `${top}px`;
  modal.style.left = `${left}px`;
}

/**
 * Close the current modal
 */
function closeModal() {
  if (currentModal && currentModal.parentNode) {
    currentModal.remove();
  }
  currentModal = null;
  isModalOpen = false;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - The copy button element
 */
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const originalText = button.innerHTML;
    button.innerHTML = '✓ Copied!';
    button.style.backgroundColor = '#10b981';
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  } catch (error) {
    console.error('Failed to copy text:', error);
    showErrorNotification('Failed to copy text to clipboard');
  }
}

/**
 * Open AI chatbot sidebar with the text for explanation
 * @param {string} text - Text to explain
 */
function openAIChatbot(text) {
  // Store the text for the chatbot to use
  chrome.storage.local.set({ pendingExplanation: text }, () => {
    // Open the sidebar
    chrome.runtime.sendMessage({ action: 'openSidebar' });
    closeModal();
  });
}

/**
 * Show error notification
 * @param {string} message - Error message to display
 */
function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'accessnow-notification error';
  notification.setAttribute('data-accessnow', 'true');
  notification.innerHTML = `
    <div class="accessnow-notification-content">
      <span class="accessnow-notification-icon">⚠️</span>
      <span class="accessnow-notification-message">${escapeHtml(message)}</span>
      <button class="accessnow-notification-close">&times;</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Add close button listener
  const closeBtn = notification.querySelector('.accessnow-notification-close');
  closeBtn.addEventListener('click', () => notification.remove());
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Close modal on ESC key
 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isModalOpen) {
    closeModal();
  }
});

console.log('AccessNow content script loaded');
