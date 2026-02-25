/**
 * AppBackground.tsx
 *
 * A code-rendered dark green background with film-grain texture and vignette.
 * Uses @shopify/react-native-skia for GPU-accelerated procedural noise.
 *
 * Features:
 * - Procedural noise (no tiling artifacts)
 * - Radial vignette overlay
 * - Static by default for performance (optional animated grain)
 * - Scales to any device size
 *
 * Usage:
 *   <AppBackground /> at the root of your app, positioned absolutely behind content
 */

import { Canvas, Fill, Shader, Skia, vec } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';

// ════════════════════════════════════════════════════════════════════════════
// ADJUSTABLE CONSTANTS - Tweak these to match the reference
// ════════════════════════════════════════════════════════════════════════════

/** 
 * Base background color - Rich forest green matching reference
 * This is the color at the CENTER (brightest point)
 * RGB values 0-255
 */
export const BASE_COLOR = { r: 18, g: 60, b: 42 }; // #123C2A - richer forest green

/**
 * Grain intensity (0.0 = none, 0.08 = heavy)
 * Reference has subtle but visible grain
 */
export const GRAIN_STRENGTH = 0.035;

/**
 * Grain scale - lower = finer grain, higher = coarser
 * Fine film-like grain
 */
export const GRAIN_SCALE = 1.8;

/**
 * Vignette darkness at corners (0.0 = none, 0.6 = very dark)
 * Reference has strong edge darkening
 */
export const VIGNETTE_STRENGTH = 0.45;

/**
 * Vignette falloff - how far the vignette extends inward
 * 0.0 = only corners, 1.0 = reaches center
 * Reference has vignette reaching fairly far in
 */
export const VIGNETTE_RADIUS = 0.70;

/**
 * Vignette softness - higher = softer gradient
 * Reference has smooth falloff
 */
export const VIGNETTE_SOFTNESS = 1.8;

/**
 * Seed for noise randomization
 * Change this to get a different static grain pattern
 */
export const NOISE_SEED = 12345.6789;

// ════════════════════════════════════════════════════════════════════════════
// SKSL SHADER SOURCE
// ════════════════════════════════════════════════════════════════════════════

/**
 * SKSL shader that runs on the GPU.
 *
 * How it works:
 * 1. Starts with a solid base color
 * 2. Generates procedural noise using a hash function (no texture sampling)
 * 3. Applies noise as luminance variation (film grain effect)
 * 4. Overlays a radial vignette (darkens edges)
 *
 * The noise is "static" because we use a fixed seed. For animated grain,
 * you would pass a time uniform and add it to the seed.
 */
const SHADER_SOURCE = `
uniform vec2 resolution;      // Canvas dimensions
uniform vec3 baseColor;       // RGB normalized (0-1)
uniform float grainStrength;  // Grain intensity
uniform float grainScale;     // Grain size (lower = finer)
uniform float vignetteStrength;
uniform float vignetteRadius;
uniform float vignetteSoftness;
uniform float seed;           // Random seed for noise variation

// ────────────────────────────────────────────────────────────────────────────
// Hash-based pseudo-random noise
// This generates procedural noise without any texture sampling.
// The hash function converts 2D coordinates into a pseudo-random value.
// ────────────────────────────────────────────────────────────────────────────

// Simple hash function (fast, good distribution)
float hash(vec2 p) {
    // Large prime-based hash for good randomness
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Multi-sample noise for more organic grain
float grain(vec2 uv, float scale, float seedOffset) {
    vec2 scaledUV = uv * scale + seedOffset;
    
    // Single-pass noise with slight variation
    float n1 = hash(scaledUV);
    float n2 = hash(scaledUV + 17.23);
    
    // Mix two noise samples for less uniform appearance
    return mix(n1, n2, 0.5);
}

// ────────────────────────────────────────────────────────────────────────────
// Vignette calculation
// Creates a radial darkening from center to edges.
// ────────────────────────────────────────────────────────────────────────────

float vignette(vec2 uv) {
    // Normalize UV to -1..1 range, centered
    vec2 centered = (uv - 0.5) * 2.0;
    
    // Calculate distance from center
    float dist = length(centered);
    
    // Apply vignette curve with adjustable parameters
    float vig = 1.0 - pow(dist * vignetteRadius, vignetteSoftness);
    
    // Clamp and scale by strength
    return 1.0 - (1.0 - clamp(vig, 0.0, 1.0)) * vignetteStrength;
}

// ────────────────────────────────────────────────────────────────────────────
// Main shader entry point
// ────────────────────────────────────────────────────────────────────────────

vec4 main(vec2 fragCoord) {
    // Normalize coordinates to 0..1 range
    vec2 uv = fragCoord / resolution;
    
    // 1. Start with base color
    vec3 color = baseColor;
    
    // 2. Generate film grain
    // We use pixel coordinates (not normalized UV) for consistent grain size
    float grainValue = grain(fragCoord, 1.0 / grainScale, seed);
    
    // Convert noise from 0..1 to centered range (-0.5..0.5)
    // This creates both lighter and darker variations
    grainValue = (grainValue - 0.5) * 2.0;
    
    // Apply grain as luminance variation
    color += vec3(grainValue * grainStrength);
    
    // 3. Apply vignette
    float vignetteValue = vignette(uv);
    color *= vignetteValue;
    
    // 4. Ensure values stay in valid range
    color = clamp(color, vec3(0.0), vec3(1.0));
    
    return vec4(color, 1.0);
}
`;

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ════════════════════════════════════════════════════════════════════════════

