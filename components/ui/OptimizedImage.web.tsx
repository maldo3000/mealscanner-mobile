import { getHeroUrl, getThumbnailUrl } from '@/lib/imageUtils';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface OptimizedImageProps {
  source: { uri: string } | string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  transition?: number;
  blurRadius?: number;
  placeholderContentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function OptimizedImage({
  source,
  style,
  containerStyle,
  placeholder,
  contentFit = 'cover',
  priority = 'normal',
  cachePolicy = 'memory-disk',
  transition = 200,
  blurRadius,
  placeholderContentFit = 'cover',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageSource = typeof source === 'string' ? { uri: source } : source;

  const defaultPlaceholder = (
    <View style={[styles.placeholderContainer, style]}>
      <IconSymbol name="fork.knife" size={32} color="#9CA3AF" />
    </View>
  );

  return (
    <View style={containerStyle}>
      <Image
        source={imageSource}
        style={style}
        placeholder={placeholder || blurhash}
        contentFit={contentFit}
        placeholderContentFit={placeholderContentFit}
        priority={priority}
        cachePolicy={cachePolicy}
        transition={transition}
        blurRadius={blurRadius}
        recyclingKey={imageSource.uri}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        // Web-specific optimizations
        {...(typeof window !== 'undefined' && {
          loading: priority === 'high' ? 'eager' : 'lazy',
          decoding: 'async',
          // Enable modern image formats
          style: {
            ...style,
            imageRendering: 'high-quality',
            objectFit: contentFit,
          } as any,
        })}
      />
      
      {/* Show fallback for errors */}
      {hasError && (placeholder || defaultPlaceholder)}
      
      {/* Web-specific loading indicator */}
      {typeof window !== 'undefined' && isLoading && (
        <View style={[styles.loadingOverlay, style]}>
          <View style={styles.loadingIndicator} />
        </View>
      )}
    </View>
  );
}

// Web-optimized thumbnail with additional performance features
export function ThumbnailImage({
  source,
  style,
  containerStyle,
  placeholder,
}: Omit<OptimizedImageProps, 'priority' | 'transition' | 'contentFit'>) {
  const imageSource = typeof source === 'string' 
    ? { uri: getThumbnailUrl(source) }
    : { uri: getThumbnailUrl(source.uri) };

  return (
    <OptimizedImage
      source={imageSource}
      style={style}
      containerStyle={containerStyle}
      placeholder={placeholder}
      contentFit="cover"
      priority="normal"
      transition={150}
      cachePolicy="memory-disk"
    />
  );
}

// Web-optimized hero image
export function HeroImage({
  source,
  style,
  containerStyle,
  placeholder,
}: Omit<OptimizedImageProps, 'priority' | 'transition' | 'contentFit'>) {
  const imageSource = typeof source === 'string' 
    ? { uri: getHeroUrl(source) }
    : { uri: getHeroUrl(source.uri) };

  return (
    <OptimizedImage
      source={imageSource}
      style={style}
      containerStyle={containerStyle}
      placeholder={placeholder}
      contentFit="cover"
      priority="high"
      transition={300}
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
}); 