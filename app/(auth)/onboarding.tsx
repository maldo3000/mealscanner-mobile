import { RulerSlider } from '@/components/onboarding/RulerSlider';
import { Paywall } from '@/components/subscription/Paywall';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SpriteAnimation } from '@/components/ui/SpriteAnimation';
import { bgPrimary, glassBorder, glassSurface, neonGreen, textMuted } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { localGoalsRepository } from '@/lib/goals/LocalGoalsRepository';
import type { ActivityLevel, BiologicalSex, NutritionGoal, NutritionGoalType } from '@/lib/goals/types';
import { signInWithApple, signInWithGoogle, supabase } from '@/lib/supabase';
import { AppleHealthService } from '@/lib/health/AppleHealthService';
import { BiologicalSex as HKBiologicalSex } from '@kingstinct/react-native-healthkit';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import dancing veggies sprite frames
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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [useMetric, setUseMetric] = useState(true);
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


  // Display values based on unit system
  const displayHeight = useMetric ? quizData.height : Math.round(quizData.height / 2.54); // inches for imperial
  const displayWeight = useMetric ? quizData.weight : kgToLbs(quizData.weight);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    
    try {
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
      
      if (data.user && !data.session) {
        // Email verification required
        router.push({ pathname: '/(auth)/verify', params: { email } });
      }
      // If data.session exists, RootLayoutNav will handle redirect
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
      const { data, error } = provider === 'apple' 
        ? await signInWithApple() 
        : await signInWithGoogle();
        
      if (error) throw error;
      
      // If data is null and no error, it means user canceled
      if (!data) return;

      // Update profile and goals with onboarding data if it's a new user
      if (data.user) {
        // Map onboarding goal to database goal_type
        const goalMap: Record<string, NutritionGoalType> = {
          'lose_weight': 'weight_loss',
          'build_muscle': 'weight_gain',
          'plant_based': 'maintenance',
          'track_habits': 'maintenance'
        };

        // Map activity level to typed ActivityLevel
        const activityLevelMap: Record<string, ActivityLevel> = {
          'sedentary': 'sedentary',
          'light': 'light',
          'active': 'active',
          'very_active': 'very_active',
        };

        const goalType = goalMap[quizData.goal] || 'maintenance';
        const activityLevel = activityLevelMap[quizData.activityLevel] || 'light';
        const nowIso = new Date().toISOString();

        // Save user goals to Supabase
        await supabase.from('user_goals').upsert({
          user_id: data.user.id,
          goal_type: goalType,
          activity_level: quizData.activityLevel,
          dietary_restrictions: [...quizData.dietaryPreferences, ...quizData.allergies],
          target_calories: quizData.targetCalories,
          target_protein: quizData.targetProtein,
          target_carbs: quizData.targetCarbs,
          target_fat: quizData.targetFat,
          updated_at: nowIso
        });

        // Also save to local storage for immediate availability in settings
        const localGoal: NutritionGoal = {
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
        await localGoalsRepository.saveGoal(localGoal, data.user.id);

        // Update profile
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

  const totalSteps = 10; // Physicals, Goal, Source, Activity, Dietary, Magic, Pro, Health, Notifications, Account

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
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      
      // Small delay to allow React to render the new step before starting fade-in
      setTimeout(() => {
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 50);
    });
  };

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

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Goal (First screen now)
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

      case 1: // Physicals (with Name added)
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
                  <TouchableOpacity onPress={() => setUseMetric(true)}>
                    <Text style={[styles.unitOption, useMetric && styles.unitOptionActive]}>cm</Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>/</Text>
                  <TouchableOpacity onPress={() => setUseMetric(false)}>
                    <Text style={[styles.unitOption, !useMetric && styles.unitOptionActive]}>ft</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <RulerSlider 
                min={useMetric ? 100 : 48}
                max={useMetric ? 250 : 96}
                value={displayHeight} 
                onValueChange={(v) => {
                  const heightInCm = useMetric ? v : Math.round(v * 2.54);
                  updateData({ height: heightInCm });
                }} 
                unit={useMetric ? 'cm' : 'ft'}
                formatValue={useMetric ? undefined : (inches) => {
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
                  <TouchableOpacity onPress={() => setUseMetric(true)}>
                    <Text style={[styles.unitOption, useMetric && styles.unitOptionActive]}>kg</Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>/</Text>
                  <TouchableOpacity onPress={() => setUseMetric(false)}>
                    <Text style={[styles.unitOption, !useMetric && styles.unitOptionActive]}>lbs</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <RulerSlider 
                min={useMetric ? 30 : 66}
                max={useMetric ? 200 : 440}
                value={displayWeight} 
                onValueChange={(v) => {
                  const weightInKg = useMetric ? v : lbsToKg(v);
                  updateData({ weight: weightInKg });
                }} 
                unit={useMetric ? 'kg' : 'lbs'}
              />
            </View>
          </View>
        );

      case 2: // Source
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

      case 3: // Activity
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

      case 4: // Dietary & Allergies
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

      case 5: // Magic Moment
        return <MagicMoment onComplete={handleNext} data={quizData} onUpdateData={updateData} />;

      case 6: // Pro Prompt
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
                'Custom AI recipe generation',
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

      case 7: // Apple Health (Was 6)
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
            <Button variant="ghost" fullWidth onPress={handleNext}>
              Skip for now
            </Button>
          </View>
        );

      case 8: // Notifications (Was 7)
        return (
          <View style={styles.stepContent}>
            <FontAwesome name="bell" size={80} color={neonGreen} style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Stay on track</Text>
            <Text style={styles.stepDesc}>
              Get personalized reminders to log your meals and tips to reach your goals.
            </Text>
            <Button variant="primary" fullWidth onPress={handleNext}>
              Allow Notifications
            </Button>
            <Button variant="ghost" fullWidth onPress={handleNext}>
              Not now
            </Button>
          </View>
        );

      case 9: // Account Creation (Was 8)
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
                secureTextEntry
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

        <Animated.View style={[
          styles.content, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
            ]}
          >
            {renderStep()}
          </ScrollView>
        </Animated.View>

        {currentStep < 5 && currentStep !== 0 && currentStep !== 2 && currentStep !== 3 && (
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <Button variant="primary" fullWidth onPress={handleNext}>
              Next
            </Button>
          </SafeAreaView>
        )}

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
  index, 
  onPress 
}: { 
  goal: any, 
  isSelected: boolean, 
  index: number, 
  onPress: () => void 
}) {
  const scale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const delay = index * 100;

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
    textOpacity.value = withDelay(delay + 200, withTiming(1, { duration: 400 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <TouchableOpacity 
      style={[styles.optionCard, isSelected && styles.activeOptionCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Reanimated.View style={iconStyle}>
        <Image 
          source={goal.image} 
          style={styles.goalIcon} 
          contentFit="contain"
          transition={200}
          cachePolicy="memory"
        />
      </Reanimated.View>
      <Reanimated.View style={[textStyle, { flex: 1 }]}>
        <Text style={[styles.optionLabel, isSelected && styles.activeText]}>
          {goal.label}
        </Text>
      </Reanimated.View>
    </TouchableOpacity>
  );
}

function AnimatedActivityOption({ 
  level, 
  isSelected, 
  index, 
  onPress 
}: { 
  level: any, 
  isSelected: boolean, 
  index: number, 
  onPress: () => void 
}) {
  const scale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const delay = index * 100;

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
    textOpacity.value = withDelay(delay + 200, withTiming(1, { duration: 400 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <TouchableOpacity 
      style={[styles.optionCard, isSelected && styles.activeOptionCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Reanimated.View style={iconStyle}>
        <Image 
          source={level.image} 
          style={styles.goalIcon} 
          contentFit="contain"
          transition={200}
          cachePolicy="memory"
        />
      </Reanimated.View>
      <Reanimated.View style={[textStyle, { flex: 1 }]}>
        <Text style={[styles.optionLabel, isSelected && styles.activeText]}>
          {level.label}
        </Text>
        <Text style={styles.optionDesc}>{level.desc}</Text>
      </Reanimated.View>
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

  // Calculate macros based on data and pace
  const calculateMacros = (pace: 'gentle' | 'standard' | 'aggressive') => {
    const isMale = data.gender === 'male';
    const bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + (isMale ? 5 : -161);
    
    const multipliers: Record<string, number> = {
      'sedentary': 1.2,
      'light': 1.375,
      'active': 1.55,
      'very_active': 1.725
    };
    
    let tdee = bmr * (multipliers[data.activityLevel] || 1.375);
    
    // Goal adjustments
    if (data.goal === 'lose_weight') {
      // Pace modifiers for weight loss
      const paceDeficits: Record<string, number> = {
        'gentle': 250,
        'standard': 500,
        'aggressive': 750
      };
      tdee -= paceDeficits[pace];
    } else if (data.goal === 'build_muscle') {
      // Pace modifiers for muscle gain
      const paceSurplus: Record<string, number> = {
        'gentle': 150,
        'standard': 300,
        'aggressive': 500
      };
      tdee += paceSurplus[pace];
    }
    
    // Protein calculation
    const proteinMult = data.goal === 'build_muscle' ? 2.2 : 1.8;
    const protein = data.weight * proteinMult;
    
    // Fat is ~25% of calories
    const fat = (tdee * 0.25) / 9;
    
    // Carbs fill the rest
    const carbs = (tdee - (protein * 4) - (fat * 9)) / 4;

    return { 
      calories: Math.round(tdee), 
      protein: Math.round(protein),
      carbs: Math.round(Math.max(0, carbs)),
      fat: Math.round(fat)
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

