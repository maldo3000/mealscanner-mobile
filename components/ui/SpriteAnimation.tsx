import React, { useEffect, useState, useRef } from 'react';
import { ImageSourcePropType, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

interface SpriteAnimationProps {
  frames: ImageSourcePropType[];
  fps?: number; // Frames per second
  loop?: boolean; // Whether to loop the animation
  style?: ViewStyle;
  width?: number;
  height?: number;
}

/**
 * Reusable sprite animation component that cycles through a series of image frames.
 * Prefetches all frames before starting animation for smooth playback.
 * Uses setInterval for precise frame timing control.
 * 
 * @example
 * ```tsx
 * <SpriteAnimation
 *   frames={[frame1, frame2, frame3]}
 *   fps={12}
 *   loop={true}
 *   width={200}
 *   height={200}
 * />
 * ```
 */
export function SpriteAnimation({
  frames,
  fps = 12,
  loop = true,
  style,
  width = 200,
  height = 200,
}: SpriteAnimationProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const totalFrames = frames.length;
  const hasPreloaded = useRef(false);

  // Prefetch all frames before starting animation
  useEffect(() => {
    if (totalFrames === 0 || hasPreloaded.current) return;
    
    hasPreloaded.current = true;
    
    const prefetchFrames = async () => {
      try {
        // Prefetch all frames in parallel
        await Promise.all(
          frames.map(frame => Image.prefetch(frame))
        );
      } catch (error) {
        // Continue even if prefetch fails - images will load on demand
        console.warn('SpriteAnimation: Some frames failed to prefetch', error);
      }
      setIsReady(true);
    };

    prefetchFrames();
  }, [frames, totalFrames]);

  // Start animation only after frames are prefetched
  useEffect(() => {
    if (totalFrames === 0 || !isReady) return;

    const frameDuration = 1000 / fps; // Duration per frame in milliseconds
    let intervalId: NodeJS.Timeout;
    let frame = 0;

    const animate = () => {
      frame++;
      if (frame >= totalFrames) {
        if (loop) {
          frame = 0; // Reset to start for looping
        } else {
          frame = totalFrames - 1; // Stay on last frame
          if (intervalId) {
            clearInterval(intervalId);
          }
          return;
        }
      }
      setCurrentFrameIndex(frame);
    };

    // Start animation
    intervalId = setInterval(animate, frameDuration);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fps, totalFrames, loop, isReady]);

  if (totalFrames === 0) {
    return null;
  }

  // Show first frame while prefetching (prevents empty space)
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.animationContainer, { width, height }]}>
        <Image
          source={frames[currentFrameIndex]}
          style={[styles.image, { width, height }]}
          contentFit="contain"
          transition={0}
          cachePolicy="memory"
          priority="high"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'contain',
  },
});

