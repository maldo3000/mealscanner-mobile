import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { 
  useAnimatedProps, 
  useSharedValue, 
  withSpring, 
  withTiming,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { Colors, neonGreen, glassBorder, glassSurface, accentSky, accentCoral, accentYellow, primaryGreen } from '@/constants/Colors';
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
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={glassSurface}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
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
  weeklyCalories: number[];
  selectedDateIndex: number;
  onSelectDate: (index: number) => void;
  currentStreak: number;
}

export function NutritionHero({ stats, weeklyCalories, selectedDateIndex, onSelectDate, currentStreak }: NutritionHeroProps) {
  const { activeGoal } = useNutritionGoals();
  
  // Animation for calorie update pulse
  const calorieScale = useSharedValue(1);
  const prevCalories = React.useRef(stats.totalCalories);

  useEffect(() => {
    // Only animate if calories increased (e.g. after logging a meal)
    if (stats.totalCalories > prevCalories.current) {
      calorieScale.value = withSequence(
        withTiming(1.12, { duration: 150, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 12, stiffness: 100 })
      );
    }
    prevCalories.current = stats.totalCalories;
  }, [stats.totalCalories]);

  const calorieAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: calorieScale.value }],
  }));

  const targets = activeGoal?.dailyTargets || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
  };

  const calProgress = Math.min(stats.totalCalories / targets.calories, 1.2);
  const proteinProgress = Math.min(stats.totalProtein / (targets.protein || 1), 1.2);
  const carbsProgress = Math.min(stats.totalCarbs / (targets.carbs || 1), 1.2);
  const fatProgress = Math.min(stats.totalFat / (targets.fat || 1), 1.2);

  const isWinState = calProgress >= 1;

  const winAnimation = useSharedValue(0);

  useEffect(() => {
    if (isWinState) {
      winAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.6, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      winAnimation.value = 0;
    }
  }, [isWinState]);

  const winStyle = useAnimatedStyle(() => ({
    opacity: winAnimation.value,
    transform: [{ scale: interpolate(winAnimation.value, [0, 1], [1, 1.05]) }],
  }));

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const maxWeeklyCal = Math.max(...weeklyCalories, targets.calories, 1);
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <GlassCard variant="glass" style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[TextStyles.h3, { color: Colors.dark.text }]}>
            {selectedDateIndex === todayIndex ? "Today's Fuel" : `${fullDayNames[selectedDateIndex]}'s Fuel`}
          </Text>
          <Text style={[TextStyles.bodySmall, { color: Colors.dark.icon }]}>
            {isWinState ? 'Target reached! 🚀' : 'Keep going to hit your goal'}
          </Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={[TextStyles.h4, { color: accentYellow, marginRight: 4 }]}>{currentStreak}</Text>
          <View style={styles.flameContainer}>
            <IconSymbol name="flame.fill" size={28} color={accentYellow} />
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <Animated.View style={[styles.calorieSection, calorieAnimatedStyle]}>
          <CircularProgress 
            size={200} 
            strokeWidth={20} 
            progress={calProgress} 
            color={neonGreen}
            showGlow={isWinState}
          >
            <View style={styles.calorieTextContainer}>
              <Text style={[TextStyles.h1, { color: Colors.dark.text, fontSize: 36, fontWeight: '800' }]}>
                {Math.round(stats.totalCalories)}
              </Text>
              <Text style={[TextStyles.bodySmall, { color: Colors.dark.icon, marginTop: -4 }]}>
                / {Math.round(targets.calories)} kcal
              </Text>
            </View>
          </CircularProgress>
        </Animated.View>

        <View style={styles.horizontalMacros}>
          <MacroPill 
            label="Protein" 
            value={stats.totalProtein} 
            target={targets.protein || 0} 
            progress={proteinProgress}
            color={accentSky}
          />
          <MacroPill 
            label="Carbs" 
            value={stats.totalCarbs} 
            target={targets.carbs || 0} 
            progress={carbsProgress}
            color={accentYellow}
          />
          <MacroPill 
            label="Fat" 
            value={stats.totalFat} 
            target={targets.fat || 0} 
            progress={fatProgress}
            color={accentCoral}
          />
        </View>
      </View>

      <View style={styles.weeklyDivider} />

      <View style={styles.weeklySection}>
        <Text style={[TextStyles.caption, { color: Colors.dark.icon, marginBottom: Spacing.sm }]}>Weekly Overview</Text>
        <View style={styles.weeklyChart}>
          {weeklyCalories.map((cals, i) => {
            const heightPercentage = (cals / maxWeeklyCal) * 100;
            const isSelected = i === selectedDateIndex;
            const isToday = i === todayIndex;
            
            return (
              <TouchableOpacity 
                key={i} 
                style={styles.weeklyDayColumn}
                onPress={() => onSelectDate(i)}
                activeOpacity={0.7}
              >
                <View style={[styles.weeklyBarContainer, { height: 60 }]}>
                  {/* Track background */}
                  <View style={[styles.weeklyBarTrack, { backgroundColor: `${neonGreen}10` }]} />
                  <View 
                    style={[
                      styles.weeklyBar, 
                      { 
                        height: `${Math.max(heightPercentage, 8)}%`, 
                        backgroundColor: isSelected ? neonGreen : (isToday ? primaryGreen : glassBorder),
                        opacity: isSelected || isToday ? 1 : 0.6,
                        shadowColor: isSelected || isToday ? neonGreen : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 4,
                      }
                    ]} 
                  />
                </View>
                <Text style={[
                  TextStyles.caption, 
                  { 
                    color: isSelected ? neonGreen : (isToday ? primaryGreen : Colors.dark.icon), 
                    fontSize: 10, 
                    marginTop: 6,
                    fontWeight: isSelected ? '700' : '500'
                  }
                ]}>
                  {daysOfWeek[i]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
}

interface MacroPillProps {
  label: string;
  value: number;
  target: number;
  progress: number;
  color: string;
}

function MacroPill({ label, value, target, progress, color }: MacroPillProps) {
  return (
    <View style={styles.macroPill}>
      <Text style={[TextStyles.caption, { color: Colors.dark.icon, fontSize: 10, marginBottom: 2 }]}>{label}</Text>
      <View style={[styles.macroPillTrack, { backgroundColor: glassSurface }]}>
        <Animated.View 
          style={[
            styles.macroPillFill, 
            { 
              width: `${Math.min(progress * 100, 100)}%`, 
              backgroundColor: color,
            }
          ]} 
        />
      </View>
      <Text style={[TextStyles.caption, { color: Colors.dark.text, fontSize: 11, fontWeight: '600', marginTop: 2 }]}>
        {Math.round(value)}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.2)',
  },
  flameContainer: {
    shadowColor: accentYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  mainContent: {
    alignItems: 'center',
    gap: Spacing.xl,
  },
  calorieSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.sm,
  },
  macroPill: {
    alignItems: 'center',
    flex: 1,
  },
  macroPillTrack: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  macroPillFill: {
    height: '100%',
    borderRadius: 2,
  },
  weeklyDivider: {
    height: 1,
    backgroundColor: glassBorder,
    marginVertical: Spacing.xl,
  },
  weeklySection: {
    width: '100%',
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 85,
  },
  weeklyDayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyBarContainer: {
    width: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  weeklyBarTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    borderRadius: 10,
  },
  weeklyBar: {
    width: '100%',
    borderRadius: 10,
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
});

