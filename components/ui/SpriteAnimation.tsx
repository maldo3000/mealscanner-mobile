import React, { useEffect, useState } from 'react';
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
  const totalFrames = frames.length;

  useEffect(() => {
    if (totalFrames === 0) return;

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
  }, [fps, totalFrames, loop]);

  if (totalFrames === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.animationContainer, { width, height }]}>
        <Image
          source={frames[currentFrameIndex]}
          style={[styles.image, { width, height }]}
          contentFit="contain"
          transition={0}
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

