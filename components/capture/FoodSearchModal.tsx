import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    buildDatabaseFoodItem,
    computeNutrition,
    getDefaultServing,
    type DatabaseFoodItem,
    type ServingOption,
} from '@/components/capture/types';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { Colors, deepGreen, glassBorder, glassSurface, neonGreen, primaryGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { searchFoodDatabase } from '@/lib/foodSearch';

const RECENT_HISTORY_BASE_KEY = 'food_search_history_v1';
const MAX_HISTORY = 5;

const MOST_SELECTED_FOODS: DatabaseFoodItem[] = [
  buildDatabaseFoodItem({
    id: 'starter-egg',
    name: 'Egg, Large',
    source: 'usda',
    caloriesPer100g: 144,
    proteinPer100g: 12.6,
    carbsPer100g: 0.8,
    fatPer100g: 9.6,
    fiberPer100g: 0,
    sodiumPer100g: 142,
    servings: [
      { label: '1 large egg (50g)', grams: 50, isDefault: true },
      { label: '100g', grams: 100, isDefault: false },
    ],
  }),
  buildDatabaseFoodItem({
    id: 'starter-banana',
    name: 'Banana',
    source: 'usda',
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    sodiumPer100g: 1,
    servings: [
      { label: '1 medium banana (118g)', grams: 118, isDefault: true },
      { label: '100g', grams: 100, isDefault: false },
    ],
  }),
  buildDatabaseFoodItem({
    id: 'starter-chicken',
    name: 'Chicken Breast',
    source: 'usda',
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    fiberPer100g: 0,
    sodiumPer100g: 74,
    servings: [
      { label: '1 breast (174g)', grams: 174, isDefault: true },
      { label: '100g', grams: 100, isDefault: false },
      { label: '4 oz (113g)', grams: 113, isDefault: false },
      { label: '6 oz (170g)', grams: 170, isDefault: false },
    ],
  }),
  buildDatabaseFoodItem({
    id: 'starter-apple',
    name: 'Apple',
    source: 'usda',
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
    sodiumPer100g: 1,
    servings: [
      { label: '1 medium apple (182g)', grams: 182, isDefault: true },
      { label: '100g', grams: 100, isDefault: false },
    ],
  }),
  buildDatabaseFoodItem({
    id: 'starter-yogurt',
    name: 'Greek Yogurt',
    source: 'usda',
    caloriesPer100g: 59,
    proteinPer100g: 10.2,
    carbsPer100g: 3.6,
    fatPer100g: 0.7,
    fiberPer100g: 0,
    sodiumPer100g: 36,
    servings: [
      { label: '1 container (170g)', grams: 170, isDefault: true },
      { label: '100g', grams: 100, isDefault: false },
    ],
  }),
];

const QUANTITY_PRESETS = [0.5, 1, 1.5, 2];

const MIN_SERVING_COUNT = 0.25;

function is100gServing(serving: ServingOption): boolean {
  return serving.grams === 100 && serving.label.replace(/\s/g, '').toLowerCase() === '100g';
}

function SkeletonRow({ index }: { index: number }): React.ReactElement {
  const shimmer = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, delay: index * 150, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer, index]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  return (
    <View style={[styles.resultItem, { borderBottomColor: glassBorder }]}>
      <Animated.View style={[styles.skeletonThumbnail, { opacity }]} />
      <View style={styles.resultInfo}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
      </View>
    </View>
  );
}

export interface FoodSearchModalProps {
  onCancel: () => void;
  onSelectItem: (item: DatabaseFoodItem, quantity: number) => void;
  onQuickLog?: (item: DatabaseFoodItem, totalGrams: number) => void;
}

