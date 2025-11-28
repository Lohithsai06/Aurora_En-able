/**
 * API Configuration and Integration Guide
 * This file contains instructions for integrating the Gemini API
 */

// ============================================================================
// STEP 1: Get Your Gemini API Key
// ============================================================================
// 1. Visit: https://makersuite.google.com/app/apikey
// 2. Sign in with your Google account
// 3. Click "Create API Key"
// 4. Copy the key (starts with "AIza...")
// 5. Store it securely - never commit to public repositories

// ============================================================================
// STEP 2: Gemini API Endpoints
// ============================================================================

const GEMINI_API_CONFIG = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  models: {
    geminiPro: 'gemini-pro',
    geminiProVision: 'gemini-pro-vision'
  },
  endpoints: {
    generateContent: '/models/gemini-pro:generateContent',
    streamGenerateContent: '/models/gemini-pro:streamGenerateContent'
  }
};

// ============================================================================
// STEP 3: Integration Example - Text Simplification
// ============================================================================

/**
 * Example function to call Gemini API for text simplification
 * Replace the mockSimplification function in background.js with this
 */
async function simplifyTextWithGemini(text, apiKey) {
  const url = `${GEMINI_API_CONFIG.baseUrl}${GEMINI_API_CONFIG.endpoints.generateContent}?key=${apiKey}`;
  
  const prompt = `You are an AI assistant helping people with ADHD understand complex text. 
Simplify the following text while maintaining its core meaning. 
Use shorter sentences, simpler words, and clear structure.

Original text: "${text}"

Provide the simplified version:`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const simplifiedText = data.candidates[0].content.parts[0].text;
      return simplifiedText;
    } else {
      throw new Error('No response generated');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// ============================================================================
// STEP 4: Integration Example - Concept Explanation (Chatbot)
// ============================================================================

/**
 * Example function to call Gemini API for concept explanations
 * Replace the getAIResponse function in sidebar.js with this
 */
async function explainConceptWithGemini(message, apiKey, settings = {}) {
  const url = `${GEMINI_API_CONFIG.baseUrl}${GEMINI_API_CONFIG.endpoints.generateContent}?key=${apiKey}`;
  
  // Build prompt based on user settings
  const style = settings.explanationStyle || 'moderate';
  const includeExamples = settings.includeExamples !== false;
  const useAnalogies = settings.useAnalogies !== false;
  
  const styleInstructions = {
    simple: 'Explain as if to a child (ages 8-12). Use very simple words and short sentences.',
    moderate: 'Explain clearly for a teenager (ages 13-18). Balance simplicity with accuracy.',
    detailed: 'Provide a comprehensive explanation for adults. Include technical details when relevant.'
  };
  
  const prompt = `You are an AI tutor helping people with ADHD understand complex concepts.

Explanation style: ${styleInstructions[style]}
${includeExamples ? 'Include practical examples.' : ''}
${useAnalogies ? 'Use analogies and metaphors to make concepts relatable.' : ''}

Question/Topic: "${message}"

Provide a clear, well-structured explanation:`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('No response generated');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// ============================================================================
// STEP 5: How to Integrate
// ============================================================================

/*
1. In background.js:
   - Replace the mockSimplification function with simplifyTextWithGemini
   - Update the simplifyTextAPI function to use the real API:

   async function simplifyTextAPI(text) {
     const result = await chrome.storage.local.get(['geminiApiKey']);
     if (!result.geminiApiKey) {
       throw new Error('API key not configured');
     }
     return await simplifyTextWithGemini(text, result.geminiApiKey);
   }

2. In sidebar.js:
   - Replace the getAIResponse function to use explainConceptWithGemini
   - Update error handling for API-specific errors

   async function getAIResponse(message) {
     const result = await new Promise((resolve) => {
       chrome.storage.local.get([
         'geminiApiKey',
         'explanationStyle',
         'responseLength',
         'includeExamples',
         'useAnalogies'
       ], resolve);
     });
     
     if (!result.geminiApiKey) {
       throw new Error('API key not configured. Please add your Gemini API key.');
     }
     
     return await explainConceptWithGemini(message, result.geminiApiKey, result);
   }

3. Test thoroughly:
   - Test with various text lengths
   - Handle rate limits (429 errors)
   - Handle network errors
   - Validate API responses
*/

// ============================================================================
// STEP 6: Error Handling
// ============================================================================

/**
 * Handle common API errors
 */
function handleGeminiError(error) {
  if (error.message.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  } else if (error.message.includes('401') || error.message.includes('403')) {
    return 'Invalid API key. Please check your API key in settings.';
  } else if (error.message.includes('400')) {
    return 'Invalid request. The text may be too long or contain unsupported characters.';
  } else if (!navigator.onLine) {
    return 'No internet connection. Please check your network.';
  } else {
    return `Error: ${error.message}`;
  }
}

// ============================================================================
// STEP 7: Best Practices
// ============================================================================

/*
Security:
- Never expose API keys in client-side code
- Store API keys securely using Chrome storage
- Validate all user inputs before sending to API

Performance:
- Implement request caching for repeated queries
- Add loading states and timeout handling
- Consider implementing request debouncing

User Experience:
- Show clear error messages
- Provide retry options for failed requests
- Display loading indicators during API calls
- Handle long response times gracefully

Cost Management:
- Track API usage to stay within quotas
- Implement client-side text length limits
- Consider adding usage warnings for users
*/

// ============================================================================
// STEP 8: Testing Without API Key
// ============================================================================

// The extension works with mock responses by default
// Real API integration is optional but recommended for production

// To test mock mode:
// 1. Don't enter an API key
// 2. The extension will use predefined mock responses
// 3. Great for development and testing UI/UX

// To test real API:
// 1. Get API key from Google AI Studio
// 2. Enter in the sidebar
// 3. Test with various queries
// 4. Monitor API usage in Google Cloud Console

// ============================================================================
// Additional Resources
// ============================================================================

/*
Official Documentation:
- Gemini API Docs: https://ai.google.dev/docs
- API Quickstart: https://ai.google.dev/tutorials/web_quickstart
- Safety Settings: https://ai.google.dev/docs/safety_setting_gemini

Community:
- Google AI Discord: https://discord.gg/google-ai
- Stack Overflow: Tag [google-gemini-api]

Rate Limits:
- Free tier: 60 requests per minute
- Check current limits: https://ai.google.dev/pricing
*/

// Export for use in other files (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GEMINI_API_CONFIG,
    simplifyTextWithGemini,
    explainConceptWithGemini,
    handleGeminiError
  };
}
