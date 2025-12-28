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

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, primaryGreen, neonGreen, glassSurface, glassBorder, deepGreen } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { searchFoodDatabase } from '@/lib/foodSearch';
import type { DatabaseFoodItem } from '@/components/capture/types';

const RECENT_HISTORY_KEY = 'food_search_history_v1';
const MAX_HISTORY = 5;

export interface FoodSearchModalProps {
  onCancel: () => void;
  onSelectItem: (item: DatabaseFoodItem, quantity: number) => void;
}

export function FoodSearchModal({ onCancel, onSelectItem }: FoodSearchModalProps): React.ReactElement {
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
    Keyboard.dismiss();
  };

  const handleCommit = () => {
    if (selectedItem) {
      addToHistory(selectedItem);
      onSelectItem(selectedItem, quantity);
    }
  };

  const renderItem = ({ item }: { item: DatabaseFoodItem }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: glassBorder }]}
      onPress={() => handleSelectResult(item)}
    >
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
    const totalCalories = Math.round(selectedItem.calories * quantity);
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
          contentContainerStyle={[styles.quantifyContent, { paddingBottom: Math.max(insets.bottom, 120) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.itemDetailCard}>
            <Text style={[TextStyles.h2, { marginBottom: Spacing.xs }]}>{selectedItem.name.toUpperCase()}</Text>
            {selectedItem.brand && <Text style={[TextStyles.body, { color: colors.icon, marginBottom: Spacing.lg }]}>{selectedItem.brand}</Text>}
            
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Calories</Text>
                <Text style={TextStyles.h3}>{totalCalories}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Protein</Text>
                <Text style={TextStyles.h3}>{Math.round(selectedItem.protein * quantity)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Carbs</Text>
                <Text style={TextStyles.h3}>{Math.round(selectedItem.carbs * quantity)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Fat</Text>
                <Text style={TextStyles.h3}>{Math.round(selectedItem.fat * quantity)}g</Text>
              </View>
            </View>

            <View style={[styles.macroRow, { borderTopWidth: 0, marginTop: Spacing.md, paddingTop: 0 }]}>
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Fiber</Text>
                <Text style={TextStyles.h3}>{Math.round((selectedItem.fiber || 0) * quantity)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={TextStyles.caption}>Sodium</Text>
                <Text style={TextStyles.h3}>{Math.round((selectedItem.sodium || 0) * quantity)}mg</Text>
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
            <Text style={[TextStyles.bodySmall, { marginTop: Spacing.md }]}>
              {quantity} x {selectedItem.servingText || `${selectedItem.servingSize}${selectedItem.servingUnit}`}
            </Text>
          </View>

          <View style={styles.footer}>
            <Button variant="primary" onPress={handleCommit} fullWidth>
              Add to Meal
            </Button>
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
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
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
    paddingTop: Spacing.xl,
  },
  itemDetailCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    marginBottom: Spacing['2xl'],
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
  quantityControl: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
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
    paddingTop: Spacing.xl,
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
