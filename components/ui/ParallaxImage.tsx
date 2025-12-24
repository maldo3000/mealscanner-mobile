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
  childrenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

