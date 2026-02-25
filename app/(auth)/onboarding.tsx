import { RulerSlider } from '@/components/onboarding/RulerSlider';
import { Paywall } from '@/components/subscription/Paywall';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SpriteAnimation } from '@/components/ui/SpriteAnimation';
import { bgPrimary, glassBorder, glassSurface, neonGreen, textMuted } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { localGoalsRepository } from '@/lib/goals/LocalGoalsRepository';
import { calculateGoalTargets } from '@/lib/goals/goalEngine';
import type { ActivityLevel, BiologicalSex, NutritionGoal, NutritionGoalType } from '@/lib/goals/types';
import {
    DEFAULT_NOTIFICATION_SETTINGS,
    requestNotificationPermissions,
    saveNotificationSettings,
    syncScheduledNotifications,
} from '@/lib/notifications';
import { signInWithApple, signInWithGoogle, supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Import optimized dancing veggies sprite frames (WebP, 340x340, ~12KB each)
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

const { width } = Dimensions.get('window');

type QuizData = {
  fullName: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number;
  weight: number;
  goal: string;
  source: string;
  activityLevel: string;
  dietaryPreferences: string[];
  allergies: string[];
  pace: 'gentle' | 'standard' | 'aggressive';
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
};

const GOALS = [
  { id: 'lose_weight', label: 'Lose weight sustainably', image: require('../../assets/images/lose_weight.png') },
  { id: 'build_muscle', label: 'Build muscle & strength', image: require('../../assets/images/build_muscle.png') },
  { id: 'plant_based', label: 'Eat more plant-based foods', image: require('../../assets/images/plant_based.png') },
  { id: 'track_habits', label: 'Just track my habits', image: require('../../assets/images/cal-icon.png') },
];

const SOURCES = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram' },
  { id: 'tiktok', label: 'TikTok', icon: 'music' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube-play' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
  { id: 'friend', label: 'Friend/Family', icon: 'users' },
  { id: 'search', label: 'Search Engine', icon: 'search' },
  { id: 'other', label: 'Other', icon: 'ellipsis-h' },
];

const ACTIVITY_LEVELS = [
  { 
    id: 'sedentary', 
    label: 'Sedentary', 
    desc: 'Desk job, little exercise',
    image: require('../../assets/images/sedentary.png')
  },
  { 
    id: 'light', 
    label: 'Lightly Active', 
    desc: '1–2 workouts/week',
    image: require('../../assets/images/lightly_active.png')
  },
  { 
    id: 'active', 
    label: 'Active', 
    desc: '3–5 workouts/week',
    image: require('../../assets/images/Active.png')
  },
  { 
    id: 'very_active', 
    label: 'Very Active', 
    desc: 'Daily intense training',
    image: require('../../assets/images/very_active.png')
  },
];

const DIETARY_PREFERENCES = [
  'Vegan', 'Vegetarian', 'Pescatarian', 'Keto', 'Paleo', 'Low-Carb', 'No Pork', 'Halal', 'Kosher', 'Gluten-Free', 'Dairy-Free', 'None'
];

// Define onboarding steps – Apple Health is iOS-only
const ONBOARDING_STEPS = [
  'goal',
  'physicals',
  'source',
  'activity',
  'dietary',
  'magic',
  'pro',
  ...(Platform.OS === 'ios' ? ['health'] as const : []),
  'notifications',
  'account',
] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// Unit conversion helpers
const cmToFeetInches = (cm: number) => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches, total: totalInches };
};

const feetInchesToCm = (feet: number, inches: number) => {
  return Math.round((feet * 12 + inches) * 2.54);
};

