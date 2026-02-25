/**
 * Local recipe images mapping
 * Maps recipe IDs to local image assets
 */

// Import all local recipe images
const localImages: Record<string, any> = {
  'r002': require('@/assets/images/r002-keto-avocado-salad.png'),
  'r003': require('@/assets/images/r003-quinoa-veggie-power-bowl.png'),
  'r006': require('@/assets/images/r006-greek-chicken-lettuce-wraps.png'),
  'r008': require('@/assets/images/r008-egg-white-veggie-scramble.png'),
  'r009': require('@/assets/images/r009-tuna-stuffed-avocado.png'),
  'r010': require('@/assets/images/r010-protein-smoothie-bowl.png'),
  'r011': require('@/assets/images/r011-meal-prep-chicken-rice.png'),
  'r014': require('@/assets/images/r014-turkey-taco-lettuce-boats.png'),
  'r015': require('@/assets/images/r015-chocolate-protein-shake.png'),
  'r016': require('@/assets/images/r016-beef-broccoli-bowl.png'),
  'r017': require('@/assets/images/r017-mediterranean-chickpea-salad.png'),
  'r019': require('@/assets/images/r019-almond-butter-energy-bites.png'),
};

/**
 * Get the image source for a recipe
 * Returns local image if available, otherwise returns the URL
 */
export function getRecipeImageSource(recipeId: string, imageUrl?: string): any {
  // Check if we have a local image for this recipe
  if (localImages[recipeId]) {
    return localImages[recipeId];
  }
  
  // Fall back to URL if provided
  if (imageUrl && !imageUrl.startsWith('LOCAL:')) {
    return { uri: imageUrl };
  }
  
  // Return undefined if no image available
  return undefined;
}

/**
 * Check if a recipe has a local image
 */
export function hasLocalImage(recipeId: string): boolean {
  return recipeId in localImages;
}

export default localImages;
