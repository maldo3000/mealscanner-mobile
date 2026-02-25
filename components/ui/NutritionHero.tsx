import { BlurMask, Canvas, Circle, LinearGradient, Path, RadialGradient, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';
import Animated, {
    Easing,
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import Svg, { Defs, Stop, LinearGradient as SvgLinearGradient, Path as SvgPath } from 'react-native-svg';

import { accentCoral, accentSky, accentYellow } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { getMealTag } from '@/lib/nutritionTags';
import { AnimatedLogo } from './AnimatedLogo';
import { GlassCard } from './GlassCard';
import { IconSymbol } from './IconSymbol';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color: string;
  children?: React.ReactNode;
  showGlow?: boolean;
}

const clampProgress = (value: number): number => Math.min(Math.max(value, 0), 1);

const adjustHexColor = (hex: string, amount: number): string => {
  const hexMatch = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!hexMatch) return hex;

  const numeric = parseInt(hexMatch[1], 16);
  const r = Math.min(255, Math.max(0, ((numeric >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((numeric >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (numeric & 0xff) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const CircularProgress = React.memo(({ size, strokeWidth, progress, color, children, showGlow }: CircularProgressProps) => {
  const { tokens, withAlpha } = useTheme();
  const clampedProgress = clampProgress(progress);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const glowPadding = Math.ceil(strokeWidth * 1.6);
  const canvasSize = size + glowPadding * 2;
  const canvasCenter = center + glowPadding;
  const highlightInset = strokeWidth * 0.35;
  const highlightRadius = Math.max(1, radius - highlightInset);
  const hotSpotRadius = Math.max(1.5, strokeWidth * 0.22);

  const trackColor = withAlpha(tokens.background, 0.35);
  const highlightColor = withAlpha(tokens.textPrimary, 0.18);
  const glowOpacity = showGlow ? 0.35 : 0.22;
  const gradientTop = adjustHexColor(color, 28);
  const gradientBottom = adjustHexColor(color, -26);
  const hotSpotColor = adjustHexColor(color, 42);

  // Animated progress for smooth ring fill
  const animatedProgress = useSharedValue(0);
  
  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress]);

  // Derived animated arc angle
  const animatedArcAngle = useDerivedValue(() => {
    return animatedProgress.value * 360;
  });

  // Animated arc path
  const arcPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const angle = animatedArcAngle.value;
    if (angle <= 0) return path;
    const rect = {
      x: canvasCenter - radius,
      y: canvasCenter - radius,
      width: radius * 2,
      height: radius * 2,
    };
    path.addArc(rect, -90, angle);
    return path;
  });

  // Animated highlight path
  const highlightPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const angle = animatedArcAngle.value;
    if (angle <= 0) return path;
    const rect = {
      x: canvasCenter - highlightRadius,
      y: canvasCenter - highlightRadius,
      width: highlightRadius * 2,
      height: highlightRadius * 2,
    };
    path.addArc(rect, -90, angle);
    return path;
  });

  // Animated hot spot position
  const hotSpotX = useDerivedValue(() => {
    const angle = ((animatedArcAngle.value - 90) * Math.PI) / 180;
    return canvasCenter + Math.cos(angle) * radius;
  });

  const hotSpotY = useDerivedValue(() => {
    const angle = ((animatedArcAngle.value - 90) * Math.PI) / 180;
    return canvasCenter + Math.sin(angle) * radius;
  });

  // Animated visibility for arc elements (hide when angle is 0)
  const arcVisible = useDerivedValue(() => {
    return animatedArcAngle.value > 0 ? 1 : 0;
  });

  return (
    <View style={[styles.ringFrame, { width: size, height: size }]}>
      <Canvas
        style={[
          styles.ringCanvas,
          {
            width: canvasSize,
            height: canvasSize,
            left: -glowPadding,
            top: -glowPadding,
          },
        ]}
      >
        {/* Track circle */}
        <Circle
          cx={canvasCenter}
          cy={canvasCenter}
          r={radius}
          color={trackColor}
          style="stroke"
          strokeWidth={strokeWidth}
        />

        {/* Outer glow for progress arc */}
        <Path
          path={arcPath}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          color={color}
          opacity={glowOpacity}
        >
          {!IS_ANDROID && <BlurMask blur={12} style="outer" />}
        </Path>

        {/* Main progress arc with vertical gradient */}
        <Path path={arcPath} style="stroke" strokeWidth={strokeWidth} strokeCap="round">
          <LinearGradient
            start={vec(canvasCenter, canvasCenter - radius)}
            end={vec(canvasCenter, canvasCenter + radius)}
            colors={[gradientTop, color, gradientBottom]}
          />
        </Path>

        {/* Inner specular highlight */}
        <Path
          path={highlightPath}
          style="stroke"
          strokeWidth={Math.max(1, strokeWidth * 0.25)}
          strokeCap="round"
          color={highlightColor}
        />

        {/* Hot spot at leading edge */}
        <Circle cx={hotSpotX} cy={hotSpotY} r={hotSpotRadius} color={hotSpotColor} opacity={arcVisible}>
          {!IS_ANDROID && <BlurMask blur={4} style="normal" />}
        </Circle>
      </Canvas>

      <View style={[StyleSheet.absoluteFill, styles.centerContent]}>
        {children}
      </View>
    </View>
  );
});

interface NutritionHeroProps {
  stats: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  weeklyCalories: number[][]; // 3 weeks
  selectedDateIndex: number; // 0-6
  selectedWeekIndex: number; // 0-2
  onSelectDate: (weekIndex: number, dateIndex: number) => void;
  currentStreak: number;
  healthData?: {
    steps: number;
    activeCalories: number;
  };
  themeOverrides?: {
    cardBackground: string;
    cardBorder: string;
    textPrimary: string;
    textMuted: string;
    accent: string;
    background: string;
  };
  onLogPress?: () => void;
}

const formatMacro = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val.toFixed(1)).toString();
};

