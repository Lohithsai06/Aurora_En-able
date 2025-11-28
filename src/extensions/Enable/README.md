# AccessNow - ADHD Text Simplifier Chrome Extension

A Chrome extension designed to improve web accessibility for users with ADHD by simplifying complex text on any webpage. Features include text simplification, AI-powered concept explanations, and an intelligent chatbot assistant.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

## 🌟 Features

### 1. **Text Simplification**
- Right-click on any selected text to simplify it
- View original and simplified text side-by-side
- Copy simplified text with one click
- Works on any website

### 2. **AI Chatbot Sidebar**
- Explain complex concepts in simple terms
- Customizable explanation styles (Simple, Moderate, Detailed)
- API key management for Gemini API integration
- Chat history with export functionality
- Text-to-speech support for explanations

### 3. **User Preferences**
- Toggle simplification feature on/off
- Persistent settings using Chrome storage
- Usage statistics tracking
- Customizable AI response settings

### 4. **Accessibility First**
- Designed specifically for ADHD users
- Clear visual indicators
- Easy-to-use interface
- Keyboard shortcuts support

## 📋 Requirements

- Google Chrome (or any Chromium-based browser)
- Chrome version 88 or higher (for Manifest V3 support)
- (Optional) Gemini API key for AI chatbot functionality

## 🚀 Installation

### Option 1: Load Unpacked Extension (Development)

1. **Download or Clone this repository**
   ```bash
   git clone https://github.com/yourusername/accessnow-extension.git
   cd accessnow-extension
   ```

2. **Create Icon Files**
   - Navigate to the `icons/` folder
   - Create PNG files: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - See `icons/README.md` for guidance

3. **Open Chrome Extensions Page**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Or click Menu (⋮) → More Tools → Extensions

4. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

5. **Load the Extension**
   - Click "Load unpacked"
   - Select the extension directory (`Enable` folder)
   - The extension icon should appear in your toolbar

### Option 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once published.

## 🎯 Usage Guide

### Basic Text Simplification

1. **Enable the Feature**
   - Click the AccessNow extension icon
   - Ensure the toggle is ON (green status indicator)

2. **Simplify Text**
   - Select any text on a webpage
   - Right-click and choose "Simplify Text"
   - Wait for the modal to appear with results

3. **View Results**
   - Original text appears on the left (yellow background)
   - Simplified text appears on the right (green background)
   - Click "📋 Copy" to copy simplified text
   - Click "🤖 Explain with AI" to get detailed explanation

### Using the AI Chatbot

1. **Setup API Key**
   - Click the extension icon
   - Click "Open AI Chatbot" button
   - Or use keyboard shortcut: `Ctrl+Shift+E` (Windows) or `Cmd+Shift+E` (Mac)
   - Enter your Gemini API key
   - Click "Save API Key"

2. **Get Your API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Copy and paste into the extension

3. **Ask Questions**
   - Type any concept or question
   - Press Enter or click the send button (➤)
   - Wait for AI response
   - Use action buttons to copy or speak responses

4. **Customize Settings**
   - Click "⚙️ Settings" in the sidebar footer
   - Choose explanation style (Simple/Moderate/Detailed)
   - Set response length preferences
   - Enable/disable examples and analogies

### Managing Preferences

**Extension Popup:**
- Toggle simplification on/off
- View daily usage statistics
- Access chatbot sidebar
- Check feature status

**Storage:**
- All preferences persist across browser sessions
- Chat history is saved locally
- API key is stored securely in Chrome storage

## 📁 Project Structure

