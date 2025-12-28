export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  image_url?: string;
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  servings?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  cuisine_type?: string;
  source_meal_id?: string;
  source_type: 'image' | 'text' | 'discover';
  ai_analysis?: {
    reasoning?: string;
    suggested_for?: string;
    goal_match?: string;
  };
  nutrition_per_serving?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};



