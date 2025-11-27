/**
 * OpenRouter API Integration for En-able Accessibility App
 * Uses DeepSeek R1:free model for AI-powered image analysis and text processing
 */

/// <reference types="vite/client" />

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: string }>;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Send a request to OpenRouter API with optional image
 * @param promptText - The text prompt/question for the AI
 * @param base64Image - Optional base64-encoded image (with or without data URI prefix)
 * @returns AI response text
 */
export async function sendToOpenRouter(
  promptText: string,
  base64Image?: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const apiUrl = import.meta.env.VITE_OPENROUTER_URL;
  const model = import.meta.env.VITE_OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.');
  }

  if (!apiUrl) {
    throw new Error('OpenRouter URL not configured. Please add VITE_OPENROUTER_URL to your .env file.');
  }

  if (!model) {
    throw new Error('OpenRouter model not configured. Please add VITE_OPENROUTER_MODEL to your .env file.');
  }

  try {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: 'You are an AI accessibility assistant helping blind and visually impaired users. Provide clear, concise, and helpful responses optimized for text-to-speech output.'
      }
    ];

    // Build user message with or without image
    if (base64Image) {
      // Ensure base64 image has proper data URI format
      const imageDataUri = base64Image.startsWith('data:')
        ? base64Image
        : `data:image/png;base64,${base64Image}`;

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: imageDataUri
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: promptText
      });
    }

    const requestBody: OpenRouterRequest = {
      model,
      messages
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://en-able.app',
        'X-Title': 'En-able Accessibility App'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenRouter API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    throw error;
  }
}

/**
 * Convert File/Blob to base64 string
 * @param file - File or Blob object
 * @returns Base64 encoded string with data URI prefix
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Analyze an image for blind users - extracts text, colors, charts, and provides summary
 * @param file - Image file to analyze
 * @returns Comprehensive analysis suitable for text-to-speech
 */
export async function analyzeImageForBlind(file: File): Promise<string> {
  const base64Image = await fileToBase64(file);

  const prompt = `
You are assisting a blind user who has uploaded an image. Provide a comprehensive analysis in the following format:

1. **Visual Description**: Briefly describe what the image shows (people, objects, scene, setting).

2. **Text Extraction (OCR)**: Extract ALL readable text from the image. Include:
   - Headings, titles, labels
   - Paragraphs and body text
   - Numbers, dates, prices
   - Signs, captions, or watermarks
   - If no text found, say "No text detected."

3. **Color Analysis**: Identify the dominant colors and describe the overall color scheme (bright/dark, warm/cool tones).

4. **Charts & Graphs**: If the image contains charts, graphs, tables, or data visualizations:
   - Identify the type (bar chart, line graph, pie chart, table, etc.)
   - Describe what data it represents
   - Mention key values, trends, or comparisons
   - If no charts found, say "No charts or graphs detected."

5. **Summary for Blind User**: Provide a clear, concise spoken summary that combines all the above information in a natural, easy-to-understand way suitable for text-to-speech output.

Be thorough, accurate, and conversational. This summary will be read aloud to help the user understand the image completely.
`;

  return await sendToOpenRouter(prompt, base64Image);
}
