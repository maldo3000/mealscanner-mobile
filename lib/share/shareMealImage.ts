import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Share a meal image via the system share sheet.
 * This is the universal share path that works across all apps.
 *
 * @param imageUri - Local file URI of the image to share
 * @returns Promise that resolves when sharing is complete or dismissed
 */
export async function shareMealImage(imageUri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(imageUri, {
    mimeType: 'image/png',
    dialogTitle: 'Share your meal',
    UTI: 'public.png', // iOS-specific Universal Type Identifier
  });
}

/**
 * Share to Instagram Stories (fallback implementation).
 * 
 * In v1, this uses the same system share sheet since direct Stories handoff
 * requires a Facebook App ID. The user can select Instagram Stories from
 * the share sheet.
 *
 * When/if you add a Facebook App ID, this function can be updated to use
 * the direct Stories URL scheme handoff.
 *
 * @param imageUri - Local file URI of the image to share
 * @returns Promise that resolves when sharing is complete or dismissed
 */
export async function shareToInstagramStories(imageUri: string): Promise<void> {
  // v1: Use same system share sheet as fallback
  // User manually selects Instagram Stories from the share options
  //
  // Future implementation with Facebook App ID would look like:
  // - iOS: Set pasteboard items and open instagram-stories://share?source_application=...
  // - Android: Use Intent with com.instagram.share.ADD_TO_STORY
  //
  await shareMealImage(imageUri);
}

/**
 * Check if Instagram is potentially available on this device.
 * Note: This is a best-effort check and may not be 100% accurate.
 */
export function isInstagramPotentiallyAvailable(): boolean {
  // On iOS/Android, we can't reliably check if Instagram is installed
  // without additional configuration (LSApplicationQueriesSchemes on iOS).
  // For now, always return true and let the share sheet handle it.
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