export function FoodSearchModal({ onCancel, onSelectItem, onQuickLog }: FoodSearchModalProps): React.ReactElement {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  const historyKey = useMemo(() => {
    const userId = user?.id || 'guest';
    return `${RECENT_HISTORY_BASE_KEY}_${userId}`;
  }, [user?.id]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DatabaseFoodItem[]>([]);
  const [history, setHistory] = useState<DatabaseFoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DatabaseFoodItem | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);

  // Serving controls
  const [selectedServing, setSelectedServing] = useState<ServingOption | null>(null);
  const [servingCount, setServingCount] = useState(1);
  const [customGrams, setCustomGrams] = useState('');
  const [useCustomGrams, setUseCustomGrams] = useState(false);
  const [isQuickLogging, setIsQuickLogging] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const raw = await AsyncStorage.getItem(historyKey);
        if (raw) {
          setHistory(JSON.parse(raw));
        } else {
          setHistory([]);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };
    loadHistory();
  }, [historyKey]);

  const addToHistory = useCallback(async (item: DatabaseFoodItem) => {
    try {
      const newHistory = [item, ...history.filter((h) => h.id !== item.id)].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      await AsyncStorage.setItem(historyKey, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, [history, historyKey]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        await searchFoodDatabase(query, {
          signal: controller.signal,
          onPartialResults: (items) => {
            if (!controller.signal.aborted) {
              setResults(items);
            }
          },
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelectResult = (item: DatabaseFoodItem) => {
    setSelectedItem(item);
    const def = getDefaultServing(item);
    setSelectedServing(def);
    setServingCount(1);

    if (is100gServing(def)) {
      setUseCustomGrams(true);
      setCustomGrams('100');
    } else {
      setCustomGrams('');
      setUseCustomGrams(false);
    }
    Keyboard.dismiss();
  };

  const totalGrams = useMemo(() => {
    if (!selectedItem) return 0;
    if (useCustomGrams && customGrams) {
      return parseFloat(customGrams) || 0;
    }
    const serving = selectedServing ?? getDefaultServing(selectedItem);
    return serving.grams * servingCount;
  }, [selectedItem, selectedServing, servingCount, useCustomGrams, customGrams]);

  const nutrition = useMemo(() => {
    if (!selectedItem) return null;
    return computeNutrition(selectedItem, totalGrams);
  }, [selectedItem, totalGrams]);

  const handleCommit = () => {
    if (selectedItem) {
      addToHistory(selectedItem);
      onSelectItem(selectedItem, 1);
    }
  };

  const handleQuickLog = async () => {
    if (!selectedItem || !onQuickLog) return;

    setIsQuickLogging(true);
    try {
      await addToHistory(selectedItem);
      onQuickLog(selectedItem, totalGrams);
    } finally {
      setIsQuickLogging(false);
    }
  };

  const renderServingLabel = (item: DatabaseFoodItem) => {
    const serving = getDefaultServing(item);
    const kcal = Math.round(item.caloriesPer100g * serving.grams / 100);
    return `${kcal} kcal \u00B7 ${serving.label}`;
  };

  const renderItem = ({ item }: { item: DatabaseFoodItem }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: glassBorder }]}
      onPress={() => handleSelectResult(item)}
    >
      <View style={styles.resultThumbnail}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.resultImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.resultImagePlaceholder, { backgroundColor: glassSurface }]}>
            <IconSymbol
              name={item.source === 'usda' ? 'leaf.fill' : 'fork.knife'}
              size={22}
              color={item.source === 'usda' ? primaryGreen : colors.icon}
            />
          </View>
        )}
      </View>

      <View style={styles.resultInfo}>
        <Text style={TextStyles.bodyMedium} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={TextStyles.bodySmall} numberOfLines={1}>
          {item.brand ? `${item.brand} \u00B7 ` : ''}{renderServingLabel(item)}
        </Text>
      </View>
      <View style={styles.sourceIcon}>
        <IconSymbol
          name={item.source === 'usda' ? 'leaf.fill' : 'barcode'}
          size={20}
          color={item.source === 'usda' ? primaryGreen : neonGreen}
        />
      </View>
    </TouchableOpacity>
  );

  // Detail / Quantify Screen
  if (selectedItem && nutrition) {
    const hasQuickLog = !!onQuickLog;
    const itemServings = selectedItem.servings;

    return (
      <View style={[styles.container, { backgroundColor: deepGreen, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={TextStyles.h3}>Quantify</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.quantifyContent, { paddingBottom: Math.max(insets.bottom, 140) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Image */}
          {selectedItem.imageUrl && (
            <View style={styles.heroImageContainer}>
              <Image
                source={{ uri: selectedItem.imageUrl }}
                style={styles.heroImage}
                contentFit="cover"
                transition={300}
              />
              <View style={styles.heroSourceBadge}>
                <View style={[styles.sourceBadge, { backgroundColor: selectedItem.source === 'usda' ? primaryGreen : neonGreen }]}>
                  <IconSymbol
                    name={selectedItem.source === 'usda' ? 'leaf.fill' : 'barcode'}
                    size={14}
                    color="#000000"
                  />
                  <Text style={styles.sourceBadgeText}>
                    {selectedItem.source === 'usda' ? 'USDA' : 'Open Food Facts'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Source Badge (no image) */}
          {!selectedItem.imageUrl && (
            <View style={styles.sourceBadgeRow}>
              <View style={[styles.sourceBadge, { backgroundColor: selectedItem.source === 'usda' ? primaryGreen : neonGreen }]}>
                <IconSymbol
                  name={selectedItem.source === 'usda' ? 'leaf.fill' : 'barcode'}
                  size={14}
                  color="#000000"
                />
                <Text style={styles.sourceBadgeText}>
                  {selectedItem.source === 'usda' ? 'USDA' : 'Open Food Facts'}
                </Text>
              </View>
            </View>
          )}

          {/* Name + Nutrition Card */}
          <View style={styles.itemDetailCard}>
            <Text style={[TextStyles.h2, { marginBottom: Spacing.xs }]}>{selectedItem.name.toUpperCase()}</Text>
            {selectedItem.brand && <Text style={[TextStyles.body, { color: colors.icon, marginBottom: Spacing.lg }]}>{selectedItem.brand}</Text>}

            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Calories</Text>
                <Text style={[TextStyles.h3, { color: primaryGreen }]}>{formatMacro(nutrition.calories)}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Protein</Text>
                <Text style={TextStyles.h3}>{formatMacro(nutrition.protein)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Carbs</Text>
                <Text style={TextStyles.h3}>{formatMacro(nutrition.carbs)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Fat</Text>
                <Text style={TextStyles.h3}>{formatMacro(nutrition.fat)}g</Text>
              </View>
            </View>

            <View style={[styles.macroRow, { borderTopWidth: 0, marginTop: Spacing.md, paddingTop: 0 }]}>
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Fiber</Text>
                <Text style={TextStyles.h3}>{formatMacro(nutrition.fiber)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Sodium</Text>
                <Text style={TextStyles.h3}>{formatMacro(nutrition.sodium)}mg</Text>
              </View>
              <View style={styles.macroItem} />
              <View style={styles.macroItem} />
            </View>

            {selectedItem.ingredients && (
              <View style={styles.ingredientsContainer}>
                <TouchableOpacity
                  onPress={() => setShowIngredients(!showIngredients)}
                  style={styles.ingredientsToggle}
                >
                  <Text style={TextStyles.bodySmall}>View Ingredients</Text>
                  <IconSymbol
                    name={showIngredients ? 'chevron.down' : 'chevron.right'}
                    size={16}
                    color={colors.icon}
                  />
                </TouchableOpacity>
                {showIngredients && (
                  <Text style={[TextStyles.caption, { marginTop: Spacing.xs, lineHeight: 18 }]}>
                    {selectedItem.ingredients}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Serving Size Picker */}
          <View style={styles.servingSection}>
            <Text style={[TextStyles.bodyMedium, { marginBottom: Spacing.sm }]}>Serving Unit</Text>

            {/* Serving option chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servingChipsRow}
              keyboardShouldPersistTaps="handled"
            >
              {itemServings.map((serving, idx) => {
                const isActive = useCustomGrams
                  ? is100gServing(serving) && selectedServing != null && is100gServing(selectedServing)
                  : selectedServing?.grams === serving.grams && selectedServing?.label === serving.label;
                return (
                  <TouchableOpacity
                    key={`${serving.label}-${idx}`}
                    style={[styles.servingChip, isActive && styles.servingChipActive]}
                    onPress={() => {
                      setSelectedServing(serving);
                      setServingCount(1);
                      if (is100gServing(serving)) {
                        setUseCustomGrams(true);
                        setCustomGrams('100');
                      } else {
                        setUseCustomGrams(false);
                        setCustomGrams('');
                      }
                    }}
                  >
                    <Text style={[styles.servingChipText, isActive && styles.servingChipTextActive]}>
                      {serving.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Number of servings stepper */}
            {!useCustomGrams && (
              <View style={styles.servingCountSection}>
                <Text style={[TextStyles.caption, { color: colors.icon, marginBottom: Spacing.sm }]}>
                  Quantity
                </Text>

                <View style={styles.servingCountRow}>
                  <View style={styles.quantityStepperCompact}>
                    <TouchableOpacity
                      onPress={() => setServingCount(Math.max(0.25, servingCount - 0.5))}
                      style={styles.stepperButtonCompact}
                    >
                      <IconSymbol name="minus" size={20} color={colors.text} />
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.servingCountInput, { color: colors.text }]}
                      value={String(servingCount)}
                      onChangeText={(text) => {
                        const parsed = parseFloat(text);
                        if (!isNaN(parsed) && parsed > 0) {
                          setServingCount(parsed);
                        }
                      }}
                      onBlur={() => {
                        if (servingCount < MIN_SERVING_COUNT) {
                          setServingCount(MIN_SERVING_COUNT);
                        }
                      }}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />

                    <TouchableOpacity
                      onPress={() => setServingCount(servingCount + 0.5)}
                      style={styles.stepperButtonCompact}
                    >
                      <IconSymbol name="plus" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Quick presets */}
                  <View style={styles.quickPresets}>
                    {QUANTITY_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.quickPresetButton,
                          servingCount === preset && styles.quickPresetButtonActive,
                        ]}
                        onPress={() => setServingCount(preset)}
                      >
                        <Text style={[
                          styles.quickPresetText,
                          servingCount === preset && styles.quickPresetTextActive,
                        ]}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Custom grams toggle */}
            <View style={styles.customGramsContainer}>
              <TouchableOpacity
                style={[styles.customGramsToggle, useCustomGrams && styles.customGramsToggleActive]}
                onPress={() => {
                  if (!useCustomGrams) {
                    setCustomGrams(String(Math.round(totalGrams)));
                    setUseCustomGrams(true);
                  } else {
                    setUseCustomGrams(false);
                    setCustomGrams('');
                    setServingCount(1);
                  }
                }}
              >
                <IconSymbol
                  name={useCustomGrams ? 'checkmark.circle.fill' : 'circle'}
                  size={20}
                  color={useCustomGrams ? neonGreen : colors.icon}
                />
                <Text style={[TextStyles.bodySmall, { marginLeft: Spacing.sm }]}>Enter exact weight</Text>
              </TouchableOpacity>

              {useCustomGrams && (
                <View style={styles.customGramsInputRow}>
                  <TextInput
                    style={[styles.customGramsInput, { color: colors.text }]}
                    placeholder={`e.g. ${Math.round(getDefaultServing(selectedItem).grams)}`}
                    placeholderTextColor={colors.icon}
                    value={customGrams}
                    onChangeText={setCustomGrams}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={[TextStyles.body, { color: colors.icon }]}>g</Text>
                </View>
              )}
            </View>

            {/* Total display */}
            <View style={styles.currentServingDisplay}>
              <IconSymbol name="scalemass" size={18} color={neonGreen} />
              <Text style={[TextStyles.bodyMedium, { color: colors.text, marginLeft: Spacing.sm }]}>
                {Math.round(totalGrams)}g
              </Text>
              <Text style={[TextStyles.caption, { color: colors.icon, marginLeft: Spacing.sm }]}>
                = {formatMacro(nutrition.calories)} kcal
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            {hasQuickLog ? (
              <>
                <Button
                  variant="primary"
                  onPress={handleQuickLog}
                  fullWidth
                  disabled={isQuickLogging || totalGrams <= 0}
                  icon={isQuickLogging ? <SwirlingSpinner size="small" color="#000000" /> : <IconSymbol name="bolt.fill" size={18} color="#000000" />}
                  style={styles.quickLogButton}
                >
                  {isQuickLogging ? 'Logging...' : 'Quick Log'}
                </Button>
                <Button
                  variant="secondary"
                  onPress={handleCommit}
                  fullWidth
                  style={styles.addToMealButton}
                >
                  Add to Meal Tray
                </Button>
              </>
            ) : (
              <Button variant="primary" onPress={handleCommit} fullWidth>
                Add to Meal
              </Button>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Search Screen
  return (
    <View style={[styles.container, { backgroundColor: deepGreen, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <IconSymbol name="xmark" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={TextStyles.h3}>Search Food</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search brands or generic foods..."
            placeholderTextColor={colors.icon}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {isLoading && <SwirlingSpinner size="small" color={primaryGreen} />}
        </View>
      </View>

      <FlatList
        data={
          results.length > 0
            ? results
            : query.length < 2
            ? [...MOST_SELECTED_FOODS, ...history].filter(
                (item, index, self) => index === self.findIndex((t) => t.id === item.id)
              )
            : []
        }
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 120) }]}
        ListHeaderComponent={
          query.length === 1 ? (
            <View style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
              <Text style={[TextStyles.caption, { color: colors.icon }]}>
                Type at least 2 characters to search
              </Text>
            </View>
          ) : query.length < 2 ? (
            <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
              <Text
                style={[
                  TextStyles.caption,
                  { color: colors.icon, marginBottom: Spacing.md, lineHeight: 18 },
                ]}
              >
                Search foods from the USDA and Open Food Facts databases. All nutrition data is sourced directly from their publicly available records.
              </Text>
              <Text
                style={[
                  TextStyles.bodyMedium,
                  { color: colors.icon },
                ]}
              >
                {history.length > 0 ? 'Suggestions & Recent' : 'Most Selected'}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading && query.length >= 2 ? (
            <View>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonRow key={i} index={i} />
              ))}
            </View>
          ) : !isLoading && query.length >= 2 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="info.circle" size={48} color={colors.icon} />
              <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.md, textAlign: 'center' }]}>
                No foods found for &quot;{query}&quot;
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: PageSpacing.containerPadding,
    paddingVertical: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...TextStyles.body,
  },
  listContent: {
    paddingHorizontal: PageSpacing.containerPadding,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  resultThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  resultImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: glassBorder,
    borderRadius: 12,
  },
  resultInfo: {
    flex: 1,
  },
  sourceIcon: {
    marginLeft: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  quantifyContent: {
    flexGrow: 1,
    paddingHorizontal: PageSpacing.containerPadding,
    paddingTop: Spacing.md,
  },
  heroImageContainer: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: glassSurface,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroSourceBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  sourceBadgeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  sourceBadgeText: {
    ...TextStyles.caption,
    color: '#000000',
    fontFamily: FontFamilies.headingBold,
    fontWeight: Platform.OS === 'web' ? '700' : undefined,
  },
  itemDetailCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: glassBorder,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroDivider: {
    width: 1,
    height: 24,
    backgroundColor: glassBorder,
    alignSelf: 'center',
  },

  // Serving section
  servingSection: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: glassSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  servingChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  servingChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  servingChipActive: {
    backgroundColor: neonGreen,
    borderColor: neonGreen,
  },
  servingChipText: {
    ...TextStyles.bodySmall,
    color: 'white',
    fontWeight: '600',
  },
  servingChipTextActive: {
    color: '#000000',
  },

  // Serving count
  servingCountSection: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  servingCountRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  quantityStepperCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: glassBorder,
    padding: Spacing.xs,
  },
  stepperButtonCompact: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingCountInput: {
    flex: 1,
    height: 48,
    textAlign: 'center',
    ...TextStyles.h3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: glassBorder,
  },
  quickPresets: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  quickPresetButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  quickPresetButtonActive: {
    backgroundColor: 'rgba(178, 255, 89, 0.2)',
    borderColor: neonGreen,
  },
  quickPresetText: {
    ...TextStyles.caption,
    color: 'white',
    fontWeight: '600',
  },
  quickPresetTextActive: {
    color: neonGreen,
  },

  // Custom grams
  customGramsContainer: {
    marginBottom: Spacing.md,
  },
  customGramsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  customGramsToggleActive: {},
  customGramsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  customGramsInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: glassBorder,
    ...TextStyles.body,
  },
  currentServingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: glassBorder,
    marginTop: Spacing.sm,
  },

  ingredientsContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: glassBorder,
  },
  ingredientsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  quickLogButton: {
    shadowColor: neonGreen,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  addToMealButton: {
    opacity: 0.9,
  },

  skeletonThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: Spacing.md,
    backgroundColor: glassSurface,
  },
  skeletonTitle: {
    width: '70%',
    height: 14,
    borderRadius: 7,
    backgroundColor: glassSurface,
    marginBottom: Spacing.sm,
  },
  skeletonSubtitle: {
    width: '45%',
    height: 12,
    borderRadius: 6,
    backgroundColor: glassSurface,
  },
});
