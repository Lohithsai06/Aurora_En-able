# AI Summarization API Setup

## Free Option: Hugging Face (Recommended)

### Get Your FREE API Key:
1. Go to https://huggingface.co/
2. Sign up for a free account
3. Go to Settings → Access Tokens
4. Create a new token (select "Read" access)
5. Copy the token (starts with `hf_...`)

### Add API Key to Extension:
1. Open `background.js`
2. Find line: `const HF_API_KEY = "hf_placeholder";`
3. Replace `hf_placeholder` with your actual API key
4. Reload extension

### Model Used:
- **facebook/bart-large-cnn** - Free tier, excellent for summarization
- Handles up to 1024 tokens
- Generates concise summaries automatically

---

## Alternative: OpenAI (Paid but better quality)

If you want even better summaries, you can use OpenAI GPT:

```javascript
// Replace the generateSummary function with:
async function generateSummary(transcript) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_OPENAI_API_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Summarize this video transcript in 3-4 sentences:\n\n${transcript}`
      }],
      max_tokens: 150
    })
  });
  
  const result = await response.json();
  return result.choices[0].message.content;
}
```

---

## Current Fallback
If no API key is configured, the extension uses an **improved extractive summarization**:
- Selects key sentences from beginning, middle, and end
- Shows sentence count
- Works offline, no API needed

The extension will automatically work with the fallback method until you add an API key!
