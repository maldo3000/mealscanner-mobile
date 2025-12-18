import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { bgPrimary } from '@/constants/Colors';
import { HeroImage } from './OptimizedImage';

interface ParallaxImageProps extends ViewProps {
  source: { uri: string } | string | number;
  height?: number;
  children?: React.ReactNode;
}

export function ParallaxImage({
  source,
  height = 400,
  children,
  style,
  ...props
}: ParallaxImageProps) {
  const imageSource = typeof source === 'number' 
    ? source 
    : typeof source === 'string'
    ? source
    : source.uri;

  return (
    <View style={[styles.container, { height }, style]} {...props}>
      <HeroImage
        source={imageSource}
        style={[styles.image, { height }]}
      />
      
      {/* Gradient overlay using multiple views */}
      <View style={styles.gradientOverlay} />
      <View style={styles.gradientOverlayBottom} />

      {children && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'stretch',
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  gradientOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '15%', // Further reduced to show more of the image
    backgroundColor: bgPrimary,
    opacity: 0.3, // Further reduced for lighter overlay
  },
  childrenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

