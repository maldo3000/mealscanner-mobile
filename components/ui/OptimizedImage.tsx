import { getHeroUrl, getThumbnailUrl } from '@/lib/imageUtils';
import { Image } from 'expo-image';
import React from 'react';
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
  const imageSource = typeof source === 'string' ? { uri: source } : source;

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
        recyclingKey={imageSource.uri} // Helps with recycling in lists
      />
      {/* Fallback placeholder that shows while loading */}
      {!imageSource.uri && (placeholder || defaultPlaceholder)}
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

// Hero image variant with optimized settings for large images
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
}); 