const kgToLbs = (kg: number) => Math.round(kg * 2.205);
const lbsToKg = (lbs: number) => Math.round(lbs / 2.205);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [useMetricHeight, setUseMetricHeight] = useState(true);
  const [useMetricWeight, setUseMetricWeight] = useState(true);
  const [quizData, setQuizData] = useState<QuizData>({
    fullName: '',
    gender: 'female',
    age: 25,
    height: 170, // Always stored in cm
    weight: 70,  // Always stored in kg
    goal: '',
    source: '',
    activityLevel: '',
    dietaryPreferences: [],
    allergies: [],
    pace: 'standard',
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  // Display values — always integers for the ruler slider.
  // Math.round on metric mode handles the case where the value was last set via imperial
  // (stored as a float like 72.56 kg) and needs to display as a clean integer (73 kg).
  const displayHeight = useMetricHeight ? Math.round(quizData.height) : Math.round(quizData.height / 2.54);
  const displayWeight = useMetricWeight ? Math.round(quizData.weight) : Math.round(quizData.weight * 2.205);

  // Use Reanimated for reliable transitions (avoids JS/native thread race conditions)
  const contentOpacity = useSharedValue(1);
  const isTransitioning = useRef(false);
  const prevStepRef = useRef(currentStep);

  // Trigger fade-in AFTER React has rendered the new step content.
  // This prevents the "pop" where the old content briefly shows at increasing
  // opacity before React swaps in the new content (goal → physicals was most visible).
  useEffect(() => {
    if (isTransitioning.current && prevStepRef.current !== currentStep) {
      isTransitioning.current = false;
      prevStepRef.current = currentStep;
      // Wait one frame so the new layout is fully measured before fading in
      requestAnimationFrame(() => {
        contentOpacity.value = withTiming(1, { duration: 200 });
      });
    }
  }, [currentStep]);

  const buildOnboardingGoal = (): NutritionGoal => {
    const goalMap: Record<string, NutritionGoalType> = {
      'lose_weight': 'weight_loss',
      'build_muscle': 'weight_gain',
      'plant_based': 'maintenance',
      'track_habits': 'maintenance',
    };

    const activityLevelMap: Record<string, ActivityLevel> = {
      'sedentary': 'sedentary',
      'light': 'light',
      'active': 'active',
      'very_active': 'very_active',
    };

    const goalType = goalMap[quizData.goal] || 'maintenance';
    const activityLevel = activityLevelMap[quizData.activityLevel] || 'light';
    const nowIso = new Date().toISOString();

    return {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      isActive: true,
      type: goalType,
      name: goalType === 'weight_loss' ? 'Weight Loss' : goalType === 'weight_gain' ? 'Build Muscle' : 'Maintain Health',
      profileSnapshot: {
        sex: quizData.gender as BiologicalSex,
        ageYears: quizData.age,
        heightCm: quizData.height,
        weightKg: quizData.weight,
        activityLevel,
      },
      dailyTargets: {
        calories: quizData.targetCalories || 2000,
        proteinGrams: quizData.targetProtein || 100,
        carbGrams: quizData.targetCarbs || 200,
        fatGrams: quizData.targetFat || 65,
        fibreGrams: 25,
      },
      meta: {
        source: 'wizard',
        focusAreas: [...quizData.dietaryPreferences, ...quizData.allergies],
      },
    };
  };

  const savePendingOnboardingGoal = async () => {
    const goal = buildOnboardingGoal();
    await localGoalsRepository.savePendingGoal(goal);
  };

  const saveOnboardingGoalsForUser = async (userId: string) => {
    const goal = buildOnboardingGoal();
    await localGoalsRepository.saveGoal(goal, userId);

    try {
      const goalMap: Record<string, NutritionGoalType> = {
        'lose_weight': 'weight_loss',
        'build_muscle': 'weight_gain',
        'plant_based': 'maintenance',
        'track_habits': 'maintenance',
      };
      const goalType = goalMap[quizData.goal] || 'maintenance';
      const nowIso = new Date().toISOString();

      await supabase.from('user_goals').upsert({
        user_id: userId,
        goal_type: goalType,
        activity_level: quizData.activityLevel,
        dietary_restrictions: [...quizData.dietaryPreferences, ...quizData.allergies],
        target_calories: quizData.targetCalories,
        target_protein: quizData.targetProtein,
        target_carbs: quizData.targetCarbs,
        target_fat: quizData.targetFat,
        sex: quizData.gender,
        age_years: quizData.age,
        height_cm: quizData.height,
        weight_kg: quizData.weight,
        updated_at: nowIso,
      });
    } catch {
      // Silently ignore — useNutritionGoals will retry from the pending key
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      // Persist onboarding goal BEFORE the auth call — the auth state change can
      // trigger navigation at any await boundary, so this must complete first.
      await savePendingOnboardingGoal();

      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            ...quizData
          },
          emailRedirectTo: 'mealscanner://'
        }
      });
      
      if (error) throw error;

      if (data.user) {
        await saveOnboardingGoalsForUser(data.user.id);

        await supabase.from('profiles').update({
          full_name: quizData.fullName || data.user.email?.split('@')[0],
        }).eq('id', data.user.id);
      }
      
      if (data.user && !data.session) {
        router.push({ pathname: '/(auth)/verify', params: { email } });
      }
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'apple') => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      // Persist onboarding goal BEFORE the auth call — signInWithIdToken triggers
      // onAuthStateChange which can navigate away before post-auth saves complete.
      await savePendingOnboardingGoal();

      const { data, error } = provider === 'apple' 
        ? await signInWithApple() 
        : await signInWithGoogle();
        
      if (error) throw error;
      
      if (!data) return;

      if (data.user) {
        await saveOnboardingGoalsForUser(data.user.id);

        await supabase.from('profiles').update({
          full_name: quizData.fullName || data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        }).eq('id', data.user.id);
      }
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const totalSteps = ONBOARDING_STEPS.length;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      animateTransition(() => setCurrentStep(currentStep + 1));
    }
  };

  // Handles both data update and transition - updates data after fade-out to prevent visual glitch
  const handleNextWithData = (updates: Partial<QuizData>) => {
    if (currentStep < totalSteps - 1) {
      animateTransition(() => {
        setQuizData(prev => ({ ...prev, ...updates }));
        setCurrentStep(currentStep + 1);
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition(() => setCurrentStep(currentStep - 1));
    } else {
      router.back();
    }
  };

  const animateTransition = (callback: () => void) => {
    isTransitioning.current = true;
    // Fade out — the fade-in is handled by the useEffect on currentStep
    // so that it only starts AFTER React has rendered the new content.
    contentOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(callback)();
      }
    });
  };

  // Animated style for content transitions
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const updateData = useCallback((updates: Partial<QuizData>) => {
    setQuizData(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleDietary = (pref: string) => {
    const current = quizData.dietaryPreferences;
    
    if (pref === 'None') {
      // If 'None' is clicked, and it was already selected, deselect it.
      // If 'None' is clicked, and it wasn't selected, select ONLY 'None'.
      if (current.includes('None')) {
        updateData({ dietaryPreferences: [] });
      } else {
        updateData({ dietaryPreferences: ['None'] });
      }
      return;
    }

    // If any other preference is clicked, ensure 'None' is deselected.
    let newPrefs = current.filter(p => p !== 'None');
    if (newPrefs.includes(pref)) {
      newPrefs = newPrefs.filter(p => p !== pref);
    } else {
      newPrefs.push(pref);
    }
    updateData({ dietaryPreferences: newPrefs });
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <FontAwesome name="chevron-left" size={18} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${((currentStep + 1) / totalSteps) * 100}%` }]} />
      </View>
    </View>
  );

  const currentStepName = ONBOARDING_STEPS[currentStep];

  const renderStep = () => {
    switch (currentStepName) {
      case 'goal':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What are you here for?</Text>
            <View style={styles.optionsContainer}>
              {GOALS.map((goal, index) => (
                <AnimatedGoalOption
                  key={goal.id}
                  goal={goal}
                  index={index}
                  isSelected={quizData.goal === goal.id}
                  onPress={() => handleNextWithData({ goal: goal.id })}
                />
              ))}
            </View>
          </View>
        );

      case 'physicals':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput 
                value={quizData.fullName}
                onChangeText={(v) => updateData({ fullName: v })}
                placeholder="Enter your name"
                placeholderTextColor="rgba(74, 222, 128, 0.3)"
                autoCapitalize="words"
                style={styles.cleanInput}
                selectionColor={neonGreen}
              />
            </View>
            
            <View style={styles.genderContainer}>
              {['female', 'male', 'other'].map((g) => (
                <TouchableOpacity 
                  key={g}
                  style={[styles.genderButton, quizData.gender === g && styles.activeButton]}
                  onPress={() => updateData({ gender: g as any })}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.genderText, quizData.gender === g && styles.activeText]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput 
                keyboardType="number-pad"
                value={quizData.age.toString()}
                onChangeText={(v) => updateData({ age: parseInt(v) || 0 })}
                placeholder="25"
                placeholderTextColor="rgba(74, 222, 128, 0.3)"
                style={styles.cleanInput}
                selectionColor={neonGreen}
              />
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.rulerGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Height</Text>
                <View style={styles.unitToggle}>
                  <TouchableOpacity onPress={() => setUseMetricHeight(true)}>
                    <Text style={[styles.unitOption, useMetricHeight && styles.unitOptionActive]}>cm</Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>/</Text>
                  <TouchableOpacity onPress={() => setUseMetricHeight(false)}>
                    <Text style={[styles.unitOption, !useMetricHeight && styles.unitOptionActive]}>ft</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <RulerSlider
                key={useMetricHeight ? 'height-cm' : 'height-in'}
                min={useMetricHeight ? 100 : 48}
                max={useMetricHeight ? 250 : 96}
                value={displayHeight} 
                onValueChange={(v) => {
                  // In metric: store the integer directly.
                  // In imperial: store full-precision float to avoid lossy round-trips
                  // (e.g. 67in → 170.18cm stored, not 170 — so 170.18/2.54 = 67 on display).
                  const heightInCm = useMetricHeight ? v : v * 2.54;
                  updateData({ height: heightInCm });
                }} 
                unit={useMetricHeight ? 'cm' : 'ft'}
                formatValue={useMetricHeight ? undefined : (inches) => {
                  const feet = Math.floor(inches / 12);
                  const remainingInches = inches % 12;
                  return `${feet}'${remainingInches}"`;
                }}
              />
            </View>

            <View style={styles.rulerGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Weight</Text>
                <View style={styles.unitToggle}>
                  <TouchableOpacity onPress={() => setUseMetricWeight(true)}>
                    <Text style={[styles.unitOption, useMetricWeight && styles.unitOptionActive]}>kg</Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>/</Text>
                  <TouchableOpacity onPress={() => setUseMetricWeight(false)}>
                    <Text style={[styles.unitOption, !useMetricWeight && styles.unitOptionActive]}>lbs</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <RulerSlider
                key={useMetricWeight ? 'weight-kg' : 'weight-lbs'}
                min={useMetricWeight ? 30 : 66}
                max={useMetricWeight ? 200 : 440}
                value={displayWeight} 
                onValueChange={(v) => {
                  // In metric: store the integer directly.
                  // In imperial: store full-precision float to avoid lossy round-trips
                  // (e.g. 160lbs → 72.56kg stored, not 73 — so 72.56*2.205 = 160 on display).
                  const weightInKg = useMetricWeight ? v : v / 2.205;
                  updateData({ weight: weightInKg });
                }} 
                unit={useMetricWeight ? 'kg' : 'lbs'}
              />
            </View>
          </View>
        );

      case 'source':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How did you hear about us?</Text>
            <View style={styles.optionsContainer}>
              {SOURCES.map((source) => (
                <TouchableOpacity 
                  key={source.id}
                  style={[styles.optionCard, quizData.source === source.id && styles.activeOptionCard]}
                  onPress={() => handleNextWithData({ source: source.id })}
                >
                  <View style={styles.sourceIconContainer}>
                    <FontAwesome name={source.icon as any} size={18} color={neonGreen} />
                  </View>
                  <Text style={[styles.optionLabel, quizData.source === source.id && styles.activeText]}>
                    {source.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'activity':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How active is your lifestyle?</Text>
            <View style={styles.optionsContainer}>
              {ACTIVITY_LEVELS.map((level, index) => (
                <AnimatedActivityOption
                  key={level.id}
                  level={level}
                  index={index}
                  isSelected={quizData.activityLevel === level.id}
                  onPress={() => handleNextWithData({ activityLevel: level.id })}
                />
              ))}
            </View>
          </View>
        );

      case 'dietary':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Any dietary preferences or allergies?</Text>
            
            <Text style={styles.sectionLabel}>Dietary Preferences</Text>
            <View style={styles.chipContainer}>
              {DIETARY_PREFERENCES.map((pref) => (
                <TouchableOpacity 
                  key={pref}
                  style={[
                    styles.chip, 
                    quizData.dietaryPreferences.includes(pref) && styles.activeChip
                  ]}
                  onPress={() => toggleDietary(pref)}
                >
                  <Text style={[
                    styles.chipText, 
                    quizData.dietaryPreferences.includes(pref) && styles.activeText
                  ]}>
                    {pref}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.allergySection}>
              <Text style={styles.sectionLabel}>Allergies (Optional)</Text>
              <View style={styles.allergyInputRow}>
                <View style={styles.allergyInputWrapper}>
                  <Input 
                    placeholder="Add allergy" 
                    value={newAllergy}
                    onChangeText={setNewAllergy}
                    onSubmitEditing={() => {
                      if (newAllergy.trim()) {
                        updateData({ allergies: [...quizData.allergies, newAllergy.trim()] });
                        setNewAllergy('');
                      }
                    }}
                  />
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    if (newAllergy.trim()) {
                      updateData({ allergies: [...quizData.allergies, newAllergy.trim()] });
                      setNewAllergy('');
                    }
                  }}
                  style={styles.addAllergyButton}
                >
                  <FontAwesome name="plus" size={16} color={neonGreen} />
                </TouchableOpacity>
              </View>
              
              {quizData.allergies.length > 0 && (
                <View style={styles.allergyChipsContainer}>
                  {quizData.allergies.map((allergy, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={[styles.chip, styles.activeChip]}
                      onPress={() => {
                        updateData({ allergies: quizData.allergies.filter((_, i) => i !== index) });
                      }}
                    >
                      <View style={styles.allergyChipContent}>
                        <Text style={[styles.chipText, styles.activeText]}>{allergy}</Text>
                        <FontAwesome name="times" size={12} color={neonGreen} style={styles.removeIcon} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        );

      case 'magic':
        return <MagicMoment onComplete={handleNext} data={quizData} onUpdateData={updateData} />;

      case 'pro':
        return (
          <View style={styles.stepContent}>
            <View style={styles.proBadge}>
              <FontAwesome name="star" size={14} color="#000" />
              <Text style={styles.proBadgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.stepTitle}>Unlock your full potential</Text>
            <Text style={styles.stepDesc}>
              Pro members are 3x more likely to reach their {quizData.goal.replace('_', ' ')} goal in the first 30 days.
            </Text>
            
            <View style={styles.proFeaturesContainer}>
              {[
                'Unlimited AI meal scans (vs 3/day)',
                'Unlock the entire recipe database',
                'Detailed micronutrient tracking',
                'Priority AI analysis'
              ].map((feature, i) => (
                <View key={i} style={styles.proFeatureRow}>
                  <View style={styles.featureIconSmall}>
                    <FontAwesome name="check" size={12} color={neonGreen} />
                  </View>
                  <Text style={styles.proFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <Button 
              variant="primary" 
              fullWidth 
              onPress={() => setShowPaywall(true)}
              style={styles.proButton}
            >
              Start 7-Day Free Trial
            </Button>
            
            <TouchableOpacity onPress={handleNext} style={styles.skipProButton}>
              <Text style={styles.skipProText}>Continue with basic plan</Text>
            </TouchableOpacity>
          </View>
        );

      case 'health': {
        // Lazy-load Apple Health modules (iOS only – this case is never reached on Android)
        const { AppleHealthService } = require('@/lib/health/AppleHealthService');
        const { BiologicalSex: HKBiologicalSex } = require('@kingstinct/react-native-healthkit');
        return (
          <View style={styles.stepContent}>
            <FontAwesome name="heartbeat" size={80} color={neonGreen} style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Sync with Apple Health</Text>
            <Text style={styles.stepDesc}>
              Automatically track your steps and activity to refine your daily nutrition targets.
            </Text>
            <Button 
              variant="primary" 
              fullWidth 
              onPress={async () => {
                const success = await AppleHealthService.requestPermissions();
                if (success) {
                  const profile = await AppleHealthService.getUserProfileData();
                  if (profile) {
                    const updates: Partial<QuizData> = {};
                    if (profile.weightKg) updates.weight = profile.weightKg;
                    if (profile.heightCm) updates.height = profile.heightCm;
                    if (profile.biologicalSex) {
                      updates.gender = profile.biologicalSex === HKBiologicalSex.female ? 'female' : 
                                      profile.biologicalSex === HKBiologicalSex.male ? 'male' : 'other';
                    }
                    if (profile.dateOfBirth) {
                      const age = new Date().getFullYear() - profile.dateOfBirth.getFullYear();
                      updates.age = age;
                    }
                    updateData(updates);
                  }
                }
                handleNext();
              }}
            >
              Connect Apple Health
            </Button>
          </View>
        );
      }

      case 'notifications':
        return (
          <View style={styles.stepContent}>
            <FontAwesome name="bell" size={80} color={neonGreen} style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Stay on track</Text>
            <Text style={styles.stepDesc}>
              Get personalized reminders to log your meals and tips to reach your goals.
            </Text>
            <Button
              variant="primary"
              fullWidth
              onPress={async () => {
                const granted = await requestNotificationPermissions();
                const nextSettings = {
                  ...DEFAULT_NOTIFICATION_SETTINGS,
                  masterEnabled: granted,
                };
                await saveNotificationSettings(nextSettings);
                await syncScheduledNotifications(nextSettings);
                handleNext();
              }}
            >
              Allow Notifications
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onPress={async () => {
                const disabledSettings = {
                  ...DEFAULT_NOTIFICATION_SETTINGS,
                  masterEnabled: false,
                };
                await saveNotificationSettings(disabledSettings);
                await syncScheduledNotifications(disabledSettings);
                handleNext();
              }}
            >
              Not now
            </Button>
          </View>
        );

      case 'account':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Save your progress</Text>
            <Text style={styles.stepDesc}>
              Create an account to sync your meal history and get personalized recipe generation.
            </Text>
            <View style={styles.socialButtons}>
              <Button 
                variant="glass" 
                fullWidth 
                onPress={() => handleSocialSignUp('google')} 
                icon={<FontAwesome name="google" size={20} color="white" />}
              >
                Continue with Google
              </Button>
              {Platform.OS === 'ios' && (
                <Button 
                  variant="glass" 
                  fullWidth 
                  onPress={() => handleSocialSignUp('apple')} 
                  icon={<FontAwesome name="apple" size={20} color="white" />}
                >
                  Continue with Apple
                </Button>
              )}
              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.line} />
              </View>
              <Input
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightIcon={
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <FontAwesome 
                      name={showPassword ? 'eye' : 'eye-slash'} 
                      size={18} 
                      color={textMuted} 
                    />
                  </TouchableOpacity>
                }
              />
              {authError && <Text style={styles.errorText}>{authError}</Text>}
              <Button 
                variant="primary" 
                fullWidth 
                onPress={handleEmailSignUp}
                disabled={authLoading}
              >
                {authLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
              <Text style={styles.tosDisclaimer}>
                By signing up, you agree to our{' '}
                <Text 
                  style={styles.tosLink} 
                  onPress={() => router.push('/settings/terms-of-service')}
                >
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text 
                  style={styles.tosLink} 
                  onPress={() => router.push('/settings/privacy-policy')}
                >
                  Privacy Policy
                </Text>
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.signInLink}>Already have an account? <Text style={{ color: neonGreen }}>Sign In</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.safeArea}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']} />
      <View style={styles.container}>
        {renderHeader()}

        <Reanimated.View style={[styles.content, contentAnimatedStyle]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 20 + insets.bottom }
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {renderStep()}
            </ScrollView>
          </KeyboardAvoidingView>
        </Reanimated.View>

        {/* Always render footer to avoid layout shift; hide via opacity + pointerEvents */}
        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.footer,
            !(['physicals', 'dietary'] as OnboardingStep[]).includes(currentStepName) && {
              display: 'none',
            },
          ]}
        >
          <Button variant="primary" fullWidth onPress={handleNext}>
            Next
          </Button>
        </SafeAreaView>

        <Paywall 
          visible={showPaywall} 
          onClose={() => {
            setShowPaywall(false);
            handleNext();
          }} 
        />
      </View>
    </View>
  );
}

interface MagicMomentProps {
  onComplete: () => void;
  data: QuizData;
  onUpdateData: (updates: Partial<QuizData>) => void;
}

function ConfettiPiece({ index }: { index: number }) {
  const size = Math.random() * 8 + 4;
  const colors = [neonGreen, '#4ade80', '#22c55e', '#86efac', '#ffffff'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const angle = (Math.random() * Math.PI * 2);
    const distance = Math.random() * 150 + 50;
    
    scale.value = withSpring(1);
    translateX.value = withTiming(Math.cos(angle) * distance, { duration: 1000 });
    translateY.value = withTiming(Math.sin(angle) * distance - 100, { duration: 1000 });
    opacity.value = withTiming(0, { duration: 1000 });
    rotate.value = withTiming(Math.random() * 360, { duration: 1000 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: size / 2,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
  }));

  return <Reanimated.View style={animatedStyle} />;
}

function AnimatedGoalOption({ 
  goal, 
  isSelected, 
  onPress 
}: { 
  goal: any, 
  isSelected: boolean, 
  index: number, 
  onPress: () => void 
}) {
  // Simplified - no individual entrance animations to avoid conflicts with page transitions
  return (
    <TouchableOpacity 
      style={[styles.optionCard, isSelected && styles.activeOptionCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image 
        source={goal.image} 
        style={styles.goalIcon} 
        contentFit="contain"
        transition={200}
        cachePolicy="memory"
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, isSelected && styles.activeText]}>
          {goal.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AnimatedActivityOption({ 
  level, 
  isSelected, 
  onPress 
}: { 
  level: any, 
  isSelected: boolean, 
  index: number, 
  onPress: () => void 
}) {
  // Simplified - no individual entrance animations to avoid conflicts with page transitions
  return (
    <TouchableOpacity 
      style={[styles.optionCard, isSelected && styles.activeOptionCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image 
        source={level.image} 
        style={styles.goalIcon} 
        contentFit="contain"
        transition={200}
        cachePolicy="memory"
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, isSelected && styles.activeText]}>
          {level.label}
        </Text>
        <Text style={styles.optionDesc}>{level.desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

function StaggeredMacroItem({ 
  label, 
  value, 
  unit, 
  delay,
  isHeadline = false
}: { 
  label: string, 
  value: number, 
  unit: string, 
  delay: number,
  isHeadline?: boolean
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(15);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View style={[
      styles.macroItem, 
      isHeadline && styles.headlineMacroItem,
      animatedStyle
    ]}>
      <Text 
        style={[styles.macroValue, isHeadline && styles.headlineValue]}
        allowFontScaling={false}
      >
        {value}{unit}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </Reanimated.View>
  );
}

function MagicMoment({ onComplete, data, onUpdateData }: MagicMomentProps) {
  const [loading, setLoading] = useState(true);
  const [calculation, setCalculation] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [hasCalculated, setHasCalculated] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const cardTranslateY = useSharedValue(20);
  const cardOpacity = useSharedValue(0);

  const loadingMessages = [
    "Analyzing your profile...",
    "Calculating your metabolic rate...",
    "Optimizing macros for your goal...",
    "Personalizing your recipe feed...",
    "Finalizing your plan..."
  ];

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Map onboarding goal id → NutritionGoalType
  const goalMap: Record<string, NutritionGoalType> = {
    'lose_weight': 'weight_loss',
    'build_muscle': 'weight_gain',
    'plant_based': 'maintenance',
    'track_habits': 'maintenance',
  };

  // Map pace label → GoalPace used by the engine
  const paceMap: Record<string, 'slow' | 'moderate' | 'aggressive'> = {
    'gentle': 'slow',
    'standard': 'moderate',
    'aggressive': 'aggressive',
  };

  // Map onboarding activity level id → typed ActivityLevel
  const activityLevelMap: Record<string, ActivityLevel> = {
    'sedentary': 'sedentary',
    'light': 'light',
    'active': 'active',
    'very_active': 'very_active',
  };

  // Calculate macros using the shared goalEngine
  const calculateMacros = (pace: 'gentle' | 'standard' | 'aggressive') => {
    const goalType = goalMap[data.goal] || 'maintenance';
    const activityLevel = activityLevelMap[data.activityLevel] || 'light';

    const result = calculateGoalTargets({
      profile: {
        sex: data.gender as BiologicalSex,
        ageYears: data.age,
        heightCm: data.height,
        weightKg: data.weight,
        activityLevel,
      },
      goalType,
      pace: goalType === 'maintenance' ? undefined : paceMap[pace],
    });

    const t = result.dailyTargets;
    return {
      calories: Math.round(t.calories),
      protein: Math.round(t.proteinGrams),
      carbs: Math.round(t.carbGrams),
      fat: Math.round(t.fatGrams),
    };
  };

  // Initial calculation with loading state
  useEffect(() => {
    if (!hasCalculated) {
      const results = calculateMacros(data.pace);
      setCalculation(results);
      onUpdateData({
        targetCalories: results.calories,
        targetProtein: results.protein,
        targetCarbs: results.carbs,
        targetFat: results.fat,
      });

      const timer = setTimeout(() => {
        setLoading(false);
        setHasCalculated(true);
        setShowConfetti(true);
        
        // Impact Moment
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 90 });
        cardOpacity.value = withTiming(1, { duration: 500 });
        
        // Hide confetti after burst
        setTimeout(() => setShowConfetti(false), 2000);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Recalculate when pace changes (after initial load)
  useEffect(() => {
    if (hasCalculated) {
      const results = calculateMacros(data.pace);
      setCalculation(results);
      onUpdateData({
        targetCalories: results.calories,
        targetProtein: results.protein,
        targetCarbs: results.carbs,
        targetFat: results.fat,
      });
    }
  }, [data.pace, hasCalculated, onUpdateData]);

  const handlePaceChange = (pace: 'gentle' | 'standard' | 'aggressive') => {
    onUpdateData({ pace });
  };

  const cardStyle = useAnimatedStyle(() => ({
    width: '100%',
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  if (loading) {
    return (
      <View style={styles.magicLoadingContainer}>
        {/* Spinning MealScanner Logo */}
        <AnimatedLogo size={60} playIntro={false} />
        
        {/* Dancing Veggies Animation */}
        <View style={styles.veggiesWrapper}>
          <SpriteAnimation
            frames={spriteFrames}
            fps={12}
            loop={true}
            width={340}
            height={340}
          />
        </View>
        
        <Text style={styles.magicTitleLoading}>Creating your plan</Text>
        
        <View style={styles.messageWrapper}>
          <Text style={styles.magicTextDynamic}>
            {loadingMessages[loadingMessageIndex]}
          </Text>
        </View>

        <View style={styles.loadingProgressTrack}>
          <View 
            style={[
              styles.loadingProgressBar, 
              { width: `${((loadingMessageIndex + 1) / loadingMessages.length) * 100}%` }
            ]} 
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.magicContainer}>
      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </View>
        </View>
      )}

      <Text style={[styles.magicTitle, { marginBottom: 32 }]}>Here's your starting target</Text>
      
      <Reanimated.View style={[styles.planCard, cardStyle]}>
        <View style={styles.macroGrid}>
          {/* Headline Calorie Section */}
          <View style={styles.calorieHeadline}>
            <StaggeredMacroItem 
              label="Daily Calories" 
              value={calculation.calories} 
              unit="" 
              delay={500} 
              isHeadline 
            />
          </View>

          {/* Three-column Macro Row */}
          <View style={styles.macroRow}>
            {[
              { label: 'Protein', value: calculation.protein, unit: 'g' },
              { label: 'Carbs', value: calculation.carbs, unit: 'g' },
              { label: 'Fat', value: calculation.fat, unit: 'g' }
            ].map((item, i) => (
              <StaggeredMacroItem 
                key={item.label} 
                label={item.label} 
                value={item.value} 
                unit={item.unit} 
                delay={700 + (i * 100)} 
              />
            ))}
          </View>
        </View>

        <View style={styles.paceContainer}>
          <Text style={styles.paceLabel}>Choose your pace</Text>
          <View style={styles.paceSelector}>
            {(['gentle', 'standard', 'aggressive'] as const).map((p) => (
              <TouchableOpacity 
                key={p}
                style={[styles.paceButton, data.pace === p && styles.activePaceButton]}
                onPress={() => handlePaceChange(p)}
              >
                <Text style={[styles.paceText, data.pace === p && styles.activePaceText]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.planBlurb}>
          You can adjust your plan anytime from your settings.
        </Text>
      </Reanimated.View>

      <Button variant="primary" fullWidth onPress={onComplete} style={styles.startButton}>
        Start tracking
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: bgPrimary,
  },
  safeAreaTop: {
    backgroundColor: bgPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: neonGreen,
    borderRadius: 3,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  stepTitle: {
    ...TextStyles.h2,
    color: '#FFFFFF',
    fontFamily: 'Telegraf_800UltraBold',
    marginBottom: 24,
    fontSize: 26,
    textAlign: 'center',
  },
  characterImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  characterImage: {
    width: 120,
    height: 120,
  },
  stepDesc: {
    ...TextStyles.body,
    color: textMuted,
    marginBottom: 32,
    lineHeight: 24,
  },
  stepIcon: {
    alignSelf: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: glassSurface,
  },
  activeButton: {
    borderColor: neonGreen,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  genderText: {
    ...TextStyles.body,
    color: textMuted,
  },
  activeText: {
    color: neonGreen,
  },
  inputGroup: {
    marginBottom: 16,
  },
  cleanInput: {
    fontSize: 32,
    color: neonGreen,
    fontFamily: 'Telegraf_800UltraBold',
    textAlign: 'center',
    paddingVertical: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
    marginHorizontal: 40,
  },
  rulerGroup: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitOption: {
    fontSize: 13,
    color: textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unitOptionActive: {
    color: neonGreen,
    fontWeight: '600',
  },
  unitDivider: {
    color: glassBorder,
    fontSize: 13,
  },
  inputLabel: {
    ...TextStyles.caption,
    color: textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: glassSurface,
    gap: 12,
  },
  activeOptionCard: {
    borderColor: neonGreen,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  goalIcon: {
    width: 68,
    height: 68,
  },
  optionLabel: {
    ...TextStyles.h3,
    color: '#FFF',
    fontSize: 18,
  },
  sourceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionDesc: {
    ...TextStyles.caption,
    color: textMuted,
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: glassSurface,
  },
  activeChip: {
    borderColor: neonGreen,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  chipText: {
    ...TextStyles.body,
    color: textMuted,
  },
  sectionLabel: {
    ...TextStyles.caption,
    color: textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    textAlign: 'center',
  },
  allergySection: {
    marginTop: 28,
  },
  allergyInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  allergyInputWrapper: {
    flex: 1,
  },
  addAllergyButton: {
    backgroundColor: glassSurface,
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allergyChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  allergyChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeIcon: {
    marginLeft: 2,
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  magicContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  magicLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -40,
  },
  veggiesWrapper: {
    marginTop: -30,
    marginBottom: -10,
  },
  magicTitleLoading: {
    ...TextStyles.h2,
    color: '#FFFFFF',
    fontFamily: 'Telegraf_800UltraBold',
    fontSize: 24,
    marginBottom: 12,
  },
  messageWrapper: {
    height: 30,
    justifyContent: 'center',
  },
  magicTextDynamic: {
    ...TextStyles.body,
    textAlign: 'center',
    color: neonGreen,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingProgressTrack: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 32,
    overflow: 'hidden',
  },
  loadingProgressBar: {
    height: '100%',
    backgroundColor: neonGreen,
    borderRadius: 2,
  },
  magicText: {
    ...TextStyles.body,
    textAlign: 'center',
    color: textMuted,
    marginTop: 32,
    paddingHorizontal: 40,
    lineHeight: 28,
  },
  magicTitle: {
    ...TextStyles.h2,
    color: neonGreen,
    fontFamily: 'Telegraf_800UltraBold',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 24,
  },
  spinIcon: {
    // We would use an actual animated spinner or mascot here
  },
  spinnerWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  planCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: glassBorder,
  },
  planLabel: {
    ...TextStyles.body,
    color: textMuted,
  },
  planValue: {
    ...TextStyles.h3,
    color: neonGreen,
  },
  planBlurb: {
    ...TextStyles.body,
    color: textMuted,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    paddingHorizontal: 10,
  },
  macroGrid: {
    gap: 12,
    marginBottom: 20,
  },
  calorieHeadline: {
    width: '100%',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineMacroItem: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    marginBottom: 4,
  },
  macroValue: {
    ...TextStyles.h3,
    color: neonGreen,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Telegraf_800UltraBold',
  },
  headlineValue: {
    fontSize: 48,
    lineHeight: 56,
  },
  macroLabel: {
    ...TextStyles.caption,
    color: textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  paceContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  paceLabel: {
    ...TextStyles.caption,
    color: textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  paceSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  paceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: glassSurface,
    alignItems: 'center',
  },
  activePaceButton: {
    borderColor: neonGreen,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  paceText: {
    ...TextStyles.caption,
    color: textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  activePaceText: {
    color: neonGreen,
  },
  startButton: {
    marginTop: 32,
  },
  socialButtons: {
    gap: 16,
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: glassBorder,
  },
  dividerText: {
    ...TextStyles.caption,
    color: textMuted,
    marginHorizontal: 16,
  },
  errorText: {
    ...TextStyles.caption,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  signInLink: {
    ...TextStyles.body,
    color: textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  tosDisclaimer: {
    ...TextStyles.caption,
    color: textMuted,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  tosLink: {
    color: neonGreen,
    textDecorationLine: 'underline',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neonGreen,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 6,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
  },
  proFeaturesContainer: {
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    width: '100%',
  },
  proFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  featureIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proFeatureText: {
    ...TextStyles.body,
    color: '#FFF',
    fontSize: 15,
  },
  proButton: {
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  skipProButton: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipProText: {
    ...TextStyles.body,
    color: textMuted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

