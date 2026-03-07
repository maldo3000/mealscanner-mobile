#!/usr/bin/env node
/**
 * Generate Android adaptive icon from source asset
 *
 * ANDROID ONLY - Reads assets/Android Icon.png and resizes it to 1024x1024
 * as adaptive-icon.png. No compositing; uses the exact source asset.
 * iOS uses ios-icon.jpg and is never touched.
 *
 * After running, execute: npx expo prebuild --clean
 * to regenerate native android mipmap resources. EAS Build uses the
 * prebuilt android/ folder, so prebuild must run before the icon appears.
 *
 * Run: node scripts/fix-adaptive-icon.js
 * Or:  npm run fix:adaptive-icon
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SOURCE_PATH = path.join(__dirname, '../assets/Android Icon.png');
const OUTPUT_PATH = path.join(__dirname, '../assets/images/adaptive-icon.png');
const SIZE = 1024;

async function fixAdaptiveIcon() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Source icon not found at ${SOURCE_PATH}`);
    process.exit(1);
  }

  console.log('Generating Android adaptive icon...');
  console.log(`  Source: ${SOURCE_PATH}`);
  console.log(`  Output: ${OUTPUT_PATH} (${SIZE}x${SIZE})`);

  if (process.platform !== 'darwin') {
    console.error('This script currently supports macOS only.');
    console.error('Use Preview or another image tool to resize the source icon to 1024x1024.');
    process.exit(1);
  }

  execFileSync('sips', ['-z', String(SIZE), String(SIZE), SOURCE_PATH, '--out', OUTPUT_PATH], {
    stdio: 'inherit',
  });

  console.log('Done. Run: npx expo prebuild --clean');
}

fixAdaptiveIcon().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
