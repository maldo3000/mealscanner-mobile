import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { 
  useSharedValue, 
  withSpring, 
  useAnimatedStyle,
  interpolate,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  Extrapolate,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, G } from 'react-native-svg';

import { getMealTag } from '@/lib/nutritionTags';
import { Colors, neonGreen, glassSurface, glassBorder, textWhite, textMuted, accentSky, accentYellow, accentCoral } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { IconSymbol } from './IconSymbol';
import { GlassCard } from './GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const Particle = ({ delay, index, color }: { delay: number; index: number; color: string }) => {
  const t = useSharedValue(0);
  const angle = (index * (360 / 12) * Math.PI) / 180;
  const distance = 80 + Math.random() * 40;

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1500 }));
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, Math.cos(angle) * distance]) },
      { translateY: interpolate(t.value, [0, 1], [0, Math.sin(angle) * distance]) },
      { scale: interpolate(t.value, [0, 0.2, 1], [0, 1.2, 0.5]) },
    ],
  }));

  return (
    <Animated.View 
      style={[
        { 
          position: 'absolute', 
          width: 4, 
          height: 4, 
          borderRadius: 2, 
          backgroundColor: color,
        },
        style
      ]} 
    />
  );
};

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color: string;
  children?: React.ReactNode;
  showGlow?: boolean;
}

const CircularProgress = ({ size, strokeWidth, progress, color, children, showGlow }: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(0);
  const isFull = progress >= 1;

  useEffect(() => {
    animatedProgress.value = withSpring(progress, { damping: 15 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const glowStyle = useAnimatedStyle(() => {
    if (!showGlow) return { opacity: 0 };
    return {
      opacity: interpolate(animatedProgress.value, [0.99, 1], [0, 1], Extrapolate.CLAMP),
      transform: [{ scale: interpolate(animatedProgress.value, [0.99, 1], [1, 1.1], Extrapolate.CLAMP) }],
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {showGlow && (
        <>
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              styles.glowEffect, 
              { backgroundColor: color, borderRadius: size / 2 },
              glowStyle
            ]} 
          />
          {Array.from({ length: 12 }).map((_, i) => (
            <Particle key={i} index={i} delay={i * 100} color={color} />
          ))}
        </>
      )}
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background track - only show when not full */}
          {!isFull && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={glassSurface}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          )}
          {/* Full circle when at/over 100% - no dash array means no gaps */}
          {isFull && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          )}
          {/* Animated progress circle - only show when under 100% */}
          {!isFull && (
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
            />
          )}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centerContent]}>
        {children}
      </View>
    </View>
  );
};

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
}

const formatMacro = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val.toFixed(1)).toString();
};

