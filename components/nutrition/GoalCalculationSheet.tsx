import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';
import { neonGreen } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';

interface GoalCalculationSheetProps {
  onClose: () => void;
}

export const GoalCalculationSheet = forwardRef<BottomSheet, GoalCalculationSheetProps>(
  ({ onClose }, ref) => {
    const { tokens, accentAlpha } = useTheme();
    const insets = useSafeAreaInsets();

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

    const FlowStep = ({
      icon,
      label,
      subLabel,
    }: {
      icon: string;
      label: string;
      subLabel: string;
    }) => (
      <View style={[styles.stepCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.borderSubtle }]}>
        <View style={[styles.stepIcon, { backgroundColor: accentAlpha(0.15) }]}>
          <IconSymbol name={icon as any} size={20} color={tokens.accent} />
        </View>
        <View style={styles.stepContent}>
          <Text style={[TextStyles.body, { color: tokens.textPrimary, fontWeight: '600' }]}>{label}</Text>
          <Text style={[TextStyles.caption, { color: tokens.textMuted }]}>{subLabel}</Text>
        </View>
      </View>
    );

    const FlowArrow = () => (
      <View style={styles.arrowContainer}>
        <IconSymbol name="arrow.down" size={20} color={tokens.textMuted} />
      </View>
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
              <IconSymbol name="function" size={16} color={tokens.accent} />
              <Text style={[TextStyles.caption, { color: tokens.accent, fontFamily: FontFamilies.headingBold, fontWeight: '800', letterSpacing: 0.5 }]}>
                CALCULATION
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[TextStyles.h2, { color: tokens.textPrimary, marginBottom: Spacing.md }]}>
            How your goal is calculated
          </Text>

          <View style={styles.flowContainer}>
            <FlowStep 
              icon="person.fill" 
              label="BMR (Baseline)" 
              subLabel="Calories burned at rest based on your age, size, and sex."
            />
            <FlowArrow />
            <FlowStep 
              icon="figure.run" 
              label="+ Activity Level" 
              subLabel="Multiplied by your typical daily movement (TDEE)."
            />
            <FlowArrow />
            <FlowStep 
              icon="target" 
              label="± Goal Adjustment" 
              subLabel="Surplus or deficit applied based on your goal."
            />
            <FlowArrow />
            
            <View style={[styles.resultCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.borderSubtle }]}>
              <Text style={[TextStyles.h3, { color: tokens.accent }]}>= Daily Target</Text>
            </View>
          </View>

          <Text style={[TextStyles.body, { color: tokens.textPrimary, marginBottom: Spacing.lg }]}>
            We set your calorie goal using a daily average. We estimate your baseline burn (BMR), factor in your typical activity level to estimate maintenance (TDEE), then apply a deficit or surplus depending on your goal.
          </Text>

          <View style={[styles.infoBox, { backgroundColor: tokens.backgroundAlt, borderColor: tokens.borderSubtle }]}>
            <View style={styles.infoBoxHeader}>
              <IconSymbol name="flame.fill" size={20} color={tokens.textPrimary} />
              <Text style={[TextStyles.h3, { color: tokens.textPrimary, fontSize: 16 }]}>Not a "net" goal</Text>
            </View>
            <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, lineHeight: 20 }]}>
              This is a total daily intake target, not a "net calories" target. Workouts won't automatically raise your goal, because your activity level already represents your usual day-to-day energy burn.
            </Text>
          </View>

        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

GoalCalculationSheet.displayName = 'GoalCalculationSheet';

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
  flowContainer: {
    marginBottom: Spacing.xl,
    gap: 4,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  arrowContainer: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    zIndex: -1,
  },
  resultCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  infoBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
