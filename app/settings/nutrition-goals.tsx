import React, { useEffect, useMemo, useState, useRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
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

function GoalWizard() {
  const insets = useSafeAreaInsets();
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
  const [heightCm, setHeightCm] = useState<string>(
    activeGoal ? String(activeGoal.profileSnapshot.heightCm) : '',
  );
  const [weightKg, setWeightKg] = useState<string>(
    activeGoal ? String(activeGoal.profileSnapshot.weightKg) : '',
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    activeGoal?.profileSnapshot.activityLevel ?? 'light',
  );
  const [goalType, setGoalType] = useState<NutritionGoalType>(
    activeGoal?.type ?? 'weight_loss',
  );
  const [pace, setPace] = useState<GoalPace>('moderate');

  const [customCalories, setCustomCalories] = useState<string>('');
  const [customProtein, setCustomProtein] = useState<string>('');
  const [customCarbs, setCustomCarbs] = useState<string>('');
  const [customFat, setCustomFat] = useState<string>('');
  const [customFibre, setCustomFibre] = useState<string>('');

  const [selectedQualitativeGoals, setSelectedQualitativeGoals] = useState<string[]>(
    activeGoal?.meta?.focusAreas ?? [],
  );
  const [customGoalInput, setCustomGoalInput] = useState<string>('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
      setHeightCm(String(activeGoal.profileSnapshot.heightCm));
      setWeightKg(String(activeGoal.profileSnapshot.weightKg));
      setActivityLevel(activeGoal.profileSnapshot.activityLevel);
      setGoalType(activeGoal.type);
      setSelectedQualitativeGoals(activeGoal.meta?.focusAreas ?? []);
    }
  }, [loading, activeGoal]);

  const numericOrUndefined = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const profileValid =
    numericOrUndefined(ageYears) != null &&
    numericOrUndefined(heightCm) != null &&
    numericOrUndefined(weightKg) != null;

  const previewTargets = useMemo(() => {
    if (!profileValid) {
      return null;
    }

    const profile = {
      sex,
      ageYears: numericOrUndefined(ageYears),
      heightCm: numericOrUndefined(heightCm) as number,
      weightKg: numericOrUndefined(weightKg) as number,
      activityLevel,
    };

    const result = calculateGoalTargets({
      profile,
      goalType,
      pace: goalType === 'maintenance' || goalType === 'custom' ? undefined : pace,
      customCalories: numericOrUndefined(customCalories),
      customProteinGrams: numericOrUndefined(customProtein),
      customCarbGrams: numericOrUndefined(customCarbs),
      customFatGrams: numericOrUndefined(customFat),
      customFibreGrams: numericOrUndefined(customFibre),
    });

    return result.dailyTargets;
  }, [
    activityLevel,
    ageYears,
    customCalories,
    customCarbs,
    customFat,
    customFibre,
    customProtein,
    goalType,
    heightCm,
    pace,
    profileValid,
    sex,
    weightKg,
  ]);

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

    const age = numericOrUndefined(ageYears);
    const height = numericOrUndefined(heightCm);
    const weight = numericOrUndefined(weightKg);

    if (!age || !height || !weight) {
      setValidationError('Please enter your age, height, and weight to calculate your goal.');
      return;
    }

    setValidationError(null);

    const profile = {
      sex,
      ageYears: age,
      heightCm: height,
      weightKg: weight,
      activityLevel,
    };

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
      profile,
      goalType,
      pace: goalType === 'maintenance' || goalType === 'custom' ? undefined : pace,
      customCalories: numericOrUndefined(customCalories),
      customProteinGrams: numericOrUndefined(customProtein),
      customCarbGrams: numericOrUndefined(customCarbs),
      customFatGrams: numericOrUndefined(customFat),
      customFibreGrams: numericOrUndefined(customFibre),
      meta: selectedQualitativeGoals.length > 0
        ? {
            focusAreas: selectedQualitativeGoals,
          }
        : undefined,
    });

    setSaveMessage('Goal saved. Your insights will now use this as your target.');
  };

  return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 64}
      >
        <ContentContainer keyboardAvoiding scrollable>
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
                <Input
                  label="Height"
                  keyboardType="number-pad"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="cm"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Input
                  label="Weight"
                  keyboardType="number-pad"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="kg"
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

          <Section title="Step 2 – Goal">
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

          <Section title="Step 3 – Targets">
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}>
              We&apos;ll suggest daily targets from your profile. You can fine‑tune them here if
              you like.
            </Text>

            <View style={styles.fieldRow}>
              <View style={styles.fieldColumnWide}>
                <Input
                  label="Calories"
                  keyboardType="number-pad"
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  placeholder={
                    previewTargets ? `${formatMacro(previewTargets.calories)} kcal` : 'kcal / day'
                  }
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
                  placeholder={
                    previewTargets ? `${formatMacro(previewTargets.proteinGrams)} g` : 'g'
                  }
                />
              </View>
              <View style={styles.fieldColumn}>
                <Input
                  label="Carbs"
                  keyboardType="number-pad"
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                  placeholder={
                    previewTargets ? `${formatMacro(previewTargets.carbGrams)} g` : 'g'
                  }
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
                  placeholder={
                    previewTargets ? `${formatMacro(previewTargets.fatGrams)} g` : 'g'
                  }
                />
              </View>
              <View style={styles.fieldColumn}>
                <Input
                  label="Fibre"
                  keyboardType="number-pad"
                  value={customFibre}
                  onChangeText={setCustomFibre}
                  placeholder={
                    previewTargets ? `${formatMacro(previewTargets.fibreGrams)} g` : 'g'
                  }
                />
              </View>
            </View>

            {previewTargets && (
              <Card variant="glass" padding="md" style={styles.previewCard}>
                <Text style={[TextStyles.body, { color: colors.text, marginBottom: Spacing.sm }]}>
                  Daily target preview
                </Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                  {formatMacro(previewTargets.calories)} kcal •{' '}
                  {formatMacro(previewTargets.proteinGrams)}g protein •{' '}
                  {formatMacro(previewTargets.carbGrams)}g carbs •{' '}
                  {formatMacro(previewTargets.fatGrams)}g fat •{' '}
                  {formatMacro(previewTargets.fibreGrams)}g fibre
                </Text>
              </Card>
            )}
          </Section>

          <Section title="Step 4 – Qualitative Goals">
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}>
              Select goals that describe what you want to focus on. You can also add your own.
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

          <View style={styles.footer}>
            <Button
              variant="primary"
              size="large"
              fullWidth
              disabled={loading || !profileValid}
              onPress={handleSave}
            >
              {loading ? 'Saving…' : 'Save goal'}
            </Button>
          </View>
        </ContentContainer>
      </KeyboardAvoidingView>
  );
}

export default function NutritionGoalsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

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
      <GoalWizard />
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
    marginBottom: Spacing.md,
  },
  chipButton: {
    paddingHorizontal: Spacing.lg,
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
  previewCard: {
    marginTop: Spacing.md,
  },
  footer: {
    marginTop: PageSpacing.sectionGap,
    marginBottom: Spacing.sm,
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
});


