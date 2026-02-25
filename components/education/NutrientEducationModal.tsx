import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { type NutrientKey, NUTRIENT_EDUCATION_CONTENT } from '@/constants/NutrientEducationContent';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';

interface NutrientEducationModalProps {
  visible: boolean;
  nutrient: NutrientKey | null;
  onClose: () => void;
}

const NUTRIENT_LABELS: Record<NutrientKey, string> = {
  protein: 'Protein',
  carbs: 'Carbohydrates',
  fat: 'Fat',
  fiber: 'Fiber',
  sugar: 'Sugar',
  sodium: 'Sodium',
  cholesterol: 'Cholesterol',
};

export function NutrientEducationModal({ visible, nutrient, onClose }: NutrientEducationModalProps) {
  const { tokens, withAlpha } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Animation state
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      opacity.value = withSpring(1);
    } else {
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!nutrient) return null;

  const content = NUTRIENT_EDUCATION_CONTENT[nutrient];
  const nutrientLabel = NUTRIENT_LABELS[nutrient];
  const cardHeight = Math.min(windowHeight * 0.78, 640);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        )}

        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.card,
            animatedCardStyle,
            {
              height: cardHeight,
              backgroundColor: tokens.background,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[TextStyles.h3, { color: tokens.textPrimary, textAlign: 'center' }]}>
                {nutrientLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close nutrient education"
              style={[styles.closeButton, { backgroundColor: withAlpha(tokens.textPrimary, 0.08) }]}
            >
              <IconSymbol name="xmark" size={16} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bodyContainer}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: Math.max(Spacing.xl, insets.bottom + Spacing.lg) },
              ]}
              showsVerticalScrollIndicator
              bounces
              alwaysBounceVertical
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[TextStyles.body, styles.summaryText, { color: tokens.textPrimary }]}>
                {content.summary}
              </Text>
              
              <View style={[styles.divider, { backgroundColor: tokens.borderSubtle }]} />

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: tokens.accent }]}>What it is</Text>
                <Text style={[styles.sectionBody, { color: tokens.textPrimary }]}>{content.whatItIs}</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: tokens.accent }]}>Why it matters</Text>
                {content.whyItMatters.map((point) => (
                  <View key={point} style={styles.bulletRow}>
                    <IconSymbol name="checkmark.circle.fill" size={16} color={withAlpha(tokens.accent, 0.8)} style={{ marginTop: 2 }} />
                    <Text style={[styles.sectionBody, styles.bulletText, { color: tokens.textPrimary }]}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: tokens.accent }]}>Daily guidance</Text>
                <Text style={[styles.sectionBody, { color: tokens.textPrimary }]}>{content.dailyGuidance}</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: tokens.accent }]}>Common sources</Text>
                <View style={styles.tagsContainer}>
                  {content.commonSources.map((source) => (
                    <View key={source} style={[styles.tag, { backgroundColor: withAlpha(tokens.accent, 0.1) }]}>
                      <Text style={[TextStyles.caption, { color: tokens.accent, fontWeight: '600' }]}>
                        {source}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the title
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    position: 'relative',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl, // Make room for close button
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  bodyContainer: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionBody: {
    ...TextStyles.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  bulletText: {
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});
