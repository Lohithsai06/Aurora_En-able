/**
 * Cryptographic Utilities for Secure Extension
 * Implements encryption for sensitive data storage
 */

class CryptoUtils {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  /**
   * Generate a cryptographic key from extension ID
   * Uses Web Crypto API for secure key derivation
   */
  async generateKey() {
    try {
      // Use extension ID as salt for key derivation
      const extensionId = chrome.runtime.id;
      const salt = new TextEncoder().encode(extensionId);
      
      // Create a deterministic key from extension ID
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        salt,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive encryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.algorithm, length: this.keyLength },
        true,
        ['encrypt', 'decrypt']
      );
      
      return key;
    } catch (error) {
      console.error('[Enable Crypto] Key generation failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data (like API keys)
   * @param {string} plaintext - Data to encrypt
   * @returns {Promise<string>} - Base64 encoded encrypted data
   */
  async encrypt(plaintext) {
    try {
      if (!plaintext) return null;
      
      const key = await this.generateKey();
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
      const encodedText = new TextEncoder().encode(plaintext);
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        encodedText
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      // Convert to base64 for storage
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('[Enable Crypto] Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedBase64 - Base64 encoded encrypted data
   * @returns {Promise<string>} - Decrypted plaintext
   */
  async decrypt(encryptedBase64) {
    try {
      if (!encryptedBase64) return null;
      
      const key = await this.generateKey();
      const combined = this.base64ToArrayBuffer(encryptedBase64);
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);
      
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        encryptedData
      );
      
      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('[Enable Crypto] Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Hash data (for integrity checks)
   * @param {string} data - Data to hash
   * @returns {Promise<string>} - Hex encoded hash
   */
  async hash(data) {
    try {
      const encodedData = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[Enable Crypto] Hashing failed:', error);
      throw error;
    }
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} - True if valid format
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    // Gemini API keys should start with 'AIza' and be 39 characters
    const apiKeyRegex = /^AIza[0-9A-Za-z_-]{35}$/;
    return apiKeyRegex.test(apiKey);
  }

  /**
   * Sanitize input to prevent XSS
   * @param {string} input - User input to sanitize
   * @returns {string} - Sanitized input
   */
  sanitizeInput(input) {
    if (!input) return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generate Content Security Policy nonce
   */
  generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array);
  }

  /**
   * Secure storage wrapper
   */
  async secureSet(key, value) {
    try {
      const encrypted = await this.encrypt(value);
      const hash = await this.hash(value);
      
      return new Promise((resolve) => {
        chrome.storage.local.set({
          [`${key}_encrypted`]: encrypted,
          [`${key}_hash`]: hash
        }, resolve);
      });
    } catch (error) {
      console.error('[Enable Crypto] Secure set failed:', error);
      throw error;
    }
  }

  /**
   * Secure storage retrieval
   */
  async secureGet(key) {
    try {
      return new Promise(async (resolve) => {
        chrome.storage.local.get([`${key}_encrypted`, `${key}_hash`], async (result) => {
          if (!result[`${key}_encrypted`]) {
            resolve(null);
            return;
          }
          
          const decrypted = await this.decrypt(result[`${key}_encrypted`]);
          
          // Verify integrity
          const computedHash = await this.hash(decrypted);
          if (computedHash !== result[`${key}_hash`]) {
            console.warn('[Enable Crypto] Integrity check failed for:', key);
            resolve(null);
            return;
          }
          
          resolve(decrypted);
        });
      });
    } catch (error) {
      console.error('[Enable Crypto] Secure get failed:', error);
      return null;
    }
  }

  /**
   * Secure storage removal
   */
  async secureRemove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([`${key}_encrypted`, `${key}_hash`], resolve);
    });
  }
}

// Export for use in other scripts
const cryptoUtils = new CryptoUtils();
