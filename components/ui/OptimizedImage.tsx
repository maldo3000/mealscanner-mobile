import { getHeroUrl, getThumbnailUrl } from '@/lib/imageUtils';
import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface OptimizedImageProps {
  source: { uri: string } | string | number; // number for require() local images
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

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'; // A neutral gray blur hash

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
  // Handle different source types: number (require), string (URL), or {uri: string}
  const imageSource = typeof source === 'number' 
    ? source // Local require() image
    : typeof source === 'string' 
      ? { uri: source } 
      : source;

  // Default placeholder for food/meal images
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
        recyclingKey={typeof imageSource === 'number' ? String(imageSource) : imageSource?.uri} // Helps with recycling in lists
      />
      {/* Fallback placeholder that shows while loading */}
      {!imageSource && (placeholder || defaultPlaceholder)}
    </View>
  );
}

// Thumbnail variant with optimized settings for small images
export function ThumbnailImage({
  source,
  style,
  containerStyle,
  placeholder,
}: Omit<OptimizedImageProps, 'priority' | 'transition' | 'contentFit'>) {
  // Handle local require() images directly, only process URLs
  const imageSource = typeof source === 'number'
    ? source // Local require() image - pass through directly
    : typeof source === 'string' 
      ? { uri: getThumbnailUrl(source) }
      : typeof source === 'object' && source?.uri
        ? { uri: getThumbnailUrl(source.uri) }
        : source; // Pass through as-is

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

// Hero image variant with optimized settings for large images
export function HeroImage({
  source,
  style,
  containerStyle,
  placeholder,
}: Omit<OptimizedImageProps, 'priority' | 'transition' | 'contentFit'>) {
  // Handle local require() images directly, only process URLs
  const imageSource = typeof source === 'number'
    ? source // Local require() image - pass through directly
    : typeof source === 'string' 
      ? { uri: getHeroUrl(source) }
      : typeof source === 'object' && source?.uri
        ? { uri: getHeroUrl(source.uri) }
        : source; // Pass through as-is

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
}); 