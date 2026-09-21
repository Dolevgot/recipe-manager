// Values that change per deployment come from the build environment (see .env.example).
export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
export const SHEET_ID = import.meta.env.VITE_SHEET_ID

export const RECIPES_TAB = 'Recipes'
export const CATEGORIES_TAB = 'Categories'

// The column order of the "Recipes" tab. Do not reorder without migrating the sheet.
export const COLUMNS = [
  'id', 'name', 'description', 'category', 'kashrut', 'servings',
  'prep_time', 'cook_time', 'total_time', 'oven', 'ingredients',
  'instructions', 'tips', 'tags', 'source', 'image_url',
  'created_at', 'updated_at', 'deleted',
]

export const KASHRUT = ['בשרי', 'חלבי', 'פרווה', 'טבעוני']

export const DEFAULT_CATEGORIES = [
  'סלטים וממרחים', 'מרקים', 'ירקות ותוספות', 'פסטה ואורז', 'עוף', 'בשר',
  'דגים', 'עיקריות צמחוניות', 'לחמים ומאפים', 'עוגות וקינוחים', 'רטבים ותיבולים',
]
