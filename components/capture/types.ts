export type CaptureIntent = 'snap' | 'describe' | 'search' | 'extract_recipe';

export interface DraftMealItemBase {
  localId: string;
  quantity: number;
  isHero: boolean;
  createdAtMs: number;
}

export interface DraftPhotoItem extends DraftMealItemBase {
  itemType: 'photo';
  /**
   * Local on-device URI that should remain valid across app restarts (copied into documentDirectory).
   */
  localUri: string;
}

export interface DraftTextItem extends DraftMealItemBase {
  itemType: 'text';
  text: string;
}

export interface DatabaseFoodItem {
  id: string;
  name: string;
  brand?: string;
  source: 'usda' | 'off';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  ingredients?: string;
  servingSize: number;
  servingUnit: string;
  servingText?: string;
  barcode?: string;
  imageUrl?: string;
}

export interface DraftVerifiedItem extends DraftMealItemBase {
  itemType: 'verified';
  foodItem: DatabaseFoodItem;
}

export type DraftMealItem = DraftPhotoItem | DraftTextItem | DraftVerifiedItem;

export interface MealCaptureDraft {
  version: 1;
  sessionId: string;
  createdAtMs: number;
  updatedAtMs: number;
  contextText: string;
  items: DraftMealItem[];
}


