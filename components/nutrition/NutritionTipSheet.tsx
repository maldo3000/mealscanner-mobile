/**
 * NutritionTipSheet
 * Bottom sheet that shows only today's tip (headline + details).
 */

import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
    type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/IconSymbol';
import type { NutritionTip } from '@/constants/NutritionTips';
import { Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';

const TipIcon = require('@/assets/images/mealscanner-tip.png');

interface NutritionTipSheetProps {
  tip: NutritionTip;
  onClose: () => void;
}

export const NutritionTipSheet = forwardRef<BottomSheet, NutritionTipSheetProps>(
  ({ tip, onClose }, ref) => {
    const { tokens, accentAlpha, withAlpha } = useTheme();
    const insets = useSafeAreaInsets();

    // Account for floating tab bar: height 72 + bottom position (34 iOS / 24 Android)
    const TAB_BAR_HEIGHT = 72;
    const TAB_BAR_BOTTOM = Platform.select({ ios: 34, default: 24 });
    const bottomSpacerHeight = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM;

    const snapPoints = useMemo(() => ['75%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      []
    );

    const markdownStyles = useMemo(
      () =>
        StyleSheet.create({
          body: {
            color: tokens.textPrimary,
            fontSize: 14,
            lineHeight: 22,
          },
          heading1: {
            color: tokens.textPrimary,
            fontSize: 22,
            fontWeight: '800',
            marginTop: Spacing.lg,
            marginBottom: Spacing.sm,
            lineHeight: 28,
          },
          heading2: {
            color: tokens.accent,
            fontSize: 16,
            fontWeight: '700',
            marginTop: Spacing.lg,
            marginBottom: Spacing.sm,
            lineHeight: 22,
          },
          heading3: {
            color: tokens.textPrimary,
            fontSize: 14,
            fontWeight: '700',
            marginTop: Spacing.md,
            marginBottom: Spacing.xs,
            lineHeight: 20,
          },
          paragraph: {
            marginBottom: Spacing.md,
          },
          list_item: {
            color: tokens.textPrimary,
            marginBottom: Spacing.xs,
          },
          bullet_list: {
            marginBottom: Spacing.md,
          },
          strong: {
            fontWeight: '800',
          },
          link: {
            color: tokens.accent,
            textDecorationLine: 'underline',
          },
          hr: {
            backgroundColor: tokens.borderSubtle,
            height: 1,
            marginVertical: Spacing.lg,
          },
          code_inline: {
            backgroundColor: withAlpha(tokens.textPrimary, 0.08),
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          },
        }),
      [tokens, withAlpha]
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: tokens.background }]}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: tokens.borderSubtle }]}
        onChange={(index) => {
          if (index === -1) onClose();
        }}
      >
        <View style={[styles.header, { borderBottomColor: tokens.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: accentAlpha(0.14), borderColor: accentAlpha(0.22) }]}>
              <Image source={TipIcon} style={styles.tipIcon} />
              <Text style={[TextStyles.caption, { color: tokens.accent, fontFamily: FontFamilies.headingBold, fontWeight: '800', letterSpacing: 0.5 }]}>
                DAILY TIP
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => (ref as React.RefObject<BottomSheet>)?.current?.close()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.closeButton, { backgroundColor: tokens.glassSurface, borderColor: tokens.glassBorder }]}
          >
            <IconSymbol name="xmark" size={18} color={tokens.textMuted} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[TextStyles.h2, { color: tokens.textPrimary }]}>{tip.title}</Text>
          <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.sm }]}>
            {tip.summary}
          </Text>

          <View style={[styles.divider, { backgroundColor: tokens.borderSubtle }]} />

          <Markdown style={markdownStyles}>{tip.markdown}</Markdown>
          <View style={{ height: bottomSpacerHeight }} />
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

NutritionTipSheet.displayName = 'NutritionTipSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.sm,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tipIcon: {
    width: 20,
    height: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
    opacity: 0.8,
  },
});

