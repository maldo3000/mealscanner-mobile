import { useCallback, useEffect, useMemo, useState } from 'react';

import recipesData from '@/data/recipes.json';

/**
 * Recipe type matching the JSON structure
 */
export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export type RecipeTier = 'free' | 'pro';

export interface PrebakedRecipe {
  id: string;
  name: string;
  description: string;
  image_url: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  nutrition_per_serving: RecipeNutrition;
  tags: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  tier: RecipeTier;
}

export interface TagCategories {
  dietary: string[];
  goals: string[];
  speed: string[];
  mealType: string[];
}

export type SortOption = 'default' | 'calories-low' | 'calories-high' | 'protein-high' | 'time-low';

export interface RecipeFilters {
  tags: string[];
  maxCalories: number | null;
  searchQuery: string;
  sortBy: SortOption;
}

export interface UseRecipesValue {
  recipes: PrebakedRecipe[];
  filteredRecipes: PrebakedRecipe[];
  tagCategories: TagCategories;
  filters: RecipeFilters;
  loading: boolean;
  setFilters: (filters: Partial<RecipeFilters>) => void;
  toggleTag: (tag: string) => void;
  setMaxCalories: (maxCalories: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  clearFilters: () => void;
  getRecipeById: (id: string) => PrebakedRecipe | undefined;
}

const DEFAULT_FILTERS: RecipeFilters = {
  tags: [],
  maxCalories: null,
  searchQuery: '',
  sortBy: 'default',
};

/**
 * Hook for loading and filtering pre-baked recipes from the JSON catalog
 */
export const useRecipes = (): UseRecipesValue => {
  const [filters, setFiltersState] = useState<RecipeFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState<boolean>(true);

  // Load recipes from JSON (synchronous since it's bundled)
  const recipes = useMemo<PrebakedRecipe[]>(() => {
    return recipesData.recipes as PrebakedRecipe[];
  }, []);

  const tagCategories = useMemo<TagCategories>(() => {
    return recipesData.tagCategories as TagCategories;
  }, []);

  // Simulate async loading for consistency
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Filter recipes based on current filters
  const filteredRecipes = useMemo<PrebakedRecipe[]>(() => {
    let result = [...recipes];

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      result = result.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by tags (recipe must have ALL selected tags)
    if (filters.tags.length > 0) {
      result = result.filter(recipe => 
        filters.tags.every(selectedTag => 
          recipe.tags.some(recipeTag => 
            recipeTag.toLowerCase() === selectedTag.toLowerCase()
          )
        )
      );
    }

    // Filter by max calories
    if (filters.maxCalories !== null) {
      result = result.filter(recipe => 
        recipe.nutrition_per_serving.calories <= filters.maxCalories!
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'calories-low':
        result.sort((a, b) => a.nutrition_per_serving.calories - b.nutrition_per_serving.calories);
        break;
      case 'calories-high':
        result.sort((a, b) => b.nutrition_per_serving.calories - a.nutrition_per_serving.calories);
        break;
      case 'protein-high':
        result.sort((a, b) => b.nutrition_per_serving.protein - a.nutrition_per_serving.protein);
        break;
      case 'time-low':
        const getMinutes = (timeStr: string) => {
          const match = timeStr.match(/(\d+)/);
          return match ? parseInt(match[0], 10) : 999;
        };
        result.sort((a, b) => getMinutes(a.total_time) - getMinutes(b.total_time));
        break;
      default:
        // Keep default order (as defined in JSON)
        break;
    }

    return result;
  }, [recipes, filters]);

  // Set filters (partial update)
  const setFilters = useCallback((newFilters: Partial<RecipeFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Toggle a tag on/off
  const toggleTag = useCallback((tag: string) => {
    setFiltersState(prev => {
      const normalizedTag = tag.toLowerCase();
      const hasTag = prev.tags.some(t => t.toLowerCase() === normalizedTag);
      
      if (hasTag) {
        return {
          ...prev,
          tags: prev.tags.filter(t => t.toLowerCase() !== normalizedTag),
        };
      } else {
        return {
          ...prev,
          tags: [...prev.tags, normalizedTag],
        };
      }
    });
  }, []);

  // Set max calories filter
  const setMaxCalories = useCallback((maxCalories: number | null) => {
    setFiltersState(prev => ({ ...prev, maxCalories }));
  }, []);

  // Set search query
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFiltersState(prev => ({ ...prev, searchQuery }));
  }, []);

  // Set sort by
  const setSortBy = useCallback((sortBy: SortOption) => {
    setFiltersState(prev => ({ ...prev, sortBy }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Get a recipe by ID
  const getRecipeById = useCallback((id: string): PrebakedRecipe | undefined => {
    return recipes.find(recipe => recipe.id === id);
  }, [recipes]);

  return {
    recipes,
    filteredRecipes,
    tagCategories,
    filters,
    loading,
    setFilters,
    toggleTag,
    setMaxCalories,
    setSearchQuery,
    setSortBy,
    clearFilters,
    getRecipeById,
  };
};

/**
 * Helper function to get calorie bucket options based on remaining calories
 */
export const getCalorieBuckets = (remainingCalories: number | null): number[] => {
  if (remainingCalories === null || remainingCalories <= 0) {
    // Default buckets when no goal is set
    return [200, 300, 400, 500];
  }

  const buckets: number[] = [];
  const standardBuckets = [200, 300, 400, 500, 600, 700, 800];

  for (const bucket of standardBuckets) {
    if (bucket <= remainingCalories) {
      buckets.push(bucket);
    }
  }

  // Add remaining calories as a bucket if it's not already a standard bucket
  if (remainingCalories > 0 && !standardBuckets.includes(remainingCalories)) {
    buckets.push(remainingCalories);
  }

  // Sort and return unique values, limit to 4 options
  return [...new Set(buckets)].sort((a, b) => a - b).slice(0, 4);
};

/**
 * Helper to format tag for display (converts kebab-case to Title Case)
 */
export const formatTagForDisplay = (tag: string): string => {
  return tag
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get icon name for a tag category
 */
export const getTagCategoryIcon = (category: keyof TagCategories): string => {
  const icons: Record<keyof TagCategories, string> = {
    dietary: 'leaf',
    goals: 'target',
    speed: 'clock',
    mealType: 'fork.knife',
  };
  return icons[category] || 'tag';
};

