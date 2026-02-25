import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { bgPrimary, glassBorder, glassSurface, neonGreen, textMuted } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { isInstagramPotentiallyAvailable, shareMealImage, shareToInstagramStories } from '@/lib/share/shareMealImage';
import type { MealShareData } from '@/lib/share/types';

import { MealShareCard, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './MealShareCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Preview scale - fit card in screen while maintaining aspect ratio
const PREVIEW_PADDING = 40;
const PREVIEW_MAX_WIDTH = SCREEN_WIDTH - PREVIEW_PADDING * 2;
const PREVIEW_MAX_HEIGHT = SCREEN_HEIGHT * 0.5;
const CARD_ASPECT_RATIO = SHARE_CARD_WIDTH / SHARE_CARD_HEIGHT;
const PREVIEW_HEIGHT = Math.min(PREVIEW_MAX_HEIGHT, PREVIEW_MAX_WIDTH / CARD_ASPECT_RATIO);
const PREVIEW_WIDTH = PREVIEW_HEIGHT * CARD_ASPECT_RATIO;
const PREVIEW_SCALE = PREVIEW_WIDTH / SHARE_CARD_WIDTH;

interface MealShareModalProps {
  visible: boolean;
  onClose: () => void;
  mealData: MealShareData;
}

/**
 * Modal for sharing a meal as an image to social media.
 *
 * Uses the visible preview card itself for capture — its inner View is
 * laid out at 1080x1920 (the full Stories resolution) and only scaled
 * down visually via CSS transform for the preview. captureRef captures
 * at the layout dimensions, producing a full-resolution image.
 *
 * This avoids all hidden-view / ref issues with Fabric (New Architecture),
 * where off-screen or zero-opacity Views don't receive native backing.
 */
export function MealShareModal({ visible, onClose, mealData }: MealShareModalProps) {
  const insets = useSafeAreaInsets();
  const shareCardRef = useRef<View>(null);
  const shareCardTargetRef = useRef<number | null>(null);
  const [isShareCardReady, setIsShareCardReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showMacros, setShowMacros] = useState(mealData.showStats ?? true);

  useEffect(() => {
    if (!visible) {
      shareCardTargetRef.current = null;
      setIsShareCardReady(false);
    }
  }, [visible]);

  const waitForShareCardTarget = useCallback(async (): Promise<number> => {
    const timeoutMs = 2000;
    const startMs = Date.now();

    while (!shareCardTargetRef.current && Date.now() - startMs < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const target = shareCardTargetRef.current;
    if (!target) {
      throw new Error('Share card not ready');
    }

    return target;
  }, []);

  /**
   * Capture the share card to a PNG file in cache.
   * Uses the visible preview card — it's already laid out at 1080x1920
   * and just scaled down for display, so captureRef produces full-res output.
   */
  const captureShareCard = useCallback(async (): Promise<string> => {
    setIsCapturing(true);

    try {
      // Wait for layout so we have a native target handle.
      // This avoids a race where the user taps Share before the view mounts.
      const target = await waitForShareCardTarget();

      // Brief delay to let any pending re-renders settle
      await new Promise(resolve => setTimeout(resolve, 300));

      const uri = await captureRef(target, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
      });

      return uri;
    } finally {
      setIsCapturing(false);
    }
  }, [waitForShareCardTarget]);

  /**
   * Handle universal share action.
   */
  const handleShare = useCallback(async () => {
    if (isSharing || isCapturing) return;
    setIsSharing(true);
    try {
      const imageUri = await captureShareCard();
      await shareMealImage(imageUri);
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Unable to share the image. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [captureShareCard, isSharing, isCapturing]);

  /**
   * Handle Instagram Stories share action.
   */
  const handleInstagramShare = useCallback(async () => {
    if (isSharing || isCapturing) return;
    setIsSharing(true);
    try {
      const imageUri = await captureShareCard();
      await shareToInstagramStories(imageUri);
    } catch (error) {
      console.error('Instagram share error:', error);
      Alert.alert('Share Failed', 'Unable to share to Instagram Stories. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [captureShareCard, isSharing, isCapturing]);

  const showInstagramButton = isInstagramPotentiallyAvailable();
  const isLoading = isCapturing || isSharing;
  const hasMacros = !!mealData.nutrition;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Meal</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <IconSymbol name="xmark" size={24} color={textMuted} />
            </TouchableOpacity>
          </View>

          {/* Preview Container */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.previewContainer}>
              <View style={styles.previewWrapper}>
                {/* Scaled preview — this is also the capture source.
                    The inner View is 1080x1920 in layout; the scale
                    transform only affects visual presentation. */}
                <View
                  style={[
                    styles.previewCard,
                    {
                      width: PREVIEW_WIDTH,
                      height: PREVIEW_HEIGHT,
                    },
                  ]}
                >
                  <View
                    ref={shareCardRef}
                    collapsable={false}
                    onLayout={(e) => {
                      // Store the native tag so captureRef can target it directly.
                      // Using the numeric target avoids ref flakiness under Fabric.
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                      const target = (e.nativeEvent as any)?.target as number | undefined;
                      if (typeof target === 'number') {
                        shareCardTargetRef.current = target;
                        setIsShareCardReady(true);
                      }
                    }}
                    style={{
                      width: SHARE_CARD_WIDTH,
                      height: SHARE_CARD_HEIGHT,
                      transform: [{ scale: PREVIEW_SCALE }],
                      transformOrigin: 'top left',
                    }}
                  >
                    <MealShareCard
                      mealName={mealData.mealName}
                      imageUrl={mealData.imageUrl}
                      description={mealData.description}
                      nutrition={mealData.nutrition}
                      tagOverride={mealData.tagOverride}
                      showStats={showMacros}
                      mealType={mealData.mealType}
                      createdAt={mealData.createdAt}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Options */}
            {hasMacros && (
              <View style={styles.optionsContainer}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Show nutrition info</Text>
                  <Switch
                    value={showMacros}
                    onValueChange={setShowMacros}
                    trackColor={{ false: glassSurface, true: neonGreen }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={glassSurface}
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Button
                variant="primary"
                fullWidth
                onPress={handleShare}
                disabled={isLoading || !isShareCardReady}
                style={isLoading ? styles.loadingButton : undefined}
                textStyle={isLoading ? styles.loadingButtonText : undefined}
                icon={
                  isLoading ? (
                    <SwirlingSpinner size="small" color="#000" />
                  ) : (
                    <IconSymbol name="square.and.arrow.up" size={20} color="#000" />
                  )
                }
              >
                {isLoading ? 'Preparing...' : 'Share'}
              </Button>

              {showInstagramButton && (
                <Button
                  variant="glass"
                  fullWidth
                  onPress={handleInstagramShare}
                  disabled={isLoading || !isShareCardReady}
                  style={styles.instagramButton}
                >
                  Share to Instagram Stories
                </Button>
              )}

              <Text style={styles.hintText}>
                The share sheet will open, and you can choose where to share your meal.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    color: '#FFFFFF',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: glassSurface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  previewWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: glassBorder,
    backgroundColor: bgPrimary,
  },
  previewCard: {
    overflow: 'hidden',
    borderRadius: 18,
  },
  optionsContainer: {
    backgroundColor: glassSurface,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  optionLabel: {
    ...TextStyles.body,
    color: '#FFFFFF',
  },
  actionsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  loadingButton: {
    opacity: 1,
  },
  loadingButtonText: {
    color: '#0A2012',
  },
  instagramButton: {
    borderWidth: 1,
    borderColor: glassBorder,
  },
  hintText: {
    ...TextStyles.caption,
    color: textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
