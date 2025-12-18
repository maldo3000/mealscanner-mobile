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
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { Colors, glassBorder, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeGoal } = useNutritionGoals();
  const [userInput, setUserInput] = useState('');
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RecipeSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <BlurView intensity={20} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[TextStyles.h3, { color: colors.text }]}>
                Generate Recipe
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
                disabled={generatingRecipe}
              >
                <IconSymbol name="xmark" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md }]}>
              {activeGoal
                ? `Tell us what you feel like eating or what ingredients you have. We'll suggest recipes aligned with your nutrition goals (${Math.round(activeGoal.dailyTargets.calories)} kcal/day).`
                : "Tell us what you feel like eating or what ingredients you have. We'll suggest recipes for you."}
            </Text>

            {!suggestions.length && !loadingSuggestions && (
              <>
                <Input
                  placeholder="E.g., I have chicken and vegetables, or I want something healthy and quick..."
                  value={userInput}
                  onChangeText={setUserInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  containerStyle={{ marginBottom: Spacing.lg }}
                  style={{ minHeight: 100 }}
                />

                {error && (
                  <Text style={[TextStyles.bodySmall, { color: '#F97316', marginBottom: Spacing.md }]}>
                    {error}
                  </Text>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleGenerateSuggestions}
                  disabled={loadingSuggestions || !userInput.trim()}
                >
                  {loadingSuggestions ? 'Generating Suggestions...' : 'Get Recipe Suggestions'}
                </Button>
              </>
            )}

            {loadingSuggestions && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={neonGreen} />
                <Text style={[TextStyles.body, { color: colors.text, marginTop: Spacing.md }]}>
                  Generating recipe suggestions...
                </Text>
              </View>
            )}

            {suggestions.length > 0 && !generatingRecipe && (
              <ScrollView style={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
                <Text style={[TextStyles.body, { color: colors.text, marginBottom: Spacing.md }]}>
                  Select a recipe to generate:
                </Text>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectSuggestion(suggestion)}
                    activeOpacity={0.7}
                    style={styles.suggestionCard}
                  >
                    <Card variant="glass" padding="md">
                      <View style={styles.suggestionHeader}>
                        <Text style={[TextStyles.body, { color: colors.text, flex: 1 }]}>
                          {suggestion.name}
                        </Text>
                        {suggestion.difficulty && (
                          <View
                            style={[
                              styles.difficultyBadge,
                              {
                                backgroundColor:
                                  suggestion.difficulty === 'Easy'
                                    ? `${neonGreen}20`
                                    : suggestion.difficulty === 'Medium'
                                    ? '#FFA50020'
                                    : '#FF444420',
                                borderColor:
                                  suggestion.difficulty === 'Easy'
                                    ? neonGreen
                                    : suggestion.difficulty === 'Medium'
                                    ? '#FFA500'
                                    : '#FF4444',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                TextStyles.caption,
                                {
                                  color:
                                    suggestion.difficulty === 'Easy'
                                      ? neonGreen
                                      : suggestion.difficulty === 'Medium'
                                      ? '#FFA500'
                                      : '#FF4444',
                                },
                              ]}
                            >
                              {suggestion.difficulty}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.xs }]}
                      >
                        {suggestion.description}
                      </Text>
                      <View style={styles.suggestionMeta}>
                        {suggestion.estimated_calories && (
                          <View style={styles.metaItem}>
                            <IconSymbol name="flame" size={14} color={colors.icon} />
                            <Text style={[TextStyles.caption, { color: colors.icon, marginLeft: 4 }]}>
                              ~{suggestion.estimated_calories} kcal
                            </Text>
                          </View>
                        )}
                        {suggestion.estimated_protein && (
                          <View style={styles.metaItem}>
                            <IconSymbol name="dumbbell" size={14} color={colors.icon} />
                            <Text style={[TextStyles.caption, { color: colors.icon, marginLeft: 4 }]}>
                              ~{suggestion.estimated_protein}g protein
                            </Text>
                          </View>
                        )}
                        {suggestion.cuisine_type && (
                          <View style={styles.metaItem}>
                            <IconSymbol name="globe" size={14} color={colors.icon} />
                            <Text style={[TextStyles.caption, { color: colors.icon, marginLeft: 4 }]}>
                              {suggestion.cuisine_type}
                            </Text>
                          </View>
                        )}
                      </View>
                      {suggestion.tags && suggestion.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {suggestion.tags.map((tag, tagIndex) => (
                            <View
                              key={tagIndex}
                              style={[styles.tag, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40` }]}
                            >
                              <Text style={[TextStyles.caption, { color: colors.text }]}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Card>
                  </TouchableOpacity>
                ))}
                <Button
                  variant="secondary"
                  fullWidth
                  onPress={() => {
                    setSuggestions([]);
                    setUserInput('');
                  }}
                  style={{ marginTop: Spacing.md }}
                >
                  Start Over
                </Button>
              </ScrollView>
            )}

            {generatingRecipe && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={neonGreen} />
                <Text style={[TextStyles.body, { color: colors.text, marginTop: Spacing.md }]}>
                  Generating recipe: {selectedSuggestion?.name}...
                </Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.xs }]}>
                  This may take a moment
                </Text>
              </View>
            )}
          </BlurView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContent: {
    borderRadius: 24,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: glassBorder,
    ...(Platform.OS === 'web' && {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  suggestionsContainer: {
    maxHeight: 500,
  },
  suggestionCard: {
    marginBottom: Spacing.md,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: Spacing.sm,
  },
  suggestionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
});




