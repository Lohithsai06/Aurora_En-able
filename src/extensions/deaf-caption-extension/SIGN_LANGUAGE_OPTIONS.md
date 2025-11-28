# Sign Language Conversion Options

## Free Options for Converting Text to Sign Language

### 1. **Sign Language GIF APIs (FREE)**
- **Signing Savvy API** - Limited free tier
  - Provides ASL animations for common words
  - URL: https://www.signingsavvy.com/
  
- **HandSpeak** - Free dictionary
  - ASL video dictionary
  - Can embed videos for common phrases

### 2. **Open Source Solutions**

#### **SiGML (Sign Gesture Markup Language)**
- Free and open source
- Converts text to sign language animations
- Uses avatar-based signing
- GitHub: https://github.com/frocher/sigml-avatar

#### **JASigning**
- Java-based signing avatar
- Free to use
- Supports multiple sign languages

### 3. **Integration Approach for This Extension**

```javascript
// Example: Add to content.js after receiving caption
async function convertToSignLanguage(text) {
  // Option 1: Use Signing Savvy embeds
  const words = text.split(' ');
  const signUrls = words.map(word => 
    `https://www.signingsavvy.com/search/${encodeURIComponent(word)}`
  );
  
  // Option 2: Use local ASL dictionary (requires building)
  // Download ASL GIF database and match words
  
  // Option 3: Show fingerspelling for unknown words
  return fingerspellText(text);
}

function fingerspellText(text) {
  // Map each letter to ASL fingerspelling image
  const aslAlphabet = {
    'a': 'url_to_a.gif',
    'b': 'url_to_b.gif',
    // ... etc
  };
  
  return text.toLowerCase().split('').map(char => 
    aslAlphabet[char] || char
  );
}
```

### 4. **Recommended FREE Implementation**

1. **Build local ASL dictionary** (one-time setup)
   - Download free ASL GIF pack from HandSpeak
   - Store 1000 most common words as local assets
   - Map captions to stored GIFs

2. **Fingerspelling fallback**
   - For unknown words, show ASL alphabet fingerspelling
   - Much slower but covers all text

3. **Add sign language toggle to sidebar**
   ```javascript
   const signToggle = document.createElement("button");
   signToggle.textContent = "🤟 Show Sign Language";
   signToggle.onclick = () => {
     showSignLanguageMode = !showSignLanguageMode;
     updateSidebar();
   };
   ```

### 5. **Limitations**
- **No free real-time AI sign language generation** exists
- Paid options: Sign.MT (€€€), Signapse (enterprise)
- Best free approach: Pre-recorded sign videos for common words + fingerspelling

### 6. **Best Hybrid Approach**
1. Caption text shows immediately (current functionality) ✅
2. Button to "Translate to ASL" for important sections
3. Shows combination of:
   - Pre-recorded signs for known words
   - Fingerspelling for proper nouns/rare words
   - Text overlay for context

Would you like me to implement a basic ASL dictionary system with the most common 100-500 words?
