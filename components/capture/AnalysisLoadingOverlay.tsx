import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Modal, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate,
  ZoomIn,
  FadeIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { SpriteAnimation } from '@/components/ui/SpriteAnimation';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { neonGreen, textMuted } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROGRESS_BAR_WIDTH = SCREEN_WIDTH * 0.6;

export type AnalysisStatus = 'idle' | 'analyzing' | 'success' | 'error';

// Import sprite frames (same as LoadingScreen)
const spriteFrames = [
  require('../../assets/images/loading-animation/ezgif-frame-001.png'),
  require('../../assets/images/loading-animation/ezgif-frame-002.png'),
  require('../../assets/images/loading-animation/ezgif-frame-003.png'),
  require('../../assets/images/loading-animation/ezgif-frame-004.png'),
  require('../../assets/images/loading-animation/ezgif-frame-005.png'),
  require('../../assets/images/loading-animation/ezgif-frame-006.png'),
  require('../../assets/images/loading-animation/ezgif-frame-007.png'),
  require('../../assets/images/loading-animation/ezgif-frame-008.png'),
  require('../../assets/images/loading-animation/ezgif-frame-009.png'),
  require('../../assets/images/loading-animation/ezgif-frame-010.png'),
  require('../../assets/images/loading-animation/ezgif-frame-011.png'),
  require('../../assets/images/loading-animation/ezgif-frame-012.png'),
  require('../../assets/images/loading-animation/ezgif-frame-013.png'),
  require('../../assets/images/loading-animation/ezgif-frame-014.png'),
  require('../../assets/images/loading-animation/ezgif-frame-015.png'),
  require('../../assets/images/loading-animation/ezgif-frame-016.png'),
  require('../../assets/images/loading-animation/ezgif-frame-017.png'),
  require('../../assets/images/loading-animation/ezgif-frame-018.png'),
  require('../../assets/images/loading-animation/ezgif-frame-019.png'),
  require('../../assets/images/loading-animation/ezgif-frame-020.png'),
  require('../../assets/images/loading-animation/ezgif-frame-021.png'),
  require('../../assets/images/loading-animation/ezgif-frame-022.png'),
  require('../../assets/images/loading-animation/ezgif-frame-023.png'),
  require('../../assets/images/loading-animation/ezgif-frame-024.png'),
  require('../../assets/images/loading-animation/ezgif-frame-025.png'),
  require('../../assets/images/loading-animation/ezgif-frame-026.png'),
  require('../../assets/images/loading-animation/ezgif-frame-027.png'),
];

function IndeterminateProgressBar() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { 
        duration: 1500, 
        easing: Easing.bezier(0.4, 0, 0.2, 1) 
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-PROGRESS_BAR_WIDTH * 0.6, PROGRESS_BAR_WIDTH]
    );
    return { transform: [{ translateX }] };
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, animatedStyle]} />
      </View>
    </View>
  );
}

interface AnalysisLoadingOverlayProps {
  status: AnalysisStatus;
}

export function AnalysisLoadingOverlay({ status }: AnalysisLoadingOverlayProps) {
  const isVisible = status !== 'idle';
  const isSuccess = status === 'success';

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.container}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.content}>
          {isSuccess ? (
            <Animated.View 
              entering={ZoomIn.duration(500).springify()}
              style={styles.successIconContainer}
            >
              <IconSymbol name="checkmark.circle.fill" size={140} color={neonGreen} />
            </Animated.View>
          ) : (
            <SpriteAnimation
              frames={spriteFrames}
              fps={12}
              loop={true}
              width={240}
              height={240}
            />
          )}
          
          <Animated.View 
            key={status} // Trigger animation on status change
            entering={FadeIn.duration(400)}
            style={{ alignItems: 'center' }}
          >
            <Text style={styles.title}>
              {isSuccess ? 'Meal Analyzed!' : 'Analyzing Meal'}
            </Text>
            <Text style={styles.subtitle}>
              {isSuccess 
                ? 'Your nutritional breakdown is ready.' 
                : 'Identifying ingredients and calculating nutritional values...'}
            </Text>
          </Animated.View>
          
          <View style={styles.footer}>
            {!isSuccess && <IndeterminateProgressBar />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successIconContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TextStyles.h2,
    color: neonGreen,
    marginTop: -Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    ...TextStyles.body,
    color: textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
  footer: {
    marginTop: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    minHeight: 4,
  },
  progressContainer: {
    width: PROGRESS_BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressTrack: {
    flex: 1,
    width: '100%',
  },
  progressFill: {
    width: '40%',
    height: '100%',
    backgroundColor: neonGreen,
    borderRadius: 2,
  },
});
