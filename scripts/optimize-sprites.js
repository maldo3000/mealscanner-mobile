#!/usr/bin/env node
/**
 * Sprite Optimization Script
 * 
 * Resizes and converts sprite frames to WebP format for faster loading.
 * Run: node scripts/optimize-sprites.js
 * 
 * Requires: npm install sharp --save-dev
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../assets/images/loading-animation');
const OUTPUT_DIR = path.join(__dirname, '../assets/images/loading-animation-optimized');

// Target size for @2x Retina displays (display size × 2)
// LoadingScreen uses 320x320, onboarding uses 340x340
// So we need 680x680 for crisp @2x rendering
const TARGET_WIDTH = 680;
const TARGET_HEIGHT = 680;
const WEBP_QUALITY = 95;

async function optimizeSprites() {
  console.log('🥗 Sprite Optimization Script');
  console.log('━'.repeat(50));
  
  // Check if input directory exists
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }

  // Get all PNG files
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();

  if (files.length === 0) {
    console.error('❌ No PNG files found in input directory');
    process.exit(1);
  }

  console.log(`📊 Found ${files.length} PNG files to optimize`);
  console.log(`📐 Target size: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
  console.log(`🎨 WebP quality: ${WEBP_QUALITY}%`);
  console.log('');

  let totalInputSize = 0;
  let totalOutputSize = 0;

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputFile = file.replace('.png', '.webp');
    const outputPath = path.join(OUTPUT_DIR, outputFile);

    const inputStats = fs.statSync(inputPath);
    totalInputSize += inputStats.size;

    try {
      await sharp(inputPath)
        .resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);

      const outputStats = fs.statSync(outputPath);
      totalOutputSize += outputStats.size;

      const savings = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);
      console.log(`✅ ${file} → ${outputFile} (${formatBytes(inputStats.size)} → ${formatBytes(outputStats.size)}, -${savings}%)`);
    } catch (error) {
      console.error(`❌ Failed to optimize ${file}: ${error.message}`);
    }
  }

  console.log('');
  console.log('━'.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Input:  ${formatBytes(totalInputSize)} (${files.length} files)`);
  console.log(`   Output: ${formatBytes(totalOutputSize)} (${files.length} files)`);
  console.log(`   Saved:  ${formatBytes(totalInputSize - totalOutputSize)} (${((1 - totalOutputSize / totalInputSize) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('✨ Done! Update your imports to use the optimized files:');
  console.log(`   require('../assets/images/loading-animation-optimized/ezgif-frame-001.webp')`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

optimizeSprites().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
