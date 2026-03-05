export type NutrientKey =
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'sodium'
  | 'cholesterol';

export interface NutrientSource {
  label: string;
  url: string;
}

export interface NutrientEducation {
  title: string;
  summary: string;
  whatItIs: string;
  whyItMatters: string[];
  dailyGuidance: string;
  commonSources: string[];
  sources: NutrientSource[];
}

export const NUTRIENT_EDUCATION_CONTENT: Record<NutrientKey, NutrientEducation> = {
  protein: {
    title: 'Protein: What It Is and Why It Matters',
    summary: 'Protein supports muscle repair, body structure, and meal fullness.',
    whatItIs:
      'Protein is made of amino acids, which your body uses to build and repair tissues, enzymes, hormones, and immune proteins.',
    whyItMatters: [
      'Supports muscle maintenance and recovery',
      'Helps increase satiety after meals',
      'Contributes to hormone and enzyme function',
    ],
    dailyGuidance:
      'A general target is about 0.8 g per kg of body weight for minimum needs. Many active adults aim higher, often around 1.2-1.6 g per kg.',
    commonSources: ['Eggs and dairy', 'Fish and poultry', 'Tofu, tempeh, beans, and lentils'],
    sources: [
      { label: 'USDA Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov' },
      { label: 'NIH Office of Dietary Supplements — Protein', url: 'https://ods.od.nih.gov/factsheets/Protein-Consumer/' },
    ],
  },
  carbs: {
    title: 'Carbohydrates: What They Are and Why They Matter',
    summary: 'Carbohydrates are your body\'s main quick-energy source.',
    whatItIs:
      'Carbohydrates include sugars, starches, and fiber. Your body breaks many carbs down into glucose to fuel the brain and muscles.',
    whyItMatters: [
      'Primary fuel source for daily activity and exercise',
      'Supports brain function and concentration',
      'Whole-food carbs can also provide fiber and micronutrients',
    ],
    dailyGuidance:
      'General guidance is often 45-65% of daily calories from carbohydrates, with intake adjusted to activity level and goals.',
    commonSources: ['Fruit and potatoes', 'Oats, rice, and whole grains', 'Beans and lentils'],
    sources: [
      { label: 'USDA Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov' },
      { label: 'FDA — Nutrition Facts Label', url: 'https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label' },
    ],
  },
  fat: {
    title: 'Fat: What It Is and Why It Matters',
    summary: 'Dietary fat supports hormones, cells, and vitamin absorption.',
    whatItIs:
      'Fat is a concentrated energy source and helps absorb fat-soluble vitamins such as A, D, E, and K.',
    whyItMatters: [
      'Supports hormone production and cell structure',
      'Improves meal satisfaction and fullness',
      'Required for absorption of key vitamins',
    ],
    dailyGuidance:
      'A common guideline is 20-35% of daily calories from fat, with most intake coming from unsaturated fat sources.',
    commonSources: ['Olive oil and avocado', 'Nuts and seeds', 'Fatty fish like salmon and sardines'],
    sources: [
      { label: 'USDA Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov' },
      { label: 'American Heart Association — Dietary Fats', url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/dietary-fats' },
    ],
  },
  fiber: {
    title: 'Fiber: What It Is and Why It Matters',
    summary: 'Fiber helps digestion, fullness, and blood sugar control.',
    whatItIs:
      'Fiber is a carbohydrate found in plant foods that is not fully digested. It supports gut health and digestive regularity.',
    whyItMatters: [
      'Supports digestive function and gut microbiome health',
      'Can improve fullness between meals',
      'Helps reduce rapid blood sugar spikes',
    ],
    dailyGuidance:
      'General guidance is about 25 g/day for most women and 38 g/day for most men, though needs vary by age and body size.',
    commonSources: ['Beans and lentils', 'Berries and fruit', 'Oats, chia, and vegetables'],
    sources: [
      { label: 'USDA Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov' },
      { label: 'FDA — Dietary Fiber', url: 'https://www.fda.gov/food/nutrition-facts-label/nutrition-facts-label-dietary-fiber' },
    ],
  },
  sugar: {
    title: 'Sugar: What It Is and Why It Matters',
    summary: 'Sugar is a carbohydrate that provides quick energy.',
    whatItIs:
      'Sugar can occur naturally in foods (like fruit and milk) or be added during processing. Both are carbs, but food context matters.',
    whyItMatters: [
      'Provides fast energy when needed',
      'Added sugars can be easy to overconsume in low-fiber foods',
      'Total diet quality matters more than a single food choice',
    ],
    dailyGuidance:
      'A common guideline is to keep added sugar below 10% of total daily calories. Lower intake may help with appetite and energy control.',
    commonSources: ['Fruit and dairy (natural sugars)', 'Sweetened drinks and desserts', 'Sauces and packaged snacks'],
    sources: [
      { label: 'WHO — Sugars Intake for Adults and Children', url: 'https://www.who.int/publications/i/item/9789241549028' },
      { label: 'USDA Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov' },
    ],
  },
  sodium: {
    title: 'Sodium: What It Is and Why It Matters',
    summary: 'Sodium is an electrolyte that helps fluid balance and nerve signaling.',
    whatItIs:
      'Sodium is a mineral found naturally in foods and commonly added as salt. It is essential, but intake can rise quickly with processed foods.',
    whyItMatters: [
      'Helps regulate fluid balance',
      'Supports nerve signaling and muscle contraction',
      'Excess intake may raise blood pressure risk in some people',
    ],
    dailyGuidance:
      'General guidance is to stay under about 2,300 mg/day unless your clinician recommends a different target.',
    commonSources: ['Table salt and seasoning blends', 'Restaurant and packaged foods', 'Processed meats, soups, and sauces'],
    sources: [
      { label: 'FDA — Sodium in Your Diet', url: 'https://www.fda.gov/food/nutrition-education-resources-materials/sodium-your-diet' },
      { label: 'American Heart Association — Sodium', url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/sodium-and-salt' },
    ],
  },
  cholesterol: {
    title: 'Cholesterol: What It Is and Why It Matters',
    summary: 'Cholesterol is used by the body to make hormones and cell membranes.',
    whatItIs:
      'Cholesterol is a waxy substance produced by your body and also found in some animal foods. Blood cholesterol is influenced by overall diet pattern and genetics.',
    whyItMatters: [
      'Needed to build cells and hormones',
      'Blood levels are associated with heart health risk',
      'Dietary context (especially saturated fat and fiber) matters',
    ],
    dailyGuidance:
      'There is no single universal daily cholesterol target for all adults. In practice, heart-healthy patterns emphasize more fiber and unsaturated fats.',
    commonSources: ['Egg yolks and shellfish', 'Meat and full-fat dairy', 'Organ meats'],
    sources: [
      { label: 'USDA Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov' },
      { label: 'American Heart Association — Cholesterol', url: 'https://www.heart.org/en/health-topics/cholesterol' },
    ],
  },
};