```
Enable/
├── manifest.json           # Extension manifest (Manifest V3)
├── background.js          # Service worker for background tasks
├── content.js             # Content script injected into web pages
├── content.css            # Styles for content script modal
├── popup.html             # Extension popup UI
├── popup.js               # Popup functionality
├── popup.css              # Popup styles
├── sidebar.html           # AI chatbot sidebar UI
├── sidebar.js             # Sidebar functionality
├── sidebar.css            # Sidebar styles
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## 🔧 Technical Details

### Manifest V3 Features

- **Service Worker**: Background script runs as a service worker
- **Content Scripts**: Injected into all web pages for text selection
- **Context Menus**: Right-click menu integration
- **Storage API**: Persistent user preferences
- **Side Panel API**: Dedicated sidebar for AI chatbot
- **Host Permissions**: Access to all URLs for universal text simplification

### API Integration

The extension is prepared for Gemini API integration:

**Current State:**
- Mock API responses for demonstration
- API key validation and storage
- Error handling for failed requests

**Future Integration:**
```javascript
// Replace mockSimplification in background.js with:
async function simplifyTextAPI(text) {
  const apiKey = await getStoredAPIKey();
  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Simplify this text for someone with ADHD: ${text}`
        }]
      }]
    })
  });
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

### Storage Schema

```javascript
{
  // Feature toggle
  simplificationEnabled: true,
  
  // API key
  geminiApiKey: "AIza...",
  
  // Usage statistics
  todayStats: {
    simplificationCount: 0,
    wordsSimplified: 0,
    date: "Thu Nov 28 2024"
  },
  
  // Chatbot settings
  explanationStyle: "moderate",    // simple | moderate | detailed
  responseLength: "medium",         // brief | medium | detailed
  includeExamples: true,
  useAnalogies: true,
  
  // Chat history
  chatHistory: [
    {
      type: "user",
      content: "...",
      timestamp: "..."
    }
  ],
  
  // Pending explanation from content script
  pendingExplanation: "..."
}
```

## 🎨 Customization

### Modify Simplification Logic

Edit `background.js` → `mockSimplification()` function:

```javascript
function mockSimplification(text) {
  // Add your custom simplification rules
  // Or integrate with actual AI API
}
```

### Change Color Scheme

Edit CSS files to match your branding:
- `popup.css` - Popup colors
- `sidebar.css` - Chatbot colors
- `content.css` - Modal colors

### Add New Features

1. Update `manifest.json` with new permissions
2. Add functionality to appropriate script files
3. Update UI components as needed

## 🐛 Troubleshooting

### Extension Not Loading
- Check that all icon files exist in `icons/` folder
- Verify manifest.json syntax
- Check Chrome console for errors (`chrome://extensions/`)

### Context Menu Not Appearing
- Ensure extension is enabled
- Verify host permissions in manifest
- Check background service worker status

### Simplification Not Working
- Open extension popup and check toggle is ON
- Verify background script is running
- Check browser console for errors (F12)

### API Key Issues
- Ensure API key starts with "AIza"
- Verify key is valid in Google AI Studio
- Check network tab for API request errors

### Chatbot Not Responding
- Verify API key is saved correctly
- Check browser console for errors
- Ensure internet connection is active

## 🔐 Privacy & Security

- **Local Storage Only**: All data stored locally in Chrome storage
- **No External Tracking**: No analytics or tracking scripts
- **API Key Security**: Keys stored in Chrome's secure storage
- **No Data Collection**: Extension doesn't collect or transmit user data
- **Permissions**: Only requests necessary permissions

## 🚧 Development Roadmap

- [ ] Integrate real Gemini API for text simplification
- [ ] Add support for Firefox and Edge
- [ ] Implement user authentication (Firebase - future)
- [ ] Add more simplification modes (Academic, Technical, ELI5)
- [ ] Support for multiple languages
- [ ] Dark mode theme
- [ ] Reading mode with focus highlights
- [ ] Browser sync for settings across devices
- [ ] Advanced statistics and insights
- [ ] Export simplified content as PDF

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **AccessNow Team** - Initial work and ADHD accessibility features

## 🙏 Acknowledgments

- Inspired by the need for better web accessibility
- Built with Manifest V3 for modern Chrome extensions
- Designed for users with ADHD and cognitive differences
- Gemini API for AI-powered explanations

## 📧 Support

For support, questions, or feedback:
- Open an issue on GitHub
- Email: support@accessnow.com
- Documentation: [Wiki](https://github.com/accessnow/adhd-helper/wiki)

## 📱 Screenshots

### Extension Popup
The main control panel for toggling features and viewing statistics.

### Text Simplification Modal
Side-by-side comparison of original and simplified text.

### AI Chatbot Sidebar
Interactive AI assistant for concept explanations.

---

**Made with ❤️ for the ADHD community**
