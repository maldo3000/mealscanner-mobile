import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { GlassCircleButton } from '@/components/ui/GlassCircleButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { deepGreen, neonGreen, textWhite } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 110;
const BUTTON_SIZE_LARGE = 140;
const DIAMOND_HORIZONTAL_SPACING = 30;
const DIAMOND_VERTICAL_SPACING = -15;

interface CaptureActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSnap: () => void;
  onDescribe: () => void;
  onLog: () => void;
  onCaptureRecipe: () => void;
}

interface AnimatedButtonWrapperProps {
  children: React.ReactNode;
  delay: number;
}

function AnimatedButtonWrapper({ children, delay }: AnimatedButtonWrapperProps): React.ReactElement {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, {
        damping: 9,
        stiffness: 140,
        mass: 0.6,
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
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
      closeScale.value = withDelay(
        350,
        withSpring(1, {
          damping: 12,
          stiffness: 120,
          mass: 0.8,
        })
      );
    } else {
      closeScale.value = 0;
    }
  }, [visible]);

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
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, styles.overlayBackground]} />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]} />
      )}

      {/* Dark vignette behind button cluster */}
      <Svg
        height={SCREEN_HEIGHT}
        width={SCREEN_WIDTH}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="45%" rx="60%" ry="45%">
            <Stop offset="0%" stopColor="transparent" stopOpacity="0" />
            <Stop offset="70%" stopColor="black" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="black" stopOpacity="0.4" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#vignette)" />
      </Svg>

      {/* TODO: Add noise texture image overlay here at 0.04 opacity */}
      {/* <Image source={require('@/assets/images/noise.png')} style={[StyleSheet.absoluteFill, { opacity: 0.04 }]} pointerEvents="none" /> */}

      {/* Tap outside to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      {/* Diamond layout */}
      <View style={styles.container} pointerEvents="box-none">
        <Text style={[TextStyles.h1, styles.title]}>Log a Meal</Text>

        {/* Top - Snap (Primary, larger) */}
        <AnimatedButtonWrapper delay={80}>
          <View style={styles.buttonWithLabel}>
            <GlassCircleButton
              size={BUTTON_SIZE_LARGE}
              isPrimary
              onPress={onSnap}
              accessibilityLabel="Snap a photo of your meal"
            >
              <IconSymbol name="camera" size={BUTTON_SIZE_LARGE * 0.36} color="#000000" />
            </GlassCircleButton>
            <Text style={[TextStyles.bodySmall, styles.buttonLabel]}>Snap</Text>
          </View>
        </AnimatedButtonWrapper>

        {/* Middle row - Describe & Log */}
        <View style={[styles.middleRow, { marginVertical: DIAMOND_VERTICAL_SPACING }]}>
          <AnimatedButtonWrapper delay={160}>
            <View style={styles.buttonWithLabel}>
              <GlassCircleButton
                size={BUTTON_SIZE}
                onPress={onDescribe}
                accessibilityLabel="Describe your meal"
              >
                <IconSymbol name="mic" size={BUTTON_SIZE * 0.36} color="rgba(255, 255, 255, 0.95)" />
              </GlassCircleButton>
              <Text style={[TextStyles.bodySmall, styles.buttonLabel]}>Describe</Text>
            </View>
          </AnimatedButtonWrapper>

          <View style={{ width: DIAMOND_HORIZONTAL_SPACING }} />

          <AnimatedButtonWrapper delay={160}>
            <View style={styles.buttonWithLabel}>
              <GlassCircleButton
                size={BUTTON_SIZE}
                onPress={onLog}
                accessibilityLabel="Search and log food"
              >
                <IconSymbol name="magnifyingglass" size={BUTTON_SIZE * 0.36} color="rgba(255, 255, 255, 0.95)" />
              </GlassCircleButton>
              <Text style={[TextStyles.bodySmall, styles.buttonLabel]}>Log</Text>
            </View>
          </AnimatedButtonWrapper>
        </View>

        {/* Bottom - Log from Recipe */}
        <AnimatedButtonWrapper delay={240}>
          <View style={styles.buttonWithLabel}>
            <GlassCircleButton
              size={BUTTON_SIZE}
              onPress={onCaptureRecipe}
              accessibilityLabel="Log from recipe"
            >
              <IconSymbol name="book.closed" size={BUTTON_SIZE * 0.36} color="rgba(255, 255, 255, 0.95)" />
            </GlassCircleButton>
            <Text style={[TextStyles.bodySmall, styles.buttonLabel]}>Log from Recipe</Text>
          </View>
        </AnimatedButtonWrapper>
      </View>

      {/* Close button */}
      <Animated.View
        style={[styles.closeButtonWrapper, { bottom: insets.bottom + 40 }, closeAnimatedStyle]}
      >
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
    backgroundColor: 'rgba(0, 44, 34, 0.5)',
  },
  androidOverlay: {
    backgroundColor: `${deepGreen}F0`,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonWithLabel: {
    alignItems: 'center',
  },
  buttonLabel: {
    color: textWhite,
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  title: {
    marginBottom: 60,
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
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
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
});
