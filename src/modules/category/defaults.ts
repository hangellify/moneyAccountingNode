export interface DefaultSubCategory {
  name: string;
}

export interface DefaultCategoryNode {
  name: string;
  subCategories: DefaultSubCategory[];
}

const nodes = (names: string[]): DefaultSubCategory[] =>
  names.map((n) => ({ name: n }));

export const DEFAULT_CATEGORY_TREE: readonly DefaultCategoryNode[] = [
  {
    name: 'Bread',
    subCategories: nodes(['pita', 'bun', 'galettes', 'baguette', 'rolls']),
  },
  {
    name: 'Dairy',
    subCategories: nodes([
      'milk',
      'cheese',
      'yogurt',
      'butter',
      'cream',
      'eggs',
    ]),
  },
  {
    name: 'Fruits',
    subCategories: nodes([
      'apples',
      'bananas',
      'citrus',
      'berries',
      'grapes',
      'stone fruits',
    ]),
  },
  {
    name: 'Vegetables',
    subCategories: nodes([
      'tomatoes',
      'potatoes',
      'onions',
      'leafy greens',
      'cucumbers',
      'peppers',
    ]),
  },
  {
    name: 'Meat & Fish',
    subCategories: nodes([
      'beef',
      'chicken',
      'pork',
      'fish',
      'sausages',
      'deli',
    ]),
  },
  {
    name: 'Pantry',
    subCategories: nodes([
      'rice',
      'pasta',
      'flour',
      'sugar',
      'oil',
      'spices',
      'canned goods',
    ]),
  },
  {
    name: 'Beverages',
    subCategories: nodes([
      'water',
      'soft drinks',
      'juice',
      'coffee',
      'tea',
      'alcohol',
    ]),
  },
  {
    name: 'Snacks & Sweets',
    subCategories: nodes(['chips', 'cookies', 'chocolate', 'candy', 'nuts']),
  },
  {
    name: 'Frozen',
    subCategories: nodes([
      'frozen meals',
      'ice cream',
      'frozen vegetables',
      'frozen fish',
    ]),
  },
  {
    name: 'Cat Supplies',
    subCategories: nodes(['dry food', 'wet food', 'litter', 'toys', 'treats']),
  },
  {
    name: 'Household Chemicals',
    subCategories: nodes([
      'dish soap',
      'laundry detergent',
      'surface cleaner',
      'bleach',
      'fabric softener',
    ]),
  },
  {
    name: 'Household & Domestic Goods',
    subCategories: nodes([
      'paper towels',
      'toilet paper',
      'light bulbs',
      'batteries',
      'cleaning tools',
    ]),
  },
];
