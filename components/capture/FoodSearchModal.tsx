import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, primaryGreen, neonGreen, glassSurface, glassBorder, deepGreen } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { searchFoodDatabase } from '@/lib/foodSearch';
import type { DatabaseFoodItem } from '@/components/capture/types';

const RECENT_HISTORY_KEY = 'food_search_history_v1';
const MAX_HISTORY = 5;

// Serving presets as multipliers
const SERVING_PRESETS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
];

export interface FoodSearchModalProps {
  onCancel: () => void;
  onSelectItem: (item: DatabaseFoodItem, quantity: number) => void;
  onQuickLog?: (item: DatabaseFoodItem, servingMultiplier: number, customServingGrams?: number) => void;
}

export function FoodSearchModal({ onCancel, onSelectItem, onQuickLog }: FoodSearchModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DatabaseFoodItem[]>([]);
  const [history, setHistory] = useState<DatabaseFoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DatabaseFoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showIngredients, setShowIngredients] = useState(false);
  
  // Enhanced serving controls
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [customGrams, setCustomGrams] = useState('');
  const [useCustomGrams, setUseCustomGrams] = useState(false);
  const [isQuickLogging, setIsQuickLogging] = useState(false);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_HISTORY_KEY);
        if (raw) {
          setHistory(JSON.parse(raw));
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };
    loadHistory();
  }, []);

  // Save to history
  const addToHistory = useCallback(async (item: DatabaseFoodItem) => {
    try {
      const newHistory = [item, ...history.filter((h) => h.id !== item.id)].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      await AsyncStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, [history]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchFoodDatabase(query);
        setResults(data);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (item: DatabaseFoodItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setServingMultiplier(1);
    setCustomGrams('');
    setUseCustomGrams(false);
    Keyboard.dismiss();
  };

  const handleCommit = () => {
    if (selectedItem) {
      addToHistory(selectedItem);
      onSelectItem(selectedItem, quantity);
    }
  };

  const handleQuickLog = async () => {
    if (!selectedItem || !onQuickLog) return;
    
    setIsQuickLogging(true);
    try {
      const customGramsValue = useCustomGrams && customGrams ? parseFloat(customGrams) : undefined;
      await addToHistory(selectedItem);
      onQuickLog(selectedItem, servingMultiplier, customGramsValue);
    } finally {
      setIsQuickLogging(false);
    }
  };

  // Calculate nutrition based on serving settings
  const calculateNutrition = useCallback((item: DatabaseFoodItem) => {
    const customGramsValue = useCustomGrams && customGrams ? parseFloat(customGrams) : null;
    const ratio = customGramsValue 
      ? customGramsValue / item.servingSize 
      : servingMultiplier;
    
    return {
      calories: Math.round(item.calories * ratio),
      protein: Math.round(item.protein * ratio),
      carbs: Math.round(item.carbs * ratio),
      fat: Math.round(item.fat * ratio),
      fiber: Math.round((item.fiber || 0) * ratio),
      sodium: Math.round((item.sodium || 0) * ratio),
      actualGrams: customGramsValue || Math.round(item.servingSize * servingMultiplier),
    };
  }, [servingMultiplier, customGrams, useCustomGrams]);

  const renderItem = ({ item }: { item: DatabaseFoodItem }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: glassBorder }]}
      onPress={() => handleSelectResult(item)}
    >
      {/* Thumbnail */}
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
          {item.brand ? `${item.brand} • ` : ''}{item.calories} kcal per {item.servingSize}{item.servingUnit}
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

  if (selectedItem) {
    const nutrition = calculateNutrition(selectedItem);
    const hasQuickLog = !!onQuickLog;
    
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
          {/* Hero Image (if available) */}
          {selectedItem.imageUrl && (
            <View style={styles.heroImageContainer}>
              <Image 
                source={{ uri: selectedItem.imageUrl }} 
                style={styles.heroImage}
                contentFit="cover"
                transition={300}
              />
              {/* Source Badge overlay */}
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

          {/* Source Badge (only show if no image) */}
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

          <View style={styles.itemDetailCard}>
            <Text style={[TextStyles.h2, { marginBottom: Spacing.xs }]}>{selectedItem.name.toUpperCase()}</Text>
            {selectedItem.brand && <Text style={[TextStyles.body, { color: colors.icon, marginBottom: Spacing.lg }]}>{selectedItem.brand}</Text>}
            
            {/* Nutrition Display */}
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Calories</Text>
                <Text style={[TextStyles.h3, { color: primaryGreen }]}>{nutrition.calories}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Protein</Text>
                <Text style={TextStyles.h3}>{nutrition.protein}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Carbs</Text>
                <Text style={TextStyles.h3}>{nutrition.carbs}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Fat</Text>
                <Text style={TextStyles.h3}>{nutrition.fat}g</Text>
              </View>
            </View>

            <View style={[styles.macroRow, { borderTopWidth: 0, marginTop: Spacing.md, paddingTop: 0 }]}>
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Fiber</Text>
                <Text style={TextStyles.h3}>{nutrition.fiber}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Sodium</Text>
                <Text style={TextStyles.h3}>{nutrition.sodium}mg</Text>
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

          {/* Serving Size Section */}
          <View style={styles.servingSection}>
            <Text style={[TextStyles.bodyMedium, { marginBottom: Spacing.sm }]}>Serving Size</Text>
            <Text style={[TextStyles.caption, { color: colors.icon, marginBottom: Spacing.md }]}>
              Base: {selectedItem.servingText || `${selectedItem.servingSize}${selectedItem.servingUnit}`}
            </Text>

            {/* Preset Buttons */}
            <View style={styles.presetRow}>
              {SERVING_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.presetButton,
                    !useCustomGrams && servingMultiplier === preset.value && styles.presetButtonActive
                  ]}
                  onPress={() => {
                    setServingMultiplier(preset.value);
                    setUseCustomGrams(false);
                    setCustomGrams('');
                  }}
                >
                  <Text style={[
                    styles.presetButtonText,
                    !useCustomGrams && servingMultiplier === preset.value && styles.presetButtonTextActive
                  ]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Grams Input */}
            <View style={styles.customGramsContainer}>
              <TouchableOpacity 
                style={[styles.customGramsToggle, useCustomGrams && styles.customGramsToggleActive]}
                onPress={() => setUseCustomGrams(!useCustomGrams)}
              >
                <IconSymbol 
                  name={useCustomGrams ? 'checkmark.circle.fill' : 'circle'} 
                  size={20} 
                  color={useCustomGrams ? neonGreen : colors.icon} 
                />
                <Text style={[TextStyles.bodySmall, { marginLeft: Spacing.sm }]}>Custom amount</Text>
              </TouchableOpacity>
              
              {useCustomGrams && (
                <View style={styles.customGramsInputRow}>
                  <TextInput
                    style={[styles.customGramsInput, { color: colors.text }]}
                    placeholder={`${selectedItem.servingSize}`}
                    placeholderTextColor={colors.icon}
                    value={customGrams}
                    onChangeText={setCustomGrams}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={[TextStyles.body, { color: colors.icon }]}>{selectedItem.servingUnit}</Text>
                </View>
              )}
            </View>

            {/* Current Serving Display */}
            <View style={styles.currentServingDisplay}>
              <IconSymbol name="scalemass" size={18} color={neonGreen} />
              <Text style={[TextStyles.bodyMedium, { color: colors.text, marginLeft: Spacing.sm }]}>
                {nutrition.actualGrams}{selectedItem.servingUnit}
              </Text>
            </View>
          </View>

          {/* Legacy Quantity Control (for Add to Meal) */}
          {!hasQuickLog && (
            <View style={styles.quantityControl}>
              <Text style={[TextStyles.bodyMedium, { marginBottom: Spacing.md }]}>Quantity</Text>
              <View style={styles.quantityStepper}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={styles.stepperButton}
                >
                  <IconSymbol name="minus" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[TextStyles.h2, { marginHorizontal: Spacing.xl }]}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(quantity + 1)}
                  style={styles.stepperButton}
                >
                  <IconSymbol name="plus" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.footer}>
            {hasQuickLog ? (
              <>
                <Button 
                  variant="primary" 
                  onPress={handleQuickLog} 
                  fullWidth
                  disabled={isQuickLogging}
                  icon={isQuickLogging ? <ActivityIndicator size="small" color="#000000" /> : <IconSymbol name="bolt.fill" size={18} color="#000000" />}
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
          {isLoading && <ActivityIndicator size="small" color={primaryGreen} style={styles.loader} />}
        </View>
      </View>

      <FlatList
        data={results.length > 0 ? results : (query.length < 2 ? history : [])}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 120) }]}
        ListHeaderComponent={
          query.length < 2 && history.length > 0 ? (
            <Text style={[TextStyles.bodyMedium, { color: colors.icon, marginBottom: Spacing.sm, marginTop: Spacing.md }]}>
              Recent Searches
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !isLoading && query.length >= 2 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="info.circle" size={48} color={colors.icon} />
              <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.md, textAlign: 'center' }]}>
                No foods found for "{query}"
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
  loader: {
    marginLeft: Spacing.sm,
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
  servingSection: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: glassSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  presetButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonActive: {
    backgroundColor: neonGreen,
    borderColor: neonGreen,
  },
  presetButtonText: {
    ...TextStyles.bodySmall,
    color: 'white',
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: '#000000',
  },
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
  quantityControl: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  stepperButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
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
});
