/**
 * Daily Nutrition Tips
 *
 * Hidden tip library used by the Home "Daily Nutrition Tip" feature.
 * Tips are intentionally practical, short, and skimmable.
 */

export interface NutritionTip {
  id: string;
  title: string;
  summary: string;
  markdown: string;
  tags: string[];
}

export const NUTRITION_TIPS: readonly NutritionTip[] = [
  {
    id: 'protein-basics',
    title: 'Protein: what it is (and why it matters)',
    summary: 'Protein helps build and repair tissue and supports satiety.',
    markdown: `## What it is
Protein is made of amino acids — the building blocks your body uses for muscle, enzymes, hormones, and immune proteins.

## Why it matters
- Helps you feel full (satiety) and can reduce snacky cravings
- Supports muscle maintenance (especially important with age)
- Needed for recovery after workouts

## Easy ways to get it
- Eggs, Greek yogurt, cottage cheese
- Chicken, fish, lean beef, tofu, tempeh
- Beans, lentils, edamame (pair with grains for variety)

## Quick check (today)
Add a palm-sized protein to one meal you usually don’t (breakfast is a great place to start).`,
    tags: ['macro', 'protein', 'satiety'],
  },
  {
    id: 'carbs-quality',
    title: 'Carbs: choose quality over fear',
    summary: 'Carbs fuel workouts, daily energy, and help you feel good.',
    markdown: `## What they are
Carbohydrates are your body’s quickest fuel source. They include sugars, starches, and fiber.

## Why they matter
- Fuel your brain and muscles (especially during training)
- Help you perform better and recover faster
- Many carb foods bring fiber, vitamins, and minerals

## Better carb picks
- Fruit, potatoes, oats, rice, beans, lentils
- Whole-grain breads/tortillas when you like them

## Quick check (today)
Pair carbs with protein and/or fat for steadier energy (e.g., fruit + yogurt, rice + chicken + veggies).`,
    tags: ['macro', 'carbs', 'energy'],
  },
  {
    id: 'fat-basics',
    title: 'Dietary fat: the “slow burn” nutrient',
    summary: 'Fat supports hormones, absorption of vitamins, and flavor.',
    markdown: `## What it is
Fat is a concentrated energy source. It also helps absorb fat-soluble vitamins (A, D, E, K).

## Why it matters
- Supports hormone production and cell membranes
- Improves taste and satisfaction (food is supposed to be enjoyable)
- Helps you stay full when balanced with protein and fiber

## Easy ways to get better fats
- Olive oil, avocado, nuts, seeds
- Fatty fish (salmon, sardines) a few times per week if you enjoy it

## Quick check (today)
If a meal feels “not satisfying,” add a small fat source (1 tbsp olive oil, a handful of nuts, or avocado).`,
    tags: ['macro', 'fat', 'satiety'],
  },
  {
    id: 'fiber-hero',
    title: 'Fiber: the underrated health lever',
    summary: 'Fiber supports digestion, blood sugar steadiness, and fullness.',
    markdown: `## What it is
Fiber is the part of plants you don’t fully digest. It feeds beneficial gut bacteria and helps move things along.

## Why it matters
- Helps you feel full and satisfied
- Supports regular digestion
- Can help smooth blood sugar spikes after meals

## High-fiber add-ons
- Beans/lentils, berries, chia/flax, oats
- Veggies (especially leafy greens, cruciferous)
- Whole grains you actually like

## Quick check (today)
Add one “fiber anchor” to your next meal: a fruit, a big handful of veggies, or ½ cup beans/lentils.`,
    tags: ['macro', 'fiber', 'gut'],
  },
  {
    id: 'sodium-smart',
    title: 'Sodium: friend, not villain',
    summary: 'Sodium supports fluid balance and nerves — but too much can add up fast.',
    markdown: `## What it is
Sodium is a mineral (an electrolyte) found naturally in foods and added as salt.

## Why it matters
- Helps regulate fluid balance and blood pressure
- Needed for nerve signals and muscle contraction

## Where it sneaks in
- Restaurant meals, sauces, deli meats, packaged snacks
- “Healthy” convenience foods can still be salty

## Quick check (today)
If you’re cooking at home, use herbs/spices + a measured pinch of salt, and taste at the end. If you eat out, balance the day with potassium-rich foods (fruit, potatoes, beans).`,
    tags: ['micro', 'sodium', 'electrolytes'],
  },
  {
    id: 'potassium-balance',
    title: 'Potassium: the sodium counterbalance',
    summary: 'Potassium supports heart rhythm and helps balance sodium.',
    markdown: `## What it is
Potassium is an electrolyte found mostly in plant foods (and dairy).

## Why it matters
- Supports normal heart rhythm and muscle function
- Helps balance sodium’s effect on blood pressure

## Easy food sources
- Potatoes/sweet potatoes, bananas, oranges
- Beans/lentils, spinach, yogurt

## Quick check (today)
Add one potassium-rich item to a salty day: a banana, a baked potato, or a cup of beans/lentils.`,
    tags: ['micro', 'potassium', 'electrolytes'],
  },
  {
    id: 'magnesium-calm',
    title: 'Magnesium: muscle + mood support',
    summary: 'Magnesium is involved in hundreds of processes, including muscle function.',
    markdown: `## What it is
Magnesium is a mineral used in energy production, muscle relaxation, and nerve function.

## Why it matters
- Supports muscle function and recovery
- Plays a role in sleep quality and stress response
- Helps regulate blood sugar and blood pressure

## Food sources
- Pumpkin seeds, almonds, cashews
- Beans/lentils, whole grains, leafy greens
- Dark chocolate (yes, it counts)

## Quick check (today)
Try a magnesium snack: yogurt + pumpkin seeds, or a handful of nuts with fruit.`,
    tags: ['micro', 'magnesium', 'recovery'],
  },
  {
    id: 'calcium-beyond-milk',
    title: 'Calcium: not just for bones',
    summary: 'Calcium supports bones, muscle contraction, and nerve signaling.',
    markdown: `## What it is
Calcium is a mineral stored mostly in your bones, but it’s also used constantly in your blood and muscles.

## Why it matters
- Bone strength over the long term
- Muscle contraction and nerve signals

## Food sources
- Dairy (milk, yogurt, cheese) if you tolerate it
- Fortified plant milks, tofu made with calcium
- Sardines with bones, leafy greens (varies by type)

## Quick check (today)
Add one calcium source: yogurt at breakfast, fortified milk in coffee, or tofu in a stir-fry.`,
    tags: ['micro', 'calcium', 'bones'],
  },
  {
    id: 'iron-energy',
    title: 'Iron: energy and oxygen transport',
    summary: 'Iron helps carry oxygen; low intake can impact energy levels.',
    markdown: `## What it is
Iron is a mineral used to make hemoglobin — the protein that carries oxygen in red blood cells.

## Why it matters
- Supports energy and endurance
- Important for growth and recovery

## Food sources
- Red meat, poultry, fish
- Beans/lentils, spinach, fortified cereals

## Absorption tip
Pair plant iron with vitamin C (citrus, bell pepper, strawberries) to improve absorption.

## Quick check (today)
Add a vitamin C side to a plant-based meal (beans + salsa, lentils + lemon).`,
    tags: ['micro', 'iron', 'energy'],
  },
  {
    id: 'vitamin-d',
    title: 'Vitamin D: the sunlight vitamin',
    summary: 'Vitamin D supports bones and immune function; many people run low.',
    markdown: `## What it is
Vitamin D helps your body absorb calcium and supports immune function.

## Why it matters
- Bone health (via calcium absorption)
- Immune function

## Where to get it
- Sunlight exposure (varies by season/latitude/skin tone)
- Fatty fish, egg yolks, fortified milk/plant milks

## Quick check (today)
If you rarely eat vitamin D foods, add one: eggs at breakfast or salmon at dinner. (Supplements can help, but talk with a clinician if unsure.)`,
    tags: ['micro', 'vitaminD', 'bones'],
  },
  {
    id: 'b12-basics',
    title: 'Vitamin B12: especially important if you eat plant-forward',
    summary: 'B12 supports nerves and red blood cells; it’s mainly in animal foods.',
    markdown: `## What it is
Vitamin B12 supports nerve health and red blood cell production.

## Why it matters
- Helps prevent fatigue related to deficiency
- Supports healthy nerve function

## Food sources
- Meat, fish, dairy, eggs
- Fortified foods (some plant milks, nutritional yeast)

## Quick check (today)
If you’re mostly plant-based, look for a reliable B12 source (fortified foods or a supplement plan with guidance).`,
    tags: ['micro', 'vitaminB12', 'plantBased'],
  },
  {
    id: 'folate',
    title: 'Folate: cell growth + recovery',
    summary: 'Folate supports DNA and cell division; it’s abundant in greens and legumes.',
    markdown: `## What it is
Folate (vitamin B9) is used for DNA synthesis and cell division.

## Why it matters
- Supports recovery and healthy blood cells
- Especially important during pregnancy (prenatal guidance is key)

## Food sources
- Lentils/beans, leafy greens, asparagus
- Avocado, citrus, fortified grains

## Quick check (today)
Add a legume: toss lentils into a salad or add black beans to a bowl.`,
    tags: ['micro', 'folate', 'recovery'],
  },
  {
    id: 'vitamin-c',
    title: 'Vitamin C: not just for colds',
    summary: 'Vitamin C supports collagen, iron absorption, and antioxidant defense.',
    markdown: `## What it is
Vitamin C is a water-soluble vitamin found in many fruits and vegetables.

## Why it matters
- Supports collagen (skin, tendons, connective tissue)
- Helps absorb iron from plant foods
- Antioxidant support

## Easy sources
- Citrus, kiwi, strawberries
- Bell peppers, broccoli, tomatoes

## Quick check (today)
Add a “C booster” to one meal: fruit after lunch, or peppers/tomatoes in a salad.`,
    tags: ['micro', 'vitaminC', 'ironAbsorption'],
  },
  {
    id: 'zinc',
    title: 'Zinc: immune + skin support',
    summary: 'Zinc supports immune function and wound healing.',
    markdown: `## What it is
Zinc is a mineral involved in immune function, skin health, and protein synthesis.

## Why it matters
- Supports immune response
- Helps with wound healing
- Plays roles in taste/smell

## Food sources
- Meat and shellfish
- Pumpkin seeds, beans, dairy

## Quick check (today)
Top a meal with pumpkin seeds or add a serving of beans to boost zinc (and fiber).`,
    tags: ['micro', 'zinc', 'immune'],
  },
  {
    id: 'iodine-thyroid',
    title: 'Iodine: tiny nutrient, big impact',
    summary: 'Iodine supports thyroid hormones that regulate metabolism.',
    markdown: `## What it is
Iodine is a mineral used to make thyroid hormones.

## Why it matters
- Thyroid hormones help regulate metabolism and energy

## Food sources
- Iodized salt (common and effective)
- Seafood, dairy, eggs (varies)

## Quick check (today)
If you use specialty salts (sea salt, Himalayan) most of the time, consider keeping iodized salt for some home cooking (a small amount goes a long way).`,
    tags: ['micro', 'iodine', 'thyroid'],
  },
  {
    id: 'selenium',
    title: 'Selenium: antioxidant partner',
    summary: 'Selenium supports antioxidant enzymes and thyroid function.',
    markdown: `## What it is
Selenium is a mineral used in antioxidant enzymes and thyroid hormone metabolism.

## Food sources
- Brazil nuts (very concentrated — a little goes a long way)
- Seafood, meat, eggs

## Quick check (today)
Add selenium simply: include eggs or fish, or 1 Brazil nut if you enjoy them (avoid overdoing it).`,
    tags: ['micro', 'selenium', 'thyroid'],
  },
  {
    id: 'hydration',
    title: 'Hydration: performance’s simplest upgrade',
    summary: 'Mild dehydration can look like fatigue, headaches, or cravings.',
    markdown: `## Why it matters
Hydration supports energy, focus, digestion, and exercise performance.

## Easy signs you may need more
- Darker urine (not a perfect test, but a helpful hint)
- Afternoon headache or sluggishness
- You feel “hungry” but water fixes it

## Quick check (today)
Use a tiny habit: drink a full glass of water before your first coffee, and another with lunch.`,
    tags: ['habits', 'hydration'],
  },
  {
    id: 'balanced-plate',
    title: 'The 3-part plate (simple, not restrictive)',
    summary: 'A default template: protein + fiber-rich carbs + colorful plants.',
    markdown: `## The idea
When you’re unsure what to eat, build a plate with:\n\n- **Protein** (palm-sized)\n- **Plants** (at least 1–2 fists of veggies/fruit)\n- **Carb or fat** based on your needs (training day vs rest day)\n
## Why it works
- More consistent energy\n- Better satiety\n- Less decision fatigue\n
## Quick check (today)
At your next meal, add the missing part. If it’s mostly carbs, add protein. If it’s mostly protein, add plants.`,
    tags: ['habits', 'balancedPlate'],
  },
  {
    id: 'label-reading',
    title: 'Label reading: one thing to check first',
    summary: 'Start with protein + fiber — they predict fullness better than calories alone.',
    markdown: `## The simple move
When comparing two packaged foods, check:\n\n- **Protein** (more helps satiety)\n- **Fiber** (more supports fullness and digestion)\n\nThen consider sodium/added sugar if relevant for you.

## Quick check (today)
Pick one snack you buy often and find a higher-protein or higher-fiber version.`,
    tags: ['habits', 'labels'],
  },
  {
    id: 'added-sugar',
    title: 'Added sugar: it’s the “stealth ingredient”',
    summary: 'Added sugar isn’t evil, but it’s easy to overdo without noticing.',
    markdown: `## What it is
Added sugar is sugar added during processing/cooking (different from sugar naturally in fruit or milk).

## Why it matters
- Can make foods less filling for the calories
- Often crowds out protein/fiber in snacks

## Quick check (today)
If you’re craving sweets, try the “pairing rule”: sweet + protein (fruit + yogurt, chocolate + nuts).`,
    tags: ['habits', 'sugar', 'satiety'],
  },
  {
    id: 'ultra-processed',
    title: 'Ultra-processed foods: the real issue is “easy to overeat”',
    summary: 'Many ultra-processed foods are engineered to be hyper-palatable.',
    markdown: `## The useful framing
It’s not “good vs bad.” It’s that some foods are:\n\n- Fast to eat\n- Low in protein/fiber\n- Easy to keep snacking on\n\n## Quick check (today)
If you eat an ultra-processed snack, add a “brake” food next to it: fruit, yogurt, or a handful of nuts.`,
    tags: ['habits', 'processedFoods'],
  },
  {
    id: 'protein-breakfast',
    title: 'Protein at breakfast = calmer hunger later',
    summary: 'A protein-forward breakfast can reduce late-morning cravings.',
    markdown: `## Why it helps
Starting the day with protein often improves satiety and steadier energy.

## Easy ideas
- Greek yogurt + berries\n- Eggs + toast + fruit\n- Protein smoothie with milk/Greek yogurt\n- Tofu scramble\n
## Quick check (today)
Add 20–30g protein to breakfast (or your first meal) and notice hunger timing.`,
    tags: ['habits', 'protein', 'breakfast'],
  },
  {
    id: 'post-workout',
    title: 'Post-workout nutrition: keep it simple',
    summary: 'Protein + carbs after training supports recovery.',
    markdown: `## What to do
After training, aim for:\n\n- **Protein** to support muscle repair\n- **Carbs** to replenish energy\n\n## Easy combos
- Chocolate milk\n- Rice + chicken\n- Yogurt + fruit + granola\n- Sandwich + fruit\n
## Quick check (today)
Within a couple hours after your workout, get a protein + carb combo you actually enjoy.`,
    tags: ['habits', 'recovery', 'training'],
  },
  {
    id: 'snack-structure',
    title: 'Better snacks: build a “mini meal”',
    summary: 'Protein + fiber beats “just carbs” for lasting fullness.',
    markdown: `## The template
A satisfying snack usually includes:\n\n- **Protein** (yogurt, cheese, jerky, tofu)\n- **Fiber** (fruit, veggies, whole grains)\n- Optional **fat** (nuts, peanut butter)\n
## Quick check (today)
Upgrade one snack using the template (apple + peanut butter, yogurt + berries, hummus + veggies).`,
    tags: ['habits', 'snacks', 'satiety'],
  },
  {
    id: 'satiety-signals',
    title: 'Satiety isn’t willpower — it’s meal design',
    summary: 'Meals with protein, fiber, and volume help you feel satisfied.',
    markdown: `## The three big drivers
- **Protein**\n- **Fiber**\n- **Volume** (water-rich foods like soups, fruit, veggies)\n
## Quick check (today)
If you’re often hungry after meals, add one driver: extra veggies, a side of fruit, or a bigger protein portion.`,
    tags: ['habits', 'satiety'],
  },
  {
    id: 'omega-3',
    title: 'Omega-3 fats: brain + heart support',
    summary: 'Omega-3s are fats linked to heart and brain health.',
    markdown: `## What they are
Omega-3s are a type of fat. Two common ones are EPA and DHA (mostly from seafood).

## Food sources
- Salmon, sardines, trout\n- Chia/flax/walnuts (ALA, a plant form)\n
## Quick check (today)
If you like fish, plan one omega-3 meal this week. If not, add chia/flax to oats or yogurt.`,
    tags: ['macro', 'fat', 'omega3'],
  },
  {
    id: 'cholesterol-context',
    title: 'Dietary cholesterol: context matters',
    summary: 'For many people, saturated fat matters more than cholesterol itself.',
    markdown: `## The practical takeaway
For many people, overall eating pattern matters more than avoiding a single nutrient.\n\nFocus on:\n- More fiber-rich foods\n- Mostly unsaturated fats\n- Adequate protein\n
## Quick check (today)
If you’re improving “heart-friendly” eating, add a fiber anchor (beans/oats/fruit) and swap one fat source to olive oil or nuts.`,
    tags: ['habits', 'heartHealth'],
  },
  {
    id: 'saturated-fat',
    title: 'Saturated fat: not forbidden, just easy to overdo',
    summary: 'Keep saturated fat in balance by emphasizing unsaturated fats.',
    markdown: `## Where it’s found
Common sources include butter, high-fat dairy, fatty cuts of meat, and some baked goods.

## Quick check (today)
Pick one swap: olive oil instead of butter, or add avocado/nuts to a meal and reduce a saturated-fat heavy side.`,
    tags: ['habits', 'fat'],
  },
  {
    id: 'meal-timing',
    title: 'Meal timing: consistency beats perfection',
    summary: 'Regular meals can reduce extreme hunger and impulse snacking.',
    markdown: `## The point
Long gaps can lead to “hangry” choices. A simple rhythm helps.

## Quick check (today)
If you often crash mid-afternoon, add a planned snack 2–3 hours after lunch (protein + fiber).`,
    tags: ['habits', 'mealTiming'],
  },
  {
    id: 'volume-eating',
    title: 'Want bigger meals? Use volume foods',
    summary: 'Vegetables, fruit, soups, and potatoes add fullness for fewer calories.',
    markdown: `## What are volume foods?
Foods high in water and fiber that take up space in your stomach.

## Examples
- Big salads with a protein\n- Vegetable soups\n- Fruit as a dessert\n- Potatoes with lean protein (surprisingly filling)\n
## Quick check (today)
Add a “volume side” to dinner: soup, salad, or a pile of roasted veggies.`,
    tags: ['habits', 'satiety', 'volume'],
  },
  {
    id: 'micronutrient-diversity',
    title: 'Micronutrients: diversity wins',
    summary: 'Different colors and food groups = different vitamins and minerals.',
    markdown: `## The simple rule
Try to rotate:\n- Protein sources (fish, poultry, beans, tofu)\n- Fruits/veggies (colors)\n- Carbs (oats, rice, potatoes, whole grains)\n
## Quick check (today)
Add one new color to your plate (red peppers, purple cabbage, blueberries, spinach).`,
    tags: ['habits', 'micronutrients'],
  },
  {
    id: 'gut-friendly',
    title: 'Gut-friendly eating: fiber + variety',
    summary: 'Your gut microbes love diverse plant fibers.',
    markdown: `## What helps
- A mix of fibers from different plants\n- Fermented foods if you enjoy them (yogurt, kefir, kimchi)\n
## Quick check (today)
Add one “extra plant” today: berries, beans, leafy greens, or a side of vegetables.`,
    tags: ['habits', 'gut', 'fiber'],
  },
  {
    id: 'sleep-nutrition',
    title: 'Sleep and food: avoid the “too hungry, too full” trap',
    summary: 'Both heavy meals and going to bed hungry can disrupt sleep.',
    markdown: `## Practical tips
- If dinner is early, a small snack may help (protein + carbs).\n- If late-night meals are heavy, lighten dinner and add an earlier snack.\n
## Quick check (today)
If you often snack late, try a planned evening snack: yogurt + fruit, or toast + eggs.`,
    tags: ['habits', 'sleep'],
  },
  {
    id: 'energy-drinks',
    title: 'Caffeine: watch the timing',
    summary: 'Late caffeine can quietly wreck sleep, which affects appetite and energy.',
    markdown: `## The useful rule
If sleep is a goal, keep caffeine earlier in the day.

## Quick check (today)
Set a caffeine cutoff time (example: 2pm) and see how your sleep and cravings change.`,
    tags: ['habits', 'caffeine', 'sleep'],
  },
  {
    id: 'restaurant-strategy',
    title: 'Restaurant meals: use one simple strategy',
    summary: 'You don’t need “perfect” — just add protein and plants.',
    markdown: `## The strategy
Order:\n- A clear protein\n- A veggie side (or add a salad)\n- Enjoy carbs/dessert intentionally if you want them\n
## Quick check (today)
If you eat out, ask for an extra veggie side or swap fries for a salad (when you actually want it).`,
    tags: ['habits', 'restaurants', 'balance'],
  },
  {
    id: 'salt-sweat',
    title: 'If you sweat a lot, salt needs change',
    summary: 'Active people may need more electrolytes, especially in heat.',
    markdown: `## The idea
If you train hard, sweat heavily, or it’s hot, sodium needs can increase.

## Quick check (today)
On a heavy-sweat day, include electrolytes: a salty meal, broth, or an electrolyte drink you tolerate. If you have blood pressure concerns, follow your clinician’s guidance.`,
    tags: ['micro', 'sodium', 'training'],
  },
  {
    id: 'nutrition-mindset',
    title: 'Nutrition mindset: aim for “better,” not perfect',
    summary: 'Small wins repeated beat big changes you can’t sustain.',
    markdown: `## A sustainable rule
Pick one upgrade you can do most days:\n- Add a protein at breakfast\n- Add a fruit/veg to lunch\n- Drink water before coffee\n
## Quick check (today)
Choose one tiny upgrade and do it once. That’s the win.`,
    tags: ['habits', 'mindset'],
  },
] as const;

