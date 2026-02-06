import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    PixelRatio,
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
 * Renders a preview of the share card and provides buttons to:
 * - Share via the system share sheet (universal)
 * - Share to Instagram Stories (uses share sheet in v1)
 */
export function MealShareModal({ visible, onClose, mealData }: MealShareModalProps) {
  const insets = useSafeAreaInsets();
  const shareCardRef = useRef<View>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showMacros, setShowMacros] = useState(mealData.showStats ?? true);

  /**
   * Capture the share card to a PNG file in cache.
   */
  const captureShareCard = useCallback(async (): Promise<string> => {
    if (!shareCardRef.current) {
      throw new Error('Share card ref not available');
    }

    setIsCapturing(true);

    try {
      // Calculate dimensions accounting for pixel ratio
      const pixelRatio = PixelRatio.get();
      const targetWidth = SHARE_CARD_WIDTH / pixelRatio;
      const targetHeight = SHARE_CARD_HEIGHT / pixelRatio;

      // Capture the full-size card (rendered offscreen)
      // The tmpfile result already creates a usable temp file
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: targetWidth,
        height: targetHeight,
      });

      return uri;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  /**
   * Handle universal share action.
   */
  const handleShare = useCallback(async () => {
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
  }, [captureShareCard]);

  /**
   * Handle Instagram Stories share action.
   */
  const handleInstagramShare = useCallback(async () => {
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
  }, [captureShareCard]);

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
                {/* Scaled preview of the share card */}
                <View
                  style={[
                    styles.previewCard,
                    {
                      width: PREVIEW_WIDTH,
                      height: PREVIEW_HEIGHT,
                      transform: [{ scale: 1 }],
                    },
                  ]}
                >
                  <View
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
                disabled={isLoading}
                icon={
                  isLoading ? (
                    <ActivityIndicator size="small" color="#000" />
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
                  disabled={isLoading}
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

        {/* Hidden full-size card for capture */}
        <View style={styles.offscreenContainer} pointerEvents="none">
          <View ref={shareCardRef} collapsable={false}>
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
  offscreenContainer: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
});