export const NutritionHero = React.memo(function NutritionHero({ stats, weeklyCalories, selectedDateIndex, selectedWeekIndex, onSelectDate, currentStreak, healthData, themeOverrides, onLogPress }: NutritionHeroProps) {
  const { tokens, accentAlpha, withAlpha } = useTheme();
  const { activeGoal, refresh } = useNutritionGoals();
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Refresh goals when screen is focused to pick up changes from settings
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  
  const targets = activeGoal?.dailyTargets || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
  };

  const safeStats = stats || {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  };

  const isEmpty = safeStats.totalCalories === 0;
  const transition = useSharedValue(isEmpty ? 0 : 1);
  const calorieScale = useSharedValue(1);
  const prevCalories = useRef(safeStats.totalCalories);

  useEffect(() => {
    transition.value = withTiming(isEmpty ? 0 : 1, {
      duration: 800,
      easing: Easing.out(Easing.back(1.5)),
    });
  }, [isEmpty]);

  useEffect(() => {
    if (safeStats.totalCalories > prevCalories.current) {
      calorieScale.value = withSpring(1.05, { damping: 10, stiffness: 100 }, () => {
        calorieScale.value = withSpring(1);
      });
    }
    prevCalories.current = safeStats.totalCalories;
  }, [safeStats.totalCalories]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 0.2], [1, 0], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(transition.value, [0, 1], [1, 0.5]) },
    ],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0.8, 1], [0, 1], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(transition.value, [0, 1], [1.2, 1]) },
    ],
  }));

  const calorieAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: calorieScale.value }],
  }));

  const getDynamicSentence = () => {
    if (safeStats.totalCalories === 0) return "Ready to fuel your day?";
    
    // Use the getMealTag logic to drive the sentence vocabulary
    const tag = getMealTag({
      calories: safeStats.totalCalories,
      protein: safeStats.totalProtein,
      carbs: safeStats.totalCarbs,
      fat: safeStats.totalFat
    });

    const calRatio = safeStats.totalCalories / targets.calories;
    if (calRatio > 0.9 && calRatio < 1.1) return "All fueled up!";
    
    switch (tag.label) {
      case 'Protein-heavy':
        return "Powering up with protein";
      case 'Light':
        return "Keeping it light and clean";
      case 'Carb-forward':
        return "Fueling up with energy";
      case 'Indulgent':
        return "Enjoying an indulgent moment";
      case 'Balanced':
      default:
        return calRatio >= 1.1 ? "A high fuel day" : "A balanced start to your day";
    }
  };

  const getShorthandDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + diffToMonday);
    
    const offsetDays = (selectedWeekIndex - 2) * 7;
    const selectedMonday = new Date(currentMonday);
    selectedMonday.setDate(currentMonday.getDate() + offsetDays);
    
    const selectedDate = new Date(selectedMonday);
    selectedDate.setDate(selectedMonday.getDate() + selectedDateIndex);
    
    return selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIndex = (new Date().getDay() + 6) % 7;

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    // Account for current padding (28 * 2) to get the true content width
    setContainerWidth(width - 28 * 2);
  };

  const initialOffsetX = useMemo((): number => {
    if (containerWidth <= 0) return 0;
    const maxWeekIndex = Math.max(0, weeklyCalories.length - 1);
    const clampedWeekIndex = Math.min(Math.max(selectedWeekIndex, 0), maxWeekIndex);
    return containerWidth * clampedWeekIndex;
  }, [containerWidth, selectedWeekIndex, weeklyCalories.length]);

  const scrollToSelectedWeek = useCallback((): void => {
    if (containerWidth <= 0) return;
    scrollViewRef.current?.scrollTo({ x: initialOffsetX, animated: false });
  }, [containerWidth, initialOffsetX]);

  // Keep the pager aligned to the selected week
  useEffect(() => {
    if (containerWidth <= 0) return;
    requestAnimationFrame(() => {
      scrollToSelectedWeek();
    });
  }, [containerWidth, scrollToSelectedWeek]);

  useFocusEffect(
    useCallback(() => {
      if (containerWidth <= 0) return;
      requestAnimationFrame(() => {
        scrollToSelectedWeek();
      });
    }, [containerWidth, scrollToSelectedWeek])
  );

  const calProgress = Math.min(safeStats.totalCalories / targets.calories, 1.2);
  const isWinState = calProgress >= 1;

  return (
    <GlassCard variant="glass" style={[styles.container, themeOverrides && { backgroundColor: themeOverrides.cardBackground, borderColor: themeOverrides.cardBorder, borderWidth: 1 }]} onLayout={onContainerLayout}>
      {/* Background Arc Gradient */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 400">
          <Defs>
            <SvgLinearGradient id="arcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={themeOverrides ? themeOverrides.accent : tokens.accent} stopOpacity="0.12" />
              <Stop offset="70%" stopColor={themeOverrides ? themeOverrides.accent : tokens.accent} stopOpacity="0.02" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <SvgPath 
            d="M0,0 Q200,100 400,0 L400,200 Q200,250 0,200 Z" 
            fill="url(#arcGradient)"
            transform="translate(0, -10)"
          />
        </Svg>
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[TextStyles.h2, { color: themeOverrides ? themeOverrides.textPrimary : tokens.textPrimary, fontSize: 26 }]}>
              {getShorthandDate()}
            </Text>
            <Text style={[TextStyles.bodySmall, { color: themeOverrides ? themeOverrides.textMuted : tokens.textMuted, fontSize: 13 }]}>
              Your intake so far
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: accentAlpha(0.05), borderColor: accentAlpha(0.2) }, themeOverrides && { backgroundColor: `${themeOverrides.textPrimary}05`, borderColor: `${themeOverrides.accent}20` }]}>
            <IconSymbol name="bolt.fill" size={14} color={themeOverrides ? themeOverrides.accent : tokens.accent} />
            <Text style={[TextStyles.caption, { color: themeOverrides ? themeOverrides.accent : tokens.accent, fontWeight: '700', marginLeft: 4, fontSize: 11 }]}>
              {currentStreak}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.heroSection}>
        <Animated.View style={[styles.ringContainer, calorieAnimatedStyle]}>
          <CircularProgress 
            size={160} 
            strokeWidth={14} 
            progress={calProgress} 
            color={themeOverrides ? themeOverrides.accent : tokens.accent}
            showGlow={isWinState}
          >
            <View style={StyleSheet.absoluteFill}>
              <Animated.View style={[styles.centerContent, logoStyle, StyleSheet.absoluteFill]} pointerEvents={isEmpty ? 'auto' : 'none'}>
                <AnimatedLogo size={90} playIntro={isEmpty} isActive={isEmpty} />
              </Animated.View>

              <Animated.View style={[styles.calorieTextContainer, statsStyle, StyleSheet.absoluteFill]} pointerEvents={isEmpty ? 'none' : 'auto'}>
                <Text style={[TextStyles.h1, { color: themeOverrides ? themeOverrides.textPrimary : tokens.textPrimary, fontSize: 40, fontWeight: '800', lineHeight: 48 }]}>
                  {formatMacro(safeStats.totalCalories)}
                </Text>
                <Text style={[TextStyles.bodySmall, { color: isWinState ? '#FFFFFF' : (themeOverrides ? themeOverrides.textMuted : tokens.textMuted), marginTop: -2, fontSize: 12 }]}>
                  / {formatMacro(targets.calories)}
                </Text>
              </Animated.View>
            </View>
          </CircularProgress>
        </Animated.View>

        <View style={styles.dynamicSentenceContainer}>
          {isEmpty ? (
            <TouchableOpacity 
              style={[styles.getStartedButton, { backgroundColor: accentAlpha(0.1), borderColor: accentAlpha(0.2) }]} 
              onPress={onLogPress}
              activeOpacity={0.8}
            >
              <Text style={[TextStyles.body, { color: tokens.accent, fontWeight: '700', fontSize: 15 }]}>
                Get your day started
              </Text>
              <IconSymbol name="plus.circle.fill" size={20} color={tokens.accent} />
            </TouchableOpacity>
          ) : (
            <Text style={[TextStyles.body, { color: themeOverrides ? themeOverrides.textMuted : tokens.textMuted, fontStyle: 'italic', textAlign: 'center', fontSize: 15 }]}>
              {getDynamicSentence()}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.macrosContainer}>
        <MacroLine 
          label="Protein" 
          value={safeStats.totalProtein} 
          target={targets.protein || 0} 
          color={accentSky}
        />
        <MacroLine 
          label="Carbs" 
          value={safeStats.totalCarbs} 
          target={targets.carbs || 0} 
          color={accentYellow}
        />
        <MacroLine 
          label="Fat" 
          value={safeStats.totalFat} 
          target={targets.fat || 0} 
          color={accentCoral}
        />
      </View>

      <View style={[styles.weeklySection, { borderTopColor: tokens.borderSubtle }]}>
        <Text style={[TextStyles.bodySmall, { color: tokens.textPrimary, marginBottom: Spacing.md, fontSize: 13, opacity: 0.9 }]}>Weekly Overview</Text>
        
        {containerWidth > 0 && (
          <ScrollView 
            horizontal 
            key={`${containerWidth}-${selectedWeekIndex}`}
            ref={scrollViewRef}
            showsHorizontalScrollIndicator={false}
            snapToInterval={containerWidth}
            decelerationRate="fast"
            style={styles.dotsScrollView}
            contentOffset={{ x: initialOffsetX, y: 0 }}
          >
            {weeklyCalories.map((weekData, weekIdx) => (
              <View key={weekIdx} style={[styles.weekContainer, { width: containerWidth }]}>
                <View style={styles.dotsContainer}>
                  {weekData.map((cals, i) => {
                    const isToday = weekIdx === 2 && i === todayIndex;
                    const isSelected = weekIdx === selectedWeekIndex && i === selectedDateIndex;
                    const hasActivity = cals > 0;
                    const isFutureDay = weekIdx === 2 && i > todayIndex;

                    // Fixed canvas size for all dots - prevents layout jumps
                    const canvasSize = 24;
                    const center = canvasSize / 2;
                    const dotRadius = 4.5;

                    // Determine dot appearance based on state
                    // Today = brightest green, Selected = green with glow, Has activity = medium, No activity = dim
                    const isBright = (isToday || isSelected) && !isFutureDay;
                    const isActiveDay = hasActivity && !isFutureDay;
                    
                    // Colors for different states
                    const brightColor = tokens.accent;
                    const dimCenterColor = withAlpha(tokens.textPrimary, isActiveDay ? 0.5 : 0.18);
                    const dimEdgeColor = withAlpha(tokens.textPrimary, isActiveDay ? 0.25 : 0.06);

                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          if (isFutureDay) return;
                          onSelectDate(weekIdx, i);
                        }}
                        style={styles.dotColumn}
                        activeOpacity={0.7}
                        disabled={isFutureDay}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <View style={styles.dotWrapper} pointerEvents="none">
                          <Canvas style={styles.dotCanvas} pointerEvents="none">
                            {/* Glow halo for selected dot - uses radial gradient to fade out smoothly */}
                            {isSelected && (
                              <Circle cx={center} cy={center} r={11}>
                                <RadialGradient
                                  c={vec(center, center)}
                                  r={11}
                                  colors={[withAlpha(tokens.accent, 0.5), withAlpha(tokens.accent, 0)]}
                                />
                              </Circle>
                            )}
                            
                            {/* Main dot */}
                            {isBright ? (
                              <Circle cx={center} cy={center} r={dotRadius} color={brightColor} />
                            ) : (
                              <Circle cx={center} cy={center} r={dotRadius}>
                                <RadialGradient c={vec(center, center)} r={dotRadius} colors={[dimCenterColor, dimEdgeColor]} />
                              </Circle>
                            )}
                          </Canvas>
                          {isToday && <View style={[styles.todayUnderline, { backgroundColor: tokens.accent }]} />}
                        </View>
                        <Text
                          style={[
                            TextStyles.caption,
                            {
                              fontSize: 10,
                              marginTop: 6,
                              color: isFutureDay
                                ? withAlpha(tokens.textMuted, 0.5)
                                : isSelected
                                  ? tokens.accent
                                  : tokens.textMuted,
                              fontWeight: isSelected ? '700' : '400',
                            },
                          ]}
                        >
                          {daysOfWeek[i]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </GlassCard>
  );
});

interface MacroLineProps {
  label: string;
  value: number;
  target: number;
  color: string;
  textMutedColor?: string;
  textPrimaryColor?: string;
}

const MacroLine = React.memo(function MacroLine({ label, value, target, color, textMutedColor, textPrimaryColor }: MacroLineProps) {
  const { tokens, withAlpha } = useTheme();
  const [barWidth, setBarWidth] = useState(0);
  const progress = Math.min(value / (target || 1), 1);

  const barHeight = 6;
  const radius = barHeight / 2;
  const highlightHeight = 1.5;
  const highlightInset = 1;
  const endGlowRadius = Math.max(2, barHeight * 0.65);

  const trackColor = withAlpha(tokens.background, 0.35);
  const highlightColor = withAlpha(adjustHexColor(color, 40), 0.25);
  const endGlowColor = withAlpha(color, 0.35);

  // Animation shared values
  const animatedProgress = useSharedValue(progress);
  const glowFlicker = useSharedValue(0);
  const prevValue = useRef(value);
  const isInitialMount = useRef(true);

  // Animate on value change
  useEffect(() => {
    if (isInitialMount.current) {
      // Initial mount - snap to current
      animatedProgress.value = progress;
      isInitialMount.current = false;
      prevValue.current = value;
      return;
    }

    if (prevValue.current !== value && barWidth > 0) {
      // Animate fill with easeOut
      animatedProgress.value = withTiming(progress, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });

      // Flicker: instant on, fade out
      glowFlicker.value = 1;
      glowFlicker.value = withTiming(0, {
        duration: 150,
        easing: Easing.out(Easing.quad),
      });

      prevValue.current = value;
    }
  }, [value, progress, barWidth]);

  // Derived animated values for Skia
  const animatedFillWidth = useDerivedValue(() => {
    return Math.max(0, Math.min(barWidth, barWidth * animatedProgress.value));
  });

  const animatedEndGlowX = useDerivedValue(() => {
    const fill = animatedFillWidth.value;
    return Math.max(radius, fill - radius);
  });

  const baseGlowOpacity = useDerivedValue(() => {
    return animatedFillWidth.value > 0 ? 0.8 : 0;
  });

  const flickerGlowOpacity = useDerivedValue(() => {
    return animatedFillWidth.value > 0 ? glowFlicker.value * 0.7 : 0;
  });

  const animatedHighlightWidth = useDerivedValue(() => {
    return Math.max(0, animatedFillWidth.value - highlightInset * 2);
  });

  return (
    <View style={styles.macroLineWrapper}>
      <View style={styles.macroLineHeader}>
        <Text style={[TextStyles.caption, { color: textMutedColor || 'rgba(255, 255, 255, 0.6)', fontSize: 11 }]}>{label}</Text>
        <Text style={[TextStyles.caption, { color: textPrimaryColor || '#FFFFFF', fontWeight: '700', fontSize: 11 }]}>
          {formatMacro(value)}g
        </Text>
      </View>
      <View
        style={[styles.macroLineTrack, { height: barHeight }]}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            {/* Track pill */}
            <RoundedRect x={0} y={0} width={barWidth} height={barHeight} r={radius} color={trackColor} />

            {/* Fill pill - animated */}
            <RoundedRect x={0} y={0} width={animatedFillWidth} height={barHeight} r={radius} color={color} />

            {/* Subtle top highlight - animated */}
            <RoundedRect
              x={highlightInset}
              y={0.4}
              width={animatedHighlightWidth}
              height={highlightHeight}
              r={highlightHeight / 2}
              color={highlightColor}
            />

            {/* End-cap glow - base */}
            <Circle cx={animatedEndGlowX} cy={radius} r={endGlowRadius} color={endGlowColor} opacity={baseGlowOpacity}>
              {!IS_ANDROID && <BlurMask blur={4} style="normal" />}
            </Circle>

            {/* End-cap flicker glow - bright burst */}
            <Circle cx={animatedEndGlowX} cy={radius} r={endGlowRadius * 1.8} color={color} opacity={flickerGlowOpacity}>
              {!IS_ANDROID && <BlurMask blur={10} style="normal" />}
            </Circle>
          </Canvas>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 28, // Middle ground between lg (24) and xl (32)
    width: '100%',
    borderRadius: 32,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ringCanvas: {
    position: 'absolute',
  },
  calorieTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynamicSentenceContainer: {
    marginTop: Spacing.sm,
  },
  macrosContainer: {
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  macroLineWrapper: {
    width: '100%',
  },
  macroLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLineTrack: {
    borderRadius: 999,
    overflow: 'visible',
  },
  weeklySection: {
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  dotsScrollView: {
  },
  weekContainer: {
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotColumn: {
    alignItems: 'center',
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dotWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dotCanvas: {
    width: 24,
    height: 24,
  },
  todayUnderline: {
    position: 'absolute',
    bottom: -3,
    width: 5,
    height: 2,
    borderRadius: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthValue: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  healthLabel: {
    ...TextStyles.caption,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
});
