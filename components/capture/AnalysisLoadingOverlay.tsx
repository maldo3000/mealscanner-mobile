import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { SpriteAnimation } from '@/components/ui/SpriteAnimation';
import { neonGreen, textMuted } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    ZoomIn,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROGRESS_BAR_WIDTH = SCREEN_WIDTH * 0.6;

export type AnalysisStatus = 'idle' | 'analyzing' | 'success' | 'error';

// Step-wise progress descriptions for a premium, dynamic experience
const analysisSteps = [
  {
    header: "Capturing image…",
    detail: "Optimizing camera data & quality",
  },
  {
    header: "Spotting ingredients…",  
    detail: "Detecting portion sizes & types",
  },
  {
    header: "Counting macros…",
    detail: "Protein, carbs, fats & micros",
  },
  {
    header: "Perfecting results…",
    detail: "Building your nutrition summary",
  },
] as const;

// Animated step indicator component
function AnimatedStepIndicator({ isVisible }: { isVisible: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      return;
    }
    
    const stepInterval = setInterval(() => {
      setIsTransitioning(true);
      
      // After fade-out, update step
      setTimeout(() => {
        setCurrentStep(prev => (prev + 1) % analysisSteps.length);
        setIsTransitioning(false);
      }, 200); // Match fade-out duration
    }, 1800); // Total cycle: 1.8s visible + 0.2s transition
    
    return () => clearInterval(stepInterval);
  }, [isVisible]);
  
  const step = analysisSteps[currentStep];
  
  return (
    <Animated.View 
      key={currentStep}
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={{ alignItems: 'center' }}
    >
      <Text style={styles.stepHeader}>
        {step.header}
      </Text>
      <Text style={styles.stepDetail}>
        {step.detail}
      </Text>
    </Animated.View>
  );
}

// Import optimized sprite frames (WebP, 340x340, ~12KB each)
const spriteFrames = [
  require('../../assets/images/loading-animation-optimized/ezgif-frame-001.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-002.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-003.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-004.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-005.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-006.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-007.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-008.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-009.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-010.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-011.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-012.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-013.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-014.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-015.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-016.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-017.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-018.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-019.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-020.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-021.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-022.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-023.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-024.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-025.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-026.webp'),
  require('../../assets/images/loading-animation-optimized/ezgif-frame-027.webp'),
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
      [-PROGRESS_BAR_WIDTH * 0.7, PROGRESS_BAR_WIDTH * 0.7] // Updated to match new width
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
  const isAnalyzing = status === 'analyzing';

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.container}>
        {Platform.OS === 'android' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 30, 20, 0.92)' }]} />
        ) : (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        
        <View style={styles.content}>
          {isSuccess ? (
            <Animated.View 
              entering={ZoomIn.duration(500).springify()}
              style={styles.successIconContainer}
            >
              <AnimatedLogo size={160} playIntro={false} />
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
            {isAnalyzing ? (
              <AnimatedStepIndicator isVisible={isAnalyzing} />
            ) : (
              <Text style={styles.subtitle}>
                {isSuccess 
                  ? 'Your nutritional breakdown is ready.' 
                  : 'Identifying ingredients and calculating nutritional values...'}
              </Text>
            )}
          </Animated.View>
          
          <View style={styles.footer}>
            {isAnalyzing && <IndeterminateProgressBar />}
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
  stepHeader: {
    ...TextStyles.bodySemiBold,
    color: textMuted,
    fontSize: 18,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  stepDetail: {
    ...TextStyles.bodySmall,
    color: textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 280,
    opacity: 0.7,
  },
  footer: {
    marginTop: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    minHeight: 4,
  },
  progressContainer: {
    width: PROGRESS_BAR_WIDTH * 0.7, // Sleeker: 70% of original width
    height: 3, // Thinner: 3px instead of 4px
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // More subtle background
    overflow: 'hidden',
  },
  progressTrack: {
    flex: 1,
    width: '100%',
  },
  progressFill: {
    width: '30%', // Even slimmer fill
    height: '100%',
    backgroundColor: neonGreen,
    borderRadius: 1.5,
  },
});
