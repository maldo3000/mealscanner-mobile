import React, { useEffect, useState, useRef } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { GoalCalculationSheet } from '@/components/nutrition/GoalCalculationSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { Colors, neonGreen } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import type {
  ActivityLevel,
  BiologicalSex,
  GoalPace,
  NutritionGoalType,
} from '@/lib/goals/types';
import { calculateGoalTargets } from '@/lib/goals/goalEngine';

/** Pure helper – parse a string to a number, or return undefined if empty / NaN. */
const parseNumeric = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

interface EnumOption<T> {
  label: string;
  value: T;
  description?: string;
}

const sexOptions: EnumOption<BiologicalSex>[] = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Other', value: 'other' },
];

const activityOptions: EnumOption<ActivityLevel>[] = [
  { label: 'Low', value: 'sedentary', description: 'Desk job, little exercise' },
  { label: 'Light', value: 'light', description: '1–3 workouts/week' },
  { label: 'Moderate', value: 'moderate', description: '3–5 workouts/week' },
  { label: 'Active', value: 'active', description: 'Daily training / active job' },
  { label: 'Very Active', value: 'very_active', description: 'Athlete / very physical work' },
];

const goalTypeOptions: EnumOption<NutritionGoalType>[] = [
  { label: 'Lose weight', value: 'weight_loss' },
  { label: 'Maintain', value: 'maintenance' },
  { label: 'Gain weight', value: 'weight_gain' },
  { label: 'Custom', value: 'custom' },
];

const paceOptions: EnumOption<GoalPace>[] = [
  { label: 'Gentle', value: 'slow' },
  { label: 'Standard', value: 'moderate' },
  { label: 'Faster', value: 'aggressive' },
];

// ─── Unit conversion helpers ────────────────────────────────────────────────
const kgToLbs = (kg: number) => Math.round(kg * 2.205);
const lbsToKg = (lbs: number) => Math.round(lbs / 2.205);
const cmToInches = (cm: number) => Math.round(cm / 2.54);
const inchesToCm = (inches: number) => Math.round(inches * 2.54);

const formatFeetInches = (totalInches: number): string => {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
};

const presetQualitativeGoals = [
  'Improve fibre intake',
  'Eat less carbs',
  'Eat less sugar',
  'Eat less fat',
  'Manage diabetes',
  'Increase protein',
  'Reduce sodium',
  'Eat more vegetables',
  'Limit processed foods',
  'Improve hydration',
];

