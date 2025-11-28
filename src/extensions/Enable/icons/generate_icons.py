"""
AccessNow Icon Generator
Generates all 4 required PNG icon files
Run with: python generate_icons.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """Create a single icon with the specified size"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle with gradient effect
    # For simplicity, using solid purple color
    color = (102, 126, 234, 255)  # #667eea
    
    # Draw rounded rectangle background
    radius = int(size * 0.2)
    draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=color)
    
    # Draw white circle in center
    center = size // 2
    circle_radius = int(size * 0.35)
    draw.ellipse(
        [(center - circle_radius, center - circle_radius),
         (center + circle_radius, center + circle_radius)],
        fill=(255, 255, 255, 255)
    )
    
    # Draw "AN" text
    try:
        # Try to use a system font
        font_size = int(size * 0.4)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    text = "AN"
    # Get text size using textbbox
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    text_x = (size - text_width) // 2
    text_y = (size - text_height) // 2 - int(size * 0.05)
    
    # Draw text in purple
    draw.text((text_x, text_y), text, fill=color, font=font)
    
    # Save the icon
    img.save(filename, 'PNG')
    print(f"✅ Created: {filename}")

def main():
    """Generate all icon sizes"""
    print("🎨 Generating AccessNow Icons...\n")
    
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Icon sizes needed
    sizes = [16, 32, 48, 128]
    
    # Generate each icon
    for size in sizes:
        filename = os.path.join(script_dir, f'icon{size}.png')
        create_icon(size, filename)
    
    print("\n✅ All icons generated successfully!")
    print(f"📁 Location: {script_dir}")
    print("\nNext steps:")
    print("1. Reload your extension in chrome://extensions/")
    print("2. The icons should now appear!")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ Error: PIL/Pillow not installed")
        print("\nTo install, run:")
        print("  pip install Pillow")
        print("\nOr use the HTML icon generator instead:")
        print("  Open: icons/generate-icons-standalone.html")
