# AccessNow Extension Icons

This directory contains the icon generator for your extension.

## ⚡ Quick Start (Easiest Method)

### **Option 1: Use the Built-in Generator (Recommended)**

1. **Open the generator:**
   - Double-click: `generate-icons-standalone.html`
   - Or right-click → Open with → Chrome

2. **Download the icons:**
   - Click "📥 Download All Icons"
   - 4 PNG files will download to your Downloads folder
   - Files: icon16.png, icon32.png, icon48.png, icon128.png

3. **Move the icons:**
   - Move all 4 PNG files from Downloads to this `icons/` folder
   - Replace any existing files

4. **Reload extension:**
   - Go to `chrome://extensions/`
   - Find "AccessNow - ADHD Text Simplifier"
   - Click the reload icon (🔄)
   - Done! ✅

---

## 🎨 Icon Design

The generated icons feature:
- **Purple gradient background** (#667eea → #764ba2)
- **"AN" letters** in white circle (AccessNow branding)
- **Rounded corners** for modern look
- **4 sizes** for different display contexts

### Icon Sizes:
- `icon16.png` - 16x16 pixels (toolbar, small displays)
- `icon32.png` - 32x32 pixels (toolbar, retina displays)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store, large displays)

---

## 🔧 Alternative Methods

### **Option 2: Online Tools**

1. **Favicon.io** (https://favicon.io/favicon-generator/)
   - Enter text: "AN"
   - Pick background: #667eea (purple)
   - Download and extract
   - Rename files to match required names

2. **Canva** (https://www.canva.com/)
   - Create custom icons with your design
   - Export as PNG in required sizes

### **Option 3: Use Your Own Images**

If you have custom icon images:

1. Create or find a square image (PNG format)
2. Resize to 4 different sizes: 16x16, 32x32, 48x48, 128x128
3. Name them: icon16.png, icon32.png, icon48.png, icon128.png
4. Place all files in this `icons/` folder

### **Option 4: Command Line (ImageMagick)**

If you have ImageMagick installed:

```bash
convert -size 16x16 xc:purple icon16.png
convert -size 32x32 xc:purple icon32.png
convert -size 48x48 xc:purple icon48.png
convert -size 128x128 xc:purple icon128.png
```

---

## ✅ Verify Icons Work

After adding icons:

1. Load/reload extension in Chrome
2. Extension icon should appear in toolbar (not default puzzle piece)
3. Check `chrome://extensions/` - your extension card should show the icon
4. Icons should appear crisp at all sizes

---

## 🐛 Troubleshooting

**Icons not showing?**
- Make sure all 4 PNG files are in this `icons/` folder
- Verify filenames match exactly: icon16.png, icon32.png, icon48.png, icon128.png
- Reload the extension in `chrome://extensions/`
- Hard refresh: Remove and re-add the extension

**Generator not working?**
- Make sure you're opening in Chrome or another modern browser
- Allow multiple file downloads when prompted
- Check Downloads folder for the PNG files

**Icons look blurry?**
- Ensure you're using the correct file sizes
- Don't resize PNG files manually (use the generator)
- Higher DPI displays use larger icon sizes automatically

---

## 📝 Files in This Folder

- `generate-icons-standalone.html` - Icon generator (open this!)
- `README.md` - This file
- `icon16.png` - 16x16 icon (generate this)
- `icon32.png` - 32x32 icon (generate this)
- `icon48.png` - 48x48 icon (generate this)
- `icon128.png` - 128x128 icon (generate this)

---

**Ready to generate?** Double-click `generate-icons-standalone.html` and follow the prompts! 🎨
