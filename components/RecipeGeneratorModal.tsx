import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    SafeAreaView,
    StatusBar,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { RecipeCardDiscover } from '@/components/recipe/RecipeCardDiscover';
import type { Recipe } from '@/components/recipe/types';
import { Colors, glassBorder, neonGreen, deepGreen, accentSky, glassSurface } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useSubscription } from '@/context/SubscriptionContext';
import { generateRecipeFromSuggestion, generateRecipeSuggestions } from '@/lib/supabase';

interface RecipeSuggestion {
  name: string;
  description: string;
  estimated_calories?: number;
  estimated_protein?: number;
  tags?: string[];
  cuisine_type?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

interface RecipeGeneratorModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onRecipeGenerated: () => void;
}

export function RecipeGeneratorModal({
  visible,
  userId,
  onClose,
  onRecipeGenerated,
}: RecipeGeneratorModalProps) {
  const { isPro } = useSubscription();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeGoal } = useNutritionGoals();
  const [userInput, setUserInput] = useState('');
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RecipeSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  const handleGenerateSuggestions = async () => {
    if (!userInput.trim()) {
      setError('Please describe what you feel like eating or what ingredients you have.');
      return;
    }

    setError(null);
    setLoadingSuggestions(true);
    setSuggestions([]);

    try {
      const nutritionGoals = activeGoal
        ? {
            dailyTargets: activeGoal.dailyTargets,
            focusAreas: activeGoal.meta?.focusAreas,
            goalType: activeGoal.type,
          }
        : undefined;

      const { data, error: genError } = await generateRecipeSuggestions(
        userInput.trim(),
        userId,
        isPro,
        nutritionGoals
      );

      if (genError || !data?.suggestions) {
        throw new Error(genError?.message || 'Failed to generate suggestions');
      }

      setSuggestions(data.suggestions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate recipe suggestions';
      setError(message);
      console.error('Error generating suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: RecipeSuggestion) => {
    setSelectedSuggestion(suggestion);
    setGeneratingRecipe(true);
    setError(null);

    try {
      const nutritionGoals = activeGoal
        ? {
            dailyTargets: activeGoal.dailyTargets,
            focusAreas: activeGoal.meta?.focusAreas,
          }
        : undefined;

      const { data, error: genError } = await generateRecipeFromSuggestion(
        suggestion,
        userId,
        isPro,
        nutritionGoals
      );

      if (genError || !data?.recipe_id) {
        throw new Error(genError?.message || 'Failed to generate recipe');
      }

      // Reset state and close modal
      setUserInput('');
      setSuggestions([]);
      setSelectedSuggestion(null);
      onRecipeGenerated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate recipe';
      setError(message);
      console.error('Error generating recipe:', err);
      setSelectedSuggestion(null);
    } finally {
      setGeneratingRecipe(false);
    }
  };

  const handleClose = () => {
    if (!generatingRecipe) {
      setUserInput('');
      setSuggestions([]);
      setSelectedSuggestion(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.fullPageContainer, { backgroundColor: deepGreen }]}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex1}
          >
            {/* Goal Bar */}
            <View style={styles.goalBar}>
              <View style={styles.goalPill}>
                <IconSymbol name="target" size={14} color={neonGreen} />
                <Text style={styles.goalText}>
                  AI KITCHEN • TARGET: {activeGoal ? `${formatMacro(activeGoal.dailyTargets.calories)} KCAL` : 'GENERAL HEALTH'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                activeOpacity={0.7}
                disabled={generatingRecipe}
              >
                <IconSymbol name="xmark" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.flex1} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!suggestions.length && !loadingSuggestions && !generatingRecipe && (
                <View style={styles.introSection}>
                  <Text style={[TextStyles.h1, { color: '#FFF', marginBottom: Spacing.sm }]}>
                    What's on your mind?
                  </Text>
                  <Text style={[TextStyles.body, { color: 'rgba(255,255,255,0.6)', marginBottom: Spacing.xl }]}>
                    Describe what you feel like eating or what's in your fridge. We'll handle the rest.
                  </Text>

                  <View style={styles.inputStudio}>
                    <Input
                      placeholder="E.g., I have salmon and spinach, want something high protein and quick..."
                      value={userInput}
                      onChangeText={setUserInput}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      variant="filled"
                      style={styles.studioInput}
                      containerStyle={styles.studioInputContainer}
                    />
                    
                    {error && (
                      <Text style={styles.errorText}>
                        {error}
                      </Text>
                    )}

                    <Button
                      variant="primary"
                      fullWidth
                      onPress={handleGenerateSuggestions}
                      disabled={loadingSuggestions || !userInput.trim()}
                      style={styles.generateBtn}
                    >
                      <IconSymbol name="sparkles" size={20} color="#000" style={{ marginRight: 8 }} />
                      <Text style={[TextStyles.button, { color: '#000' }]}>
                        Get Suggestions
                      </Text>
                    </Button>
                  </View>
                </View>
              )}

              {loadingSuggestions && (
                <View style={styles.centeredContent}>
                  <ActivityIndicator size="large" color={neonGreen} />
                  <Text style={styles.loadingTitle}>Curating your menu...</Text>
                  <Text style={styles.loadingSub}>Analyzing your goals and ingredients</Text>
                </View>
              )}

              {suggestions.length > 0 && !generatingRecipe && (
                <View style={styles.suggestionsSection}>
                  <Text style={[TextStyles.h2, { color: '#FFF', marginBottom: Spacing.md }]}>
                    Choose your path
                  </Text>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSelectSuggestion(suggestion)}
                      activeOpacity={0.8}
                      style={styles.suggestionItem}
                    >
                      <Card variant="glass" padding="none" style={styles.suggestionCard}>
                        <View style={styles.suggestionContent}>
                          <View style={styles.suggestionHeader}>
                            <Text style={[TextStyles.body, { color: '#FFF', fontWeight: '700', flex: 1 }]}>
                              {suggestion.name}
                            </Text>
                            <View style={[styles.difficultyTag, { borderColor: suggestion.difficulty === 'Easy' ? neonGreen : accentSky }]}>
                              <Text style={[TextStyles.caption, { color: suggestion.difficulty === 'Easy' ? neonGreen : accentSky }]}>
                                {suggestion.difficulty}
                              </Text>
                            </View>
                          </View>
                          
                          <Text style={[TextStyles.bodySmall, { color: 'rgba(255,255,255,0.6)', marginTop: 4 }]}>
                            {suggestion.description}
                          </Text>

                          <View style={styles.suggestionFooter}>
                            <View style={styles.metaRow}>
                              <View style={styles.metaItem}>
                                <IconSymbol name="flame" size={14} color={neonGreen} />
                                <Text style={styles.metaText}>{formatMacro(suggestion.estimated_calories)} kcal</Text>
                              </View>
                              <View style={styles.metaItem}>
                                <IconSymbol name="sparkles" size={14} color={accentSky} />
                                <Text style={styles.metaText}>{formatMacro(suggestion.estimated_protein)}g protein</Text>
                              </View>
                            </View>
                            <IconSymbol name="chevron.right" size={20} color="rgba(255,255,255,0.3)" />
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    onPress={() => {
                      setSuggestions([]);
                      setUserInput('');
                    }}
                    style={styles.startOverBtn}
                  >
                    <Text style={styles.startOverText}>Start Over</Text>
                  </TouchableOpacity>
                </View>
              )}

              {generatingRecipe && (
                <View style={styles.centeredContent}>
                  <ActivityIndicator size="large" color={neonGreen} />
                  <Text style={styles.loadingTitle}>Crafting {selectedSuggestion?.name}...</Text>
                  <Text style={styles.loadingSub}>Creating step-by-step instructions and nutrition details</Text>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullPageContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  goalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  goalText: {
    ...TextStyles.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
  },
  introSection: {
    flex: 1,
  },
  inputStudio: {
    marginTop: Spacing.md,
  },
  studioInputContainer: {
    marginBottom: Spacing.lg,
  },
  studioInput: {
    minHeight: 160,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    fontSize: 18,
    color: '#FFF',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  generateBtn: {
    height: 56,
    borderRadius: 16,
    marginTop: Spacing.md,
  },
  errorText: {
    ...TextStyles.bodySmall,
    color: '#F97316',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingTitle: {
    ...TextStyles.h3,
    color: '#FFF',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSub: {
    ...TextStyles.body,
    color: 'rgba(255,255,255,0.5)',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  suggestionsSection: {
    flex: 1,
  },
  suggestionItem: {
    marginBottom: Spacing.md,
  },
  suggestionCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  suggestionContent: {
    padding: Spacing.lg,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  difficultyTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...TextStyles.caption,
    color: '#FFF',
    fontWeight: '600',
  },
  startOverBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  startOverText: {
    ...TextStyles.body,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});


