function GoalWizard({ onShowCalculationInfo }: { onShowCalculationInfo: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeGoal, setGoalFromWizard, loading, error } = useNutritionGoals();

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  const [sex, setSex] = useState<BiologicalSex>(activeGoal?.profileSnapshot.sex ?? 'female');
  const [ageYears, setAgeYears] = useState<string>(
    activeGoal?.profileSnapshot.ageYears != null
      ? String(activeGoal.profileSnapshot.ageYears)
      : '',
  );

  // Height and weight each have their own metric/imperial toggle.
  const [heightMetric, setHeightMetric] = useState(true);
  const [weightMetric, setWeightMetric] = useState(true);

  const [heightDisplay, setHeightDisplay] = useState<string>(
    activeGoal ? String(activeGoal.profileSnapshot.heightCm) : '',
  );
  const [weightDisplay, setWeightDisplay] = useState<string>(
    activeGoal ? String(activeGoal.profileSnapshot.weightKg) : '',
  );

  const getHeightCm = (): number | undefined => {
    const val = parseNumeric(heightDisplay);
    if (val == null) return undefined;
    return heightMetric ? val : inchesToCm(val);
  };

  const getWeightKg = (): number | undefined => {
    const val = parseNumeric(weightDisplay);
    if (val == null) return undefined;
    return weightMetric ? val : lbsToKg(val);
  };

  const handleToggleHeightUnit = (metric: boolean) => {
    if (metric === heightMetric) return;
    const hVal = parseNumeric(heightDisplay);
    if (hVal != null) {
      const cm = heightMetric ? hVal : inchesToCm(hVal);
      setHeightDisplay(String(metric ? cm : cmToInches(cm)));
    }
    setHeightMetric(metric);
  };

  const handleToggleWeightUnit = (metric: boolean) => {
    if (metric === weightMetric) return;
    const wVal = parseNumeric(weightDisplay);
    if (wVal != null) {
      const kg = weightMetric ? wVal : lbsToKg(wVal);
      setWeightDisplay(String(metric ? kg : kgToLbs(kg)));
    }
    setWeightMetric(metric);
  };

  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    activeGoal?.profileSnapshot.activityLevel ?? 'light',
  );
  const [goalType, setGoalType] = useState<NutritionGoalType>(
    activeGoal?.type ?? 'weight_loss',
  );
  const [pace, setPace] = useState<GoalPace>('moderate');

  const [customCalories, setCustomCalories] = useState<string>(
    activeGoal?.dailyTargets.calories != null ? String(Math.round(activeGoal.dailyTargets.calories)) : '',
  );
  const [customProtein, setCustomProtein] = useState<string>(
    activeGoal?.dailyTargets.proteinGrams != null ? String(Math.round(activeGoal.dailyTargets.proteinGrams)) : '',
  );
  const [customCarbs, setCustomCarbs] = useState<string>(
    activeGoal?.dailyTargets.carbGrams != null ? String(Math.round(activeGoal.dailyTargets.carbGrams)) : '',
  );
  const [customFat, setCustomFat] = useState<string>(
    activeGoal?.dailyTargets.fatGrams != null ? String(Math.round(activeGoal.dailyTargets.fatGrams)) : '',
  );
  const [customFibre, setCustomFibre] = useState<string>(
    activeGoal?.dailyTargets.fibreGrams != null ? String(Math.round(activeGoal.dailyTargets.fibreGrams)) : '',
  );

  const [selectedQualitativeGoals, setSelectedQualitativeGoals] = useState<string[]>(
    activeGoal?.meta?.focusAreas ?? [],
  );
  const [customGoalInput, setCustomGoalInput] = useState<string>('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Clear stale feedback whenever the user edits any form field
  useEffect(() => {
    setValidationError(null);
    setSaveMessage(null);
  }, [sex, ageYears, heightDisplay, weightDisplay, heightMetric, weightMetric,
      activityLevel, goalType, pace, selectedQualitativeGoals,
      customCalories, customProtein, customCarbs, customFat, customFibre]);

  // Track if we've already synced from activeGoal to avoid overwriting user edits
  const hasSyncedFromGoal = useRef(false);

  // Sync local state from activeGoal when it loads (only once after initial load)
  useEffect(() => {
    if (!loading && activeGoal && !hasSyncedFromGoal.current) {
      hasSyncedFromGoal.current = true;
      setSex(activeGoal.profileSnapshot.sex);
      setAgeYears(
        activeGoal.profileSnapshot.ageYears != null
          ? String(activeGoal.profileSnapshot.ageYears)
          : '',
      );
      // Sync height/weight (stored in metric, convert for display if needed)
      const cm = activeGoal.profileSnapshot.heightCm;
      const kg = activeGoal.profileSnapshot.weightKg;
      setHeightDisplay(String(heightMetric ? cm : cmToInches(cm)));
      setWeightDisplay(String(weightMetric ? kg : kgToLbs(kg)));

      setActivityLevel(activeGoal.profileSnapshot.activityLevel);
      setGoalType(activeGoal.type);
      setSelectedQualitativeGoals(activeGoal.meta?.focusAreas ?? []);

      // Sync target fields
      if (activeGoal.dailyTargets.calories != null) {
        setCustomCalories(String(Math.round(activeGoal.dailyTargets.calories)));
      }
      if (activeGoal.dailyTargets.proteinGrams != null) {
        setCustomProtein(String(Math.round(activeGoal.dailyTargets.proteinGrams)));
      }
      if (activeGoal.dailyTargets.carbGrams != null) {
        setCustomCarbs(String(Math.round(activeGoal.dailyTargets.carbGrams)));
      }
      if (activeGoal.dailyTargets.fatGrams != null) {
        setCustomFat(String(Math.round(activeGoal.dailyTargets.fatGrams)));
      }
      if (activeGoal.dailyTargets.fibreGrams != null) {
        setCustomFibre(String(Math.round(activeGoal.dailyTargets.fibreGrams)));
      }
    }
  }, [loading, activeGoal]);

  const heightCm = getHeightCm();
  const weightKg = getWeightKg();

  /** Build a list of missing profile fields, or null if everything is filled. */
  const getMissingFields = (): string | null => {
    const missing: string[] = [];
    if (parseNumeric(ageYears) == null) missing.push('age');
    if (heightCm == null) missing.push('height');
    if (weightKg == null) missing.push('weight');
    if (missing.length === 0) return null;
    return `Please enter your ${missing.join(', ')} to calculate targets.`;
  };

  const handleCalculateTargets = () => {
    Keyboard.dismiss();
    setSaveMessage(null);

    const missingMsg = getMissingFields();
    if (missingMsg) {
      setValidationError(missingMsg);
      return;
    }
    setValidationError(null);

    const age = parseNumeric(ageYears)!;

    const result = calculateGoalTargets({
      profile: { sex, ageYears: age, heightCm: heightCm!, weightKg: weightKg!, activityLevel },
      goalType,
      pace: goalType === 'maintenance' || goalType === 'custom' ? undefined : pace,
      focusAreas: selectedQualitativeGoals.length > 0 ? selectedQualitativeGoals : undefined,
    });

    const t = result.dailyTargets;
    setCustomCalories(String(Math.round(t.calories)));
    setCustomProtein(String(Math.round(t.proteinGrams)));
    setCustomCarbs(String(Math.round(t.carbGrams)));
    setCustomFat(String(Math.round(t.fatGrams)));
    setCustomFibre(String(Math.round(t.fibreGrams)));
  };

  const handleToggleQualitativeGoal = (goal: string) => {
    setSelectedQualitativeGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal],
    );
  };

  const handleAddCustomGoal = () => {
    const trimmed = customGoalInput.trim();
    if (trimmed && !selectedQualitativeGoals.includes(trimmed)) {
      setSelectedQualitativeGoals((prev) => [...prev, trimmed]);
      setCustomGoalInput('');
    }
  };

  const handleRemoveQualitativeGoal = (goal: string) => {
    setSelectedQualitativeGoals((prev) => prev.filter((g) => g !== goal));
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const missingMsg = getMissingFields();
    if (missingMsg) {
      setValidationError(missingMsg);
      return;
    }
    setValidationError(null);
    setSaving(true);

    try {
      const age = parseNumeric(ageYears)!;

      const name =
        goalType === 'weight_loss'
          ? 'Weight loss'
          : goalType === 'weight_gain'
          ? 'Weight gain'
          : goalType === 'maintenance'
          ? 'Maintenance'
          : 'Custom';

      await setGoalFromWizard({
        name,
        profile: { sex, ageYears: age, heightCm: heightCm!, weightKg: weightKg!, activityLevel },
        goalType,
        pace: goalType === 'maintenance' || goalType === 'custom' ? undefined : pace,
        focusAreas: selectedQualitativeGoals.length > 0 ? selectedQualitativeGoals : undefined,
        customCalories: parseNumeric(customCalories),
        customProteinGrams: parseNumeric(customProtein),
        customCarbGrams: parseNumeric(customCarbs),
        customFatGrams: parseNumeric(customFat),
        customFibreGrams: parseNumeric(customFibre),
        meta: selectedQualitativeGoals.length > 0
          ? { focusAreas: selectedQualitativeGoals }
          : undefined,
      });

      setSaveMessage('Goal saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
        <ContentContainer 
          scrollable
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.summaryContainer}>
            <Card variant="glass" padding="md">
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIcon}>
                  <IconSymbol name="target" size={20} color={neonGreen} />
                </View>
                <View style={styles.summaryTextContainer}>
                  <Text style={[TextStyles.body, { color: colors.text }]}>
                    {activeGoal ? 'Active goal' : 'No active goal'}
                  </Text>
                  <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                    {activeGoal
                      ? `${activeGoal.name} • ${formatMacro(
                          activeGoal.dailyTargets.calories,
                        )} kcal • ${formatMacro(
                          activeGoal.dailyTargets.proteinGrams,
                        )}g protein`
                      : 'Set a goal to personalise your feedback and daily targets.'}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          <Section title="Step 1 – Basics">
            <View style={styles.chipRow}>
              {sexOptions.map((option) => {
                const isSelected = option.value === sex;
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? 'primary' : 'glass'}
                    size="small"
                    onPress={() => setSex(option.value)}
                    style={styles.chipButton}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Input
                  label="Age"
                  keyboardType="number-pad"
                  value={ageYears}
                  onChangeText={setAgeYears}
                  placeholder="Years"
                />
              </View>
              <View style={styles.fieldColumn}>
                <View style={styles.labelWithToggle}>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Height</Text>
                  <View style={styles.unitToggle}>
                    <TouchableOpacity onPress={() => handleToggleHeightUnit(true)} hitSlop={8}>
                      <Text style={[styles.unitOption, heightMetric && { color: neonGreen, fontWeight: '600' as const }, !heightMetric && { color: colors.icon }]}>
                        cm
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.icon, fontSize: 12 }}>/</Text>
                    <TouchableOpacity onPress={() => handleToggleHeightUnit(false)} hitSlop={8}>
                      <Text style={[styles.unitOption, !heightMetric && { color: neonGreen, fontWeight: '600' as const }, heightMetric && { color: colors.icon }]}>
                        ft
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  keyboardType="number-pad"
                  value={heightDisplay}
                  onChangeText={setHeightDisplay}
                  placeholder={heightMetric ? 'cm' : 'inches'}
                  helperText={!heightMetric && heightDisplay ? formatFeetInches(Number(heightDisplay) || 0) : undefined}
                />
              </View>
              <View style={styles.fieldColumn}>
                <View style={styles.labelWithToggle}>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Weight</Text>
                  <View style={styles.unitToggle}>
                    <TouchableOpacity onPress={() => handleToggleWeightUnit(true)} hitSlop={8}>
                      <Text style={[styles.unitOption, weightMetric && { color: neonGreen, fontWeight: '600' as const }, !weightMetric && { color: colors.icon }]}>
                        kg
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.icon, fontSize: 12 }}>/</Text>
                    <TouchableOpacity onPress={() => handleToggleWeightUnit(false)} hitSlop={8}>
                      <Text style={[styles.unitOption, !weightMetric && { color: neonGreen, fontWeight: '600' as const }, weightMetric && { color: colors.icon }]}>
                        lbs
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  keyboardType="number-pad"
                  value={weightDisplay}
                  onChangeText={setWeightDisplay}
                  placeholder={weightMetric ? 'kg' : 'lbs'}
                />
              </View>
            </View>

            <View style={styles.activityContainer}>
              <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}>
                Activity level
              </Text>
              <View style={styles.activityGrid}>
                {activityOptions.map((option) => {
                  const isSelected = option.value === activityLevel;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.8}
                      style={{ flexBasis: '48%' }}
                      onPress={() => setActivityLevel(option.value)}
                      accessibilityLabel={option.label}
                      accessibilityHint="Sets your activity level for goal calculations"
                    >
                      <Card
                        variant="glass"
                        padding="sm"
                        style={[
                          styles.activityCard,
                          isSelected && { borderColor: neonGreen, borderWidth: 2 },
                        ]}
                      >
                        <Text
                          style={[
                            TextStyles.body,
                            { color: colors.text, marginBottom: Spacing.xs },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {option.description && (
                          <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                            {option.description}
                          </Text>
                        )}
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Section>

          <Section title="Step 2 – Goal" style={{ overflow: 'visible' }}>
            <View style={styles.chipRow}>
              {goalTypeOptions.map((option) => {
                const isSelected = option.value === goalType;
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? 'primary' : 'glass'}
                    size="small"
                    onPress={() => setGoalType(option.value)}
                    style={styles.chipButton}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </View>

            {(goalType === 'weight_loss' || goalType === 'weight_gain') && (
              <View style={styles.paceContainer}>
                <Text
                  style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}
                >
                  Pace
                </Text>
                <View style={styles.chipRow}>
                  {paceOptions.map((option) => {
                    const isSelected = option.value === pace;
                    return (
                      <Button
                        key={option.value}
                        variant={isSelected ? 'primary' : 'glass'}
                        size="small"
                        onPress={() => setPace(option.value)}
                        style={styles.chipButton}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </View>
              </View>
            )}
          </Section>

          <Section title="Step 3 – Focus Areas" style={{ overflow: 'visible' }}>
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}>
              Select goals that describe what you want to focus on. These influence your calculated targets.
            </Text>

            <View style={styles.chipRow}>
              {presetQualitativeGoals.map((goal) => {
                const isSelected = selectedQualitativeGoals.includes(goal);
                return (
                  <Button
                    key={goal}
                    variant={isSelected ? 'primary' : 'glass'}
                    size="small"
                    onPress={() => handleToggleQualitativeGoal(goal)}
                    style={styles.chipButton}
                  >
                    {goal}
                  </Button>
                );
              })}
            </View>

            {selectedQualitativeGoals.length > 0 && (
              <View style={styles.selectedGoalsContainer}>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}>
                  Your goals
                </Text>
                <View style={styles.goalsTagsContainer}>
                  {selectedQualitativeGoals.map((goal) => (
                    <View
                      key={goal}
                      style={[
                        styles.goalTag,
                        {
                          backgroundColor: `${neonGreen}20`,
                          borderColor: `${neonGreen}40`,
                        },
                      ]}
                    >
                      <Text style={[TextStyles.bodySmall, { color: colors.text }]}>
                        {goal}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveQualitativeGoal(goal)}
                        style={styles.removeButton}
                        accessibilityLabel={`Remove ${goal}`}
                        accessibilityRole="button"
                      >
                        <IconSymbol name="xmark.circle.fill" size={16} color={colors.icon} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.customGoalContainer}>
              <View style={styles.customGoalInputRow}>
                <Input
                  label="Add your own goal"
                  value={customGoalInput}
                  onChangeText={setCustomGoalInput}
                  placeholder="e.g., Manage my diabetes"
                  containerStyle={styles.customGoalInput}
                  onSubmitEditing={handleAddCustomGoal}
                  returnKeyType="done"
                />
                <Button
                  variant="glass"
                  size="small"
                  onPress={handleAddCustomGoal}
                  disabled={!customGoalInput.trim()}
                  style={styles.addButton}
                >
                  Add
                </Button>
              </View>
            </View>
          </Section>

          <Section title="Step 4 – Targets">
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md }]}>
              Enter your daily targets manually, or calculate them from your profile.
            </Text>

            <Button
              variant="secondary"
              size="medium"
              fullWidth
              onPress={handleCalculateTargets}
              icon={<IconSymbol name="sparkles" size={16} color={neonGreen} />}
              style={styles.calculateButton}
            >
              Calculate from profile
            </Button>
            
            <TouchableOpacity 
              onPress={onShowCalculationInfo}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: Spacing.lg }}
            >
              <IconSymbol name="info.circle" size={16} color={neonGreen} />
              <Text style={[TextStyles.bodySmall, { color: neonGreen, fontWeight: '600' }]}>
                How we calculate your targets
              </Text>
            </TouchableOpacity>

            <View style={styles.fieldRow}>
              <View style={styles.fieldColumnWide}>
                <Input
                  label="Calories"
                  keyboardType="number-pad"
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  placeholder="kcal / day"
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Input
                  label="Protein"
                  keyboardType="number-pad"
                  value={customProtein}
                  onChangeText={setCustomProtein}
                  placeholder="g"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Input
                  label="Carbs"
                  keyboardType="number-pad"
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                  placeholder="g"
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Input
                  label="Fat"
                  keyboardType="number-pad"
                  value={customFat}
                  onChangeText={setCustomFat}
                  placeholder="g"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Input
                  label="Fibre"
                  keyboardType="number-pad"
                  value={customFibre}
                  onChangeText={setCustomFibre}
                  placeholder="g"
                />
              </View>
            </View>
          </Section>

          {validationError && (
            <Text style={[TextStyles.bodySmall, { color: '#F97316', marginBottom: Spacing.sm }]}>
              {validationError}
            </Text>
          )}

          {error && (
            <Text style={[TextStyles.bodySmall, { color: '#F97316', marginBottom: Spacing.sm }]}>
              {error}
            </Text>
          )}

          {saveMessage && (
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}>
              {saveMessage}
            </Text>
          )}

          <View style={[styles.footer, { overflow: 'visible' }]}>
            <Button
              variant="primary"
              size="large"
              fullWidth
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? 'Saving…' : 'Save goal'}
            </Button>
          </View>
        </ContentContainer>
  );
}

export default function NutritionGoalsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  
  const calculationSheetRef = useRef<BottomSheet>(null);

  const handleShowCalculationInfo = () => {
    calculationSheetRef.current?.expand();
  };

  return (
    <PageContainer edges={[]}>
      <PageHeader
        title="Nutrition Goals"
        style={{ paddingTop: insets.top + PageSpacing.containerPadding }}
        leftAction={
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <GoalWizard onShowCalculationInfo={handleShowCalculationInfo} />
      
      <GoalCalculationSheet
        ref={calculationSheetRef}
        onClose={() => calculationSheetRef.current?.close()}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  summaryContainer: {
    marginBottom: PageSpacing.sectionGap,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${neonGreen}20`,
  },
  summaryTextContainer: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    // Keep normal chip alignment while leaving a small glow gutter.
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.base,
    marginHorizontal: -Spacing.sm,
    marginTop: -Spacing.base,
    marginBottom: -Spacing.sm,
  },
  chipButton: {
    paddingHorizontal: Spacing.lg,
    overflow: 'visible',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  fieldColumn: {
    flex: 1,
  },
  fieldColumnWide: {
    flex: 1,
  },
  activityContainer: {
    marginTop: Spacing.md,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  activityCard: {
    flexBasis: '48%',
  },
  paceContainer: {
    marginTop: Spacing.md,
  },
  calculateButton: {
    marginBottom: Spacing.md,
  },
  footer: {
    marginTop: PageSpacing.sectionGap,
    paddingBottom: Spacing['2xl'],
  },
  selectedGoalsContainer: {
    marginTop: Spacing.md,
  },
  goalsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  removeButton: {
    marginLeft: Spacing.xs,
  },
  customGoalContainer: {
    marginTop: Spacing.md,
  },
  customGoalInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  customGoalInput: {
    flex: 1,
  },
  addButton: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 0,
  },
  labelWithToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  unitOption: {
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});