interface AppBackgroundProps {
  /** Override base color (RGB 0-255) */
  baseColor?: { r: number; g: number; b: number };
  /** Override grain strength (0.0–0.1) */
  grainStrength?: number;
  /** Override grain scale */
  grainScale?: number;
  /** Override vignette strength (0.0–0.5) */
  vignetteStrength?: number;
  /** Override vignette radius (0.0–1.0) */
  vignetteRadius?: number;
  /** Override vignette softness */
  vignetteSoftness?: number;
  /** Random seed for noise pattern */
  seed?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function AppBackground({
  baseColor = BASE_COLOR,
  grainStrength = GRAIN_STRENGTH,
  grainScale = GRAIN_SCALE,
  vignetteStrength = VIGNETTE_STRENGTH,
  vignetteRadius = VIGNETTE_RADIUS,
  vignetteSoftness = VIGNETTE_SOFTNESS,
  seed = NOISE_SEED,
}: AppBackgroundProps) {
  const { width, height } = useWindowDimensions();

  // On Android, skip the expensive GPU shader entirely and use a plain solid
  // background. The Skia shader with procedural noise + vignette causes
  // significant frame drops on most Android devices.
  if (IS_ANDROID) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})` },
        ]}
        pointerEvents="none"
      />
    );
  }

  // Compile shader once (memoized) — iOS / web only
  const runtimeEffect = useMemo(() => {
    try {
      const effect = Skia.RuntimeEffect.Make(SHADER_SOURCE);
      if (!effect) {
        console.warn('[AppBackground] Failed to compile shader');
      }
      return effect;
    } catch (error) {
      console.warn('[AppBackground] Shader compilation threw:', error);
      return null;
    }
  }, []);

  // Create uniforms object (memoized based on props)
  const uniforms = useMemo(() => {
    if (!runtimeEffect) return null;

    return {
      resolution: vec(width, height),
      // Normalize RGB from 0-255 to 0-1 for shader
      // vec3 uniforms should be passed as arrays [r, g, b]
      baseColor: [baseColor.r / 255, baseColor.g / 255, baseColor.b / 255],
      grainStrength,
      grainScale,
      vignetteStrength,
      vignetteRadius,
      vignetteSoftness,
      seed,
    };
  }, [
    runtimeEffect,
    width,
    height,
    baseColor,
    grainStrength,
    grainScale,
    vignetteStrength,
    vignetteRadius,
    vignetteSoftness,
    seed,
  ]);

  // Fallback if shader fails to compile
  if (!runtimeEffect || !uniforms) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})` },
        ]}
        pointerEvents="none"
      />
    );
  }

  return (
    <Canvas style={styles.container} pointerEvents="none">
      <Fill>
        <Shader source={runtimeEffect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
});

export default AppBackground;