export function NutritionHero({ stats, weeklyCalories, selectedDateIndex, selectedWeekIndex, onSelectDate, currentStreak, healthData, themeOverrides }: NutritionHeroProps) {
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

  const calorieScale = useSharedValue(1);
  const prevCalories = useRef(safeStats.totalCalories);

  useEffect(() => {
    if (safeStats.totalCalories > prevCalories.current) {
      calorieScale.value = withSpring(1.05, { damping: 10, stiffness: 100 }, () => {
        calorieScale.value = withSpring(1);
      });
    }
    prevCalories.current = safeStats.totalCalories;
  }, [safeStats.totalCalories]);

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
    if (calRatio > 0.9 && calRatio < 1.1) return "Perfectly on target";
    
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

  useEffect(() => {
    if (containerWidth > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: containerWidth * selectedWeekIndex, animated: false });
      }, 100);
    }
  }, [containerWidth, selectedWeekIndex]);

  const calProgress = Math.min(safeStats.totalCalories / targets.calories, 1.2);
  const isWinState = calProgress >= 1;

  return (
    <GlassCard variant="glass" style={[styles.container, themeOverrides && { backgroundColor: themeOverrides.cardBackground, borderColor: themeOverrides.cardBorder, borderWidth: 1 }]} onLayout={onContainerLayout}>
      {/* Background Arc Gradient */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 400">
          <Defs>
            <LinearGradient id="arcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={themeOverrides ? themeOverrides.accent : neonGreen} stopOpacity="0.12" />
              <Stop offset="70%" stopColor={themeOverrides ? themeOverrides.accent : neonGreen} stopOpacity="0.02" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path 
            d="M0,0 Q200,100 400,0 L400,200 Q200,250 0,200 Z" 
            fill="url(#arcGradient)"
            transform="translate(0, -10)"
          />
        </Svg>
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[TextStyles.h2, { color: themeOverrides ? themeOverrides.textPrimary : '#FFFFFF', fontSize: 26 }]}>
              {getShorthandDate()}
            </Text>
            <Text style={[TextStyles.bodySmall, { color: themeOverrides ? themeOverrides.textMuted : 'rgba(255, 255, 255, 0.6)', fontSize: 13 }]}>
              Your intake so far
            </Text>
          </View>
          <View style={[styles.streakBadge, themeOverrides && { backgroundColor: `${themeOverrides.textPrimary}05`, borderColor: `${themeOverrides.accent}20` }]}>
            <IconSymbol name="flame.fill" size={14} color={themeOverrides ? themeOverrides.accent : neonGreen} />
            <Text style={[TextStyles.caption, { color: themeOverrides ? themeOverrides.accent : neonGreen, fontWeight: '700', marginLeft: 4, fontSize: 11 }]}>
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
            color={themeOverrides ? themeOverrides.accent : neonGreen}
            showGlow={isWinState}
          >
            <View style={styles.calorieTextContainer}>
              <Text style={[TextStyles.h1, { color: themeOverrides ? themeOverrides.textPrimary : '#FFFFFF', fontSize: 40, fontWeight: '800', lineHeight: 48 }]}>
                {formatMacro(safeStats.totalCalories)}
              </Text>
              <Text style={[TextStyles.bodySmall, { color: themeOverrides ? themeOverrides.textMuted : 'rgba(255, 255, 255, 0.6)', marginTop: -2, fontSize: 12 }]}>
                / {formatMacro(targets.calories)}
              </Text>
            </View>
          </CircularProgress>
        </Animated.View>

        <View style={styles.dynamicSentenceContainer}>
          <Text style={[TextStyles.body, { color: themeOverrides ? themeOverrides.textMuted : 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', textAlign: 'center', fontSize: 15 }]}>
            {getDynamicSentence()}
          </Text>
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

      <View style={styles.weeklySection}>
        <Text style={[TextStyles.bodySmall, { color: '#FFFFFF', marginBottom: Spacing.md, fontSize: 13, opacity: 0.9 }]}>Weekly Overview</Text>
        
        {containerWidth > 0 && (
          <ScrollView 
            horizontal 
            ref={scrollViewRef}
            showsHorizontalScrollIndicator={false}
            snapToInterval={containerWidth}
            decelerationRate="fast"
            style={styles.dotsScrollView}
          >
            {weeklyCalories.map((weekData, weekIdx) => (
              <View key={weekIdx} style={[styles.weekContainer, { width: containerWidth }]}>
                <View style={styles.dotsContainer}>
                  {weekData.map((cals, i) => {
                    const isToday = weekIdx === 2 && i === todayIndex;
                    const isSelected = weekIdx === selectedWeekIndex && i === selectedDateIndex;
                    const hasActivity = cals > 0;
                    
                    return (
                      <TouchableOpacity 
                        key={i} 
                        onPress={() => onSelectDate(weekIdx, i)}
                        style={styles.dotColumn}
                      >
                        <View style={styles.dotWrapper}>
                          <View 
                            style={[
                              styles.dot, 
                              { 
                                backgroundColor: isSelected ? neonGreen : '#FFFFFF',
                                opacity: isSelected ? 1 : (hasActivity ? 0.8 : 0.2),
                                transform: [{ scale: isSelected ? 1.4 : 1 }]
                              }
                            ]} 
                          />
                          {isToday && <View style={styles.todayUnderline} />}
                        </View>
                        <Text style={[
                          TextStyles.caption, 
                          { 
                            fontSize: 10, 
                            marginTop: 10,
                            color: isSelected ? neonGreen : 'rgba(255, 255, 255, 0.5)',
                            fontWeight: isSelected ? '700' : '400'
                          }
                        ]}>
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
}

interface MacroLineProps {
  label: string;
  value: number;
  target: number;
  color: string;
  textMutedColor?: string;
  textPrimaryColor?: string;
}

function MacroLine({ label, value, target, color, textMutedColor, textPrimaryColor }: MacroLineProps) {
  const progress = Math.min(value / (target || 1), 1);
  
  return (
    <View style={styles.macroLineWrapper}>
      <View style={styles.macroLineHeader}>
        <Text style={[TextStyles.caption, { color: textMutedColor || 'rgba(255, 255, 255, 0.6)', fontSize: 11 }]}>{label}</Text>
        <Text style={[TextStyles.caption, { color: textPrimaryColor || '#FFFFFF', fontWeight: '700', fontSize: 11 }]}>
          {formatMacro(value)}g
        </Text>
      </View>
      <View style={styles.macroLineTrack}>
        <View 
          style={[
            styles.macroLineFill, 
            { 
              width: `${progress * 100}%`, 
              backgroundColor: color,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
              elevation: 4,
            }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 28, // Middle ground between lg (24) and xl (32)
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
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
  calorieTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynamicSentenceContainer: {
    marginTop: -Spacing.xs,
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
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  macroLineFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  weeklySection: {
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
  },
  dotWrapper: {
    alignItems: 'center',
    height: 12,
    justifyContent: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  todayUnderline: {
    position: 'absolute',
    bottom: -5,
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: neonGreen,
  },
  glowEffect: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
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
});
