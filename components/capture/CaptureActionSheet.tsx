import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { neonGreen, textWhite, glassBorder, deepGreen } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_SIZE = 72;
const BUTTON_SIZE_LARGE = 88;
const DIAMOND_HORIZONTAL_SPACING = 56;
const DIAMOND_VERTICAL_SPACING = 12;

interface CaptureActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSnap: () => void;
  onDescribe: () => void;
  onLog: () => void;
  onCaptureRecipe: () => void;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  delay: number;
  size?: number;
  isPrimary?: boolean;
}

function ActionButton({ icon, label, onPress, delay, size = BUTTON_SIZE, isPrimary }: ActionButtonProps): React.ReactElement {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 180 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 250 }));
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View style={[animatedStyle, styles.buttonContainer]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.actionButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isPrimary ? neonGreen : 'rgba(255, 255, 255, 0.08)',
            borderColor: isPrimary ? neonGreen : glassBorder,
            transform: [{ scale: pressed ? 0.92 : 1 }],
            shadowColor: isPrimary ? neonGreen : '#000',
            shadowOpacity: isPrimary ? 0.5 : 0.3,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <IconSymbol
          name={icon as never}
          size={size * 0.36}
          color={isPrimary ? '#000' : textWhite}
        />
      </Pressable>
      <Text style={[TextStyles.bodySmall, styles.buttonLabel]}>{label}</Text>
    </Animated.View>
  );
}

export function CaptureActionSheet({
  visible,
  onClose,
  onSnap,
  onDescribe,
  onLog,
  onCaptureRecipe,
}: CaptureActionSheetProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const closeScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      closeScale.value = withDelay(350, withSpring(1, { damping: 12, stiffness: 150 }));
    } else {
      closeScale.value = 0;
    }
  }, [closeScale, visible]);

  const closeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeScale.value }],
  }));

  const handleClose = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      {/* Deep blur background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, styles.overlayBackground]} />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]} />
      )}

      {/* Tap outside to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      {/* Diamond layout */}
      <View style={styles.container} pointerEvents="box-none">
        {/* Top - Snap (Primary, larger) */}
        <ActionButton
          icon="camera"
          label="Snap"
          onPress={onSnap}
          delay={80}
          size={BUTTON_SIZE_LARGE}
          isPrimary
        />

        {/* Middle row - Describe & Log */}
        <View style={[styles.middleRow, { marginVertical: DIAMOND_VERTICAL_SPACING }]}>
          <ActionButton
            icon="mic"
            label="Describe"
            onPress={onDescribe}
            delay={160}
          />
          <View style={{ width: DIAMOND_HORIZONTAL_SPACING }} />
          <ActionButton
            icon="magnifyingglass"
            label="Log"
            onPress={onLog}
            delay={160}
          />
        </View>

        {/* Bottom - Capture Recipe */}
        <ActionButton
          icon="sparkles"
          label="Capture Recipe"
          onPress={onCaptureRecipe}
          delay={240}
        />
      </View>

      {/* Close button */}
      <Animated.View style={[styles.closeButtonWrapper, { bottom: insets.bottom + 40 }, closeAnimatedStyle]}>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.closeButton,
            { transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close capture menu"
        >
          <IconSymbol name="xmark" size={22} color="#000" />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 10000,
  },
  overlayBackground: {
    backgroundColor: `${deepGreen}CC`,
  },
  androidOverlay: {
    backgroundColor: `${deepGreen}F0`,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  buttonLabel: {
    color: textWhite,
    marginTop: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButtonWrapper: {
    position: 'absolute',
    alignSelf: 'center',
  },
  closeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: neonGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});

