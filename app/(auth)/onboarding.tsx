import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  ScrollView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RulerSlider } from '@/components/onboarding/RulerSlider';
import { Colors, neonGreen, textMuted, bgPrimary, glassBorder, glassSurface } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { FoodIllustration, FoodType } from '@/components/illustrations/FoodIllustrations';
import { supabase, signInWithApple, signInWithGoogle } from '@/lib/supabase';
import { Paywall } from '@/components/subscription/Paywall';

const { width } = Dimensions.get('window');

type QuizData = {
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number;
  weight: number;
  goal: string;
  source: string;
  activityLevel: string;
  dietaryPreferences: string[];
};

const GOALS = [
  { id: 'lose_weight', label: 'Lose weight sustainably', icon: 'apple' as FoodType },
  { id: 'build_muscle', label: 'Build muscle & strength', icon: 'burger' as FoodType },
  { id: 'plant_based', label: 'Eat more plant-based foods', icon: 'salad' as FoodType },
  { id: 'track_habits', label: 'Just track my habits', icon: 'coffee' as FoodType },
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
  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise' },
  { id: 'light', label: 'Lightly Active', desc: '1–2 workouts/week' },
  { id: 'active', label: 'Active', desc: '3–5 workouts/week' },
  { id: 'very_active', label: 'Very Active', desc: 'Daily intense training' },
];

const DIETARY_PREFERENCES = [
  'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'None'
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
    gender: 'female',
    age: 25,
    height: 170, // Always stored in cm
    weight: 70,  // Always stored in kg
    goal: '',
    source: '',
    activityLevel: '',
    dietaryPreferences: [],
  });
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
        const goalMap: Record<string, string> = {
          'lose_weight': 'weight_loss',
          'build_muscle': 'muscle_gain',
          'plant_based': 'health',
          'track_habits': 'maintenance'
        };

        // Save user goals
        await supabase.from('user_goals').upsert({
          user_id: data.user.id,
          goal_type: goalMap[quizData.goal] || 'health',
          activity_level: quizData.activityLevel,
          dietary_restrictions: quizData.dietaryPreferences,
          updated_at: new Date().toISOString()
        });

        // Update profile
        await supabase.from('profiles').update({
          full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
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
    });
  };

  const updateData = (updates: Partial<QuizData>) => {
    setQuizData(prev => ({ ...prev, ...updates }));
  };

  const toggleDietary = (pref: string) => {
    const current = quizData.dietaryPreferences;
    if (current.includes(pref)) {
      updateData({ dietaryPreferences: current.filter(p => p !== pref) });
    } else {
      updateData({ dietaryPreferences: [...current, pref] });
    }
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
      case 0: // Physicals
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            
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
              <Input 
                keyboardType="number-pad"
                value={quizData.age.toString()}
                onChangeText={(v) => updateData({ age: parseInt(v) || 0 })}
                placeholder="25"
              />
            </View>

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

      case 1: // Goal
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What is your primary focus?</Text>
            <View style={styles.optionsContainer}>
              {GOALS.map((goal) => (
                <TouchableOpacity 
                  key={goal.id}
                  style={[styles.optionCard, quizData.goal === goal.id && styles.activeOptionCard]}
                  onPress={() => {
                    updateData({ goal: goal.id });
                    handleNext();
                  }}
                >
                  <FoodIllustration type={goal.icon} size={40} />
                  <Text style={[styles.optionLabel, quizData.goal === goal.id && styles.activeText]}>
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
                  onPress={() => {
                    updateData({ source: source.id });
                    handleNext();
                  }}
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
            <View style={styles.characterImageContainer}>
              <Image 
                source={require('@/assets/images/foodcharacter-screen4.png')} 
                style={styles.characterImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.optionsContainer}>
              {ACTIVITY_LEVELS.map((level) => (
                <TouchableOpacity 
                  key={level.id}
                  style={[styles.optionCard, quizData.activityLevel === level.id && styles.activeOptionCard]}
                  onPress={() => {
                    updateData({ activityLevel: level.id });
                    handleNext();
                  }}
                >
                  <View>
                    <Text style={[styles.optionLabel, quizData.activityLevel === level.id && styles.activeText]}>
                      {level.label}
                    </Text>
                    <Text style={styles.optionDesc}>{level.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4: // Dietary
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Any dietary preferences or allergies?</Text>
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
          </View>
        );

      case 5: // Magic Moment
        return <MagicMoment onComplete={handleNext} data={quizData} />;

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
            <Button variant="primary" fullWidth onPress={handleNext}>
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
            contentContainerStyle={styles.scrollContent}
          >
            {renderStep()}
          </ScrollView>
        </Animated.View>

        {currentStep < 5 && currentStep !== 1 && currentStep !== 2 && currentStep !== 3 && (
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

function MagicMoment({ onComplete, data }: { onComplete: () => void, data: QuizData }) {
  const [loading, setLoading] = useState(true);
  const [calculation, setCalculation] = useState({ calories: 0, protein: 0 });

  useEffect(() => {
    // Calculate BMR and TDEE
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
    if (data.goal === 'lose_weight') tdee -= 500;
    if (data.goal === 'build_muscle') tdee += 300;
    
    // Protein calculation
    const proteinMult = data.goal === 'build_muscle' ? 2.2 : 1.8;
    const protein = data.weight * proteinMult;

    setCalculation({ 
      calories: Math.round(tdee), 
      protein: Math.round(protein) 
    });

    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [data]);

  if (loading) {
    return (
      <View style={styles.magicContainer}>
        <View style={styles.spinnerWrapper}>
          <FontAwesome name="spinner" size={60} color={neonGreen} style={styles.spinIcon} />
        </View>
        <Text style={styles.magicText}>
          Calculating your daily fuel and personalizing your recipe feed...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.magicContainer}>
      <Text style={styles.magicTitle}>Your Personalized Plan is Ready!</Text>
      <View style={styles.planCard}>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Daily Target</Text>
          <Text style={styles.planValue}>{calculation.calories} kcal</Text>
        </View>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Protein</Text>
          <Text style={styles.planValue}>{calculation.protein}g</Text>
        </View>
        <Text style={styles.planBlurb}>
          Thank you for trusting us. Based on your {data.activityLevel.replace('_', ' ')} lifestyle and goal to {data.goal.replace('_', ' ')}, we've designed a sustainable path to success.
        </Text>
      </View>
      <Button variant="primary" fullWidth onPress={onComplete} style={{ marginTop: 24 }}>
        See My Plan
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
    marginBottom: 20,
    fontSize: 26,
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
    marginBottom: 20,
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
    marginBottom: 20,
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
    gap: 16,
  },
  activeOptionCard: {
    borderColor: neonGreen,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
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
    gap: 12,
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
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  magicContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
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
    marginBottom: 32,
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
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
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

