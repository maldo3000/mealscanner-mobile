#!/usr/bin/env python3
"""
Generate MealScanner app icon
Creates a dark green rounded square with a light green magnifying glass and "M" letter
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# Colors based on description
# Dark green background - using a richer, darker green
DARK_GREEN = (20, 60, 35)  # Dark green background (RGB)
# Light/pale green (almost lime green) for magnifying glass
LIGHT_GREEN = (152, 251, 152)  # Pale green / lime green

def create_icon(size=1024, corner_radius=None):
    """Create the app icon with rounded corners"""
    if corner_radius is None:
        corner_radius = size * 0.22  # ~22% of size for rounded corners
    
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded square background
    draw.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=corner_radius,
        fill=DARK_GREEN
    )
    
    # Calculate magnifying glass dimensions
    # Lens should be prominent - about 45% of icon size
    lens_radius = size * 0.28
    lens_center_x = size * 0.48
    lens_center_y = size * 0.48
    
    # Draw magnifying glass lens (circle) with thick outline
    lens_bbox = [
        lens_center_x - lens_radius,
        lens_center_y - lens_radius,
        lens_center_x + lens_radius,
        lens_center_y + lens_radius
    ]
    
    # Draw lens outline (thick stroke for prominence)
    stroke_width = max(12, size // 50)
    draw.ellipse(lens_bbox, outline=LIGHT_GREEN, width=stroke_width)
    
    # Draw the letter "M" inside the lens - bold, sans-serif, perfectly centered
    # Try to load a bold sans-serif font
    font_size = int(lens_radius * 1.0)  # M should fill most of the lens
    font = None
    
    # Try various system fonts
    font_paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/HelveticaNeue-Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    
    for font_path in font_paths:
        try:
            font = ImageFont.truetype(font_path, font_size)
            break
        except:
            continue
    
    if font is None:
        # Fallback: create a bold default font
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            font = ImageFont.load_default()
    
    # Draw "M" centered in lens - perfectly inscribed
    text = "M"
    # Get text bounding box for proper centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the M perfectly in the lens
    text_x = lens_center_x - text_width / 2
    text_y = lens_center_y - text_height / 2 - bbox[1]  # Adjust for baseline
    
    draw.text((text_x, text_y), text, fill=LIGHT_GREEN, font=font)
    
    # Draw handle extending from bottom right of lens
    # Handle should point toward bottom right corner
    handle_length = size * 0.22
    handle_width = stroke_width * 1.2
    
    # Handle starts from bottom right of the circular lens
    # Calculate point on circle at 45 degrees (bottom right)
    angle = math.pi / 4  # 45 degrees
    handle_start_x = lens_center_x + lens_radius * math.cos(angle)
    handle_start_y = lens_center_y + lens_radius * math.sin(angle)
    
    # Handle extends toward bottom right corner at ~30 degree angle
    handle_angle = math.pi / 6  # ~30 degrees down from horizontal
    handle_end_x = handle_start_x + handle_length * math.cos(handle_angle)
    handle_end_y = handle_start_y + handle_length * math.sin(handle_angle)
    
    # Draw handle as a thick line
    draw.line(
        [(handle_start_x, handle_start_y), (handle_end_x, handle_end_y)],
        fill=LIGHT_GREEN,
        width=int(handle_width)
    )
    
    # Add rounded cap at the end of handle
    cap_radius = handle_width / 2
    draw.ellipse(
        [
            handle_end_x - cap_radius,
            handle_end_y - cap_radius,
            handle_end_x + cap_radius,
            handle_end_y + cap_radius
        ],
        fill=LIGHT_GREEN
    )
    
    return img

def main():
    """Generate all required icon files"""
    # Get the assets directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    assets_dir = os.path.join(project_root, 'assets', 'images')
    
    # Ensure directory exists
    os.makedirs(assets_dir, exist_ok=True)
    
    # Generate main icon (1024x1024 for Expo/App Store)
    print("Generating icon.png (1024x1024)...")
    icon = create_icon(1024)
    icon_path = os.path.join(assets_dir, 'icon.png')
    # Convert to RGB (no alpha channel) for App Store requirements
    if icon.mode == 'RGBA':
        rgb_icon = Image.new('RGB', icon.size, (255, 255, 255))
        rgb_icon.paste(icon, mask=icon.split()[3])
        rgb_icon.save(icon_path, 'PNG')
    else:
        icon.convert('RGB').save(icon_path, 'PNG')
    print(f"✓ Created {icon_path}")
    
    # Generate adaptive icon (same design, 1024x1024)
    print("Generating adaptive-icon.png (1024x1024)...")
    adaptive_icon = create_icon(1024)
    adaptive_icon_path = os.path.join(assets_dir, 'adaptive-icon.png')
    adaptive_icon.save(adaptive_icon_path, 'PNG')
    print(f"✓ Created {adaptive_icon_path}")
    
    # Generate splash icon (can be smaller, 200x200 as per config)
    print("Generating splash-icon.png (200x200)...")
    splash_icon = create_icon(200)
    splash_icon_path = os.path.join(assets_dir, 'splash-icon.png')
    splash_icon.save(splash_icon_path, 'PNG')
    print(f"✓ Created {splash_icon_path}")
    
    # Generate favicon (smaller, 64x64)
    print("Generating favicon.png (64x64)...")
    favicon = create_icon(64)
    favicon_path = os.path.join(assets_dir, 'favicon.png')
    favicon.save(favicon_path, 'PNG')
    print(f"✓ Created {favicon_path}")
    
    print("\n✅ All icons generated successfully!")
    print(f"Icons saved to: {assets_dir}")

if __name__ == '__main__':
    main()

