#!/usr/bin/env node
/**
 * Fix Android adaptive icon for circular mask
 *
 * ANDROID ONLY - Reads the clean source icon from assets/Android Icon.png
 * and produces a safe-zone-compliant adaptive-icon.png for Android.
 * iOS uses ios-icon.jpg and is never touched.
 *
 * Android applies a circular mask to adaptive icons. The safe zone is the
 * inner 66/108 (~61%) of the canvas. Content outside this zone may be clipped
 * depending on the launcher. This script scales the source icon into that
 * safe zone and fills the outer area with a matching solid color.
 *
 * Run: node scripts/fix-adaptive-icon.js
 * Or:  npm run fix:adaptive-icon
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_PATH = path.join(__dirname, '../assets/Android Icon.png');
const OUTPUT_PATH = path.join(__dirname, '../assets/images/adaptive-icon.png');

const SAFE_ZONE_RATIO = 66 / 108;
const SIZE = 1024;
const FOREGROUND_SIZE = Math.round(SIZE * SAFE_ZONE_RATIO);

// Averaged from the source icon's edge pixels to blend with its textured background
const BACKGROUND = { r: 200, g: 219, b: 102, alpha: 1 };

async function fixAdaptiveIcon() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Source icon not found at ${SOURCE_PATH}`);
    process.exit(1);
  }

  console.log('Fixing Android adaptive icon (iOS unchanged)...');
  console.log(`  Source: ${SOURCE_PATH}`);
  console.log(`  Scaling foreground to ${FOREGROUND_SIZE}px (safe zone)`);

  const resizedForeground = await sharp(SOURCE_PATH)
    .resize(FOREGROUND_SIZE, FOREGROUND_SIZE, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: resizedForeground, gravity: 'center' }])
    .png()
    .toFile(OUTPUT_PATH);

  console.log(`Updated ${OUTPUT_PATH} (Android only)`);
  console.log('  Rebuild Android to see the change.');
}

fixAdaptiveIcon().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
