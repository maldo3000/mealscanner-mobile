/**
 * Image optimization utilities for better performance and quality
 */

export interface ImageSizeConfig {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Optimizes Supabase storage URLs for better performance
 * This could be extended to use image transformation services
 */
export function optimizeImageUrl(
  originalUrl: string,
  config: ImageSizeConfig = {}
): string {
  if (!originalUrl) return originalUrl;
  
  // For now, return the original URL
  // In the future, this could integrate with:
  // - Supabase image transformations (when available)
  // - Cloudinary
  // - Vercel Image Optimization
  // - Or other CDN services
  
  // If using a service like Cloudinary, you might do:
  // return originalUrl.replace('/upload/', `/upload/w_${width},h_${height},q_auto,f_auto/`);
  
  return originalUrl;
}

/**
 * Generates optimized URLs for different use cases
 */
export const ImageSizes = {
  thumbnail: { width: 300, height: 300, quality: 80 },
  medium: { width: 600, height: 600, quality: 85 },
  large: { width: 1200, height: 1200, quality: 90 },
  hero: { width: 800, height: 400, quality: 90 },
} as const;

/**
 * Get optimized URL for thumbnail use
 */
export function getThumbnailUrl(originalUrl: string): string {
  return optimizeImageUrl(originalUrl, ImageSizes.thumbnail);
}

/**
 * Get optimized URL for hero images
 */
export function getHeroUrl(originalUrl: string): string {
  return optimizeImageUrl(originalUrl, ImageSizes.hero);
}

/**
 * Get optimized URL for medium size images
 */
export function getMediumUrl(originalUrl: string): string {
  return optimizeImageUrl(originalUrl, ImageSizes.medium);
}

/**
 * Preload images for better perceived performance (web only)
 */
export async function preloadImages(urls: string[]): Promise<void> {
  // Only works on web
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return;
  }
  
  const promises = urls.map(url => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
  });
  
  try {
    await Promise.all(promises);
  } catch (error) {
    console.warn('Some images failed to preload:', error);
  }
}

/**
 * Create blurhash-style placeholder data URI (web only)
 */
export function createPlaceholderDataUri(
  width: number = 20,
  height: number = 20
): string {
  // Only works on web
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }
  
  try {
    // Simple gray gradient placeholder
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Create a simple gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  } catch (error) {
    console.warn('Failed to create placeholder data URI:', error);
    return '';
  }
} 