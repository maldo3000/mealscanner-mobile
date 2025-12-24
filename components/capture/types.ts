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

export type DraftMealItem = DraftPhotoItem | DraftTextItem;

export interface MealCaptureDraft {
  version: 1;
  sessionId: string;
  createdAtMs: number;
  updatedAtMs: number;
  contextText: string;
  items: DraftMealItem[];
}


