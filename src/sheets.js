// Everything that talks to the Google Sheet. The sheet is the database.
import { authFetch } from './auth'
import { CATEGORIES_TAB, COLUMNS, DEFAULT_CATEGORIES, RECIPES_TAB, SHEET_ID } from './config'

const API = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`
const LAST_COL = 'S' // COLUMNS has 19 entries: A..S
const enc = encodeURIComponent

const get = (path) => authFetch(`${API}${path}`)
const send = (path, method, body) =>
  authFetch(`${API}${path}`, { method, body: JSON.stringify(body) })
const write = (range, values) =>
  send(`/values/${enc(range)}?valueInputOption=RAW`, 'PUT', { values })

// --- row <-> recipe -------------------------------------------------------

function rowToRecipe(row) {
  const recipe = {}
  COLUMNS.forEach((col, i) => (recipe[col] = row[i] ?? ''))
  recipe.deleted = String(recipe.deleted).toUpperCase() === 'TRUE'
  return recipe
}

function recipeToRow(recipe) {
  return COLUMNS.map((col) => (col === 'deleted' ? (recipe.deleted ? 'TRUE' : '') : recipe[col] ?? ''))
}

// --- first run --------------------------------------------------------------

// Creates the tabs and headers if they are missing. Safe to run on every start.
export async function initSheet() {
  const meta = await get('?fields=sheets.properties.title')
  const titles = meta.sheets.map((s) => s.properties.title)
  const missing = [RECIPES_TAB, CATEGORIES_TAB].filter((t) => !titles.includes(t))
  if (missing.length) {
    await send(':batchUpdate', 'POST', {
      requests: missing.map((title) => ({ addSheet: { properties: { title, rightToLeft: true } } })),
    })
  }

  const head = await get(`/values/${enc(`${RECIPES_TAB}!A1:${LAST_COL}1`)}`)
  const headers = head.values?.[0]
  if (!headers) {
    await write(`${RECIPES_TAB}!A1:${LAST_COL}1`, [COLUMNS])
  } else if (COLUMNS.some((col, i) => headers[i] !== col)) {
    throw new Error('הכותרות בלשונית Recipes לא תואמות למה שהאפליקציה מצפה לו')
  }

  const cats = await get(`/values/${enc(`${CATEGORIES_TAB}!A1:A`)}`)
  if (!cats.values?.length) {
    await write(`${CATEGORIES_TAB}!A1:A${DEFAULT_CATEGORIES.length + 1}`, [
      ['name'],
      ...DEFAULT_CATEGORIES.map((c) => [c]),
    ])
  }
}

// --- reading ----------------------------------------------------------------

export async function loadAll() {
  const res = await get(
    `/values:batchGet?ranges=${enc(`${RECIPES_TAB}!A2:${LAST_COL}`)}&ranges=${enc(`${CATEGORIES_TAB}!A2:A`)}`,
  )
  const [recipeRange, categoryRange] = res.valueRanges
  const recipes = (recipeRange.values ?? []).map(rowToRecipe).filter((r) => r.id && !r.deleted)
  const categories = (categoryRange.values ?? []).map((r) => r[0]).filter(Boolean)
  return { recipes, categories }
}

// Row numbers are looked up fresh every time, so rows moved or sorted in the sheet are safe.
async function findRow(id) {
  const res = await get(`/values/${enc(`${RECIPES_TAB}!A:A`)}`)
  const index = (res.values ?? []).findIndex((r) => r[0] === id)
  if (index === -1) throw new Error('המתכון לא נמצא בגיליון (אולי נמחק ידנית)')
  return index + 1
}

// --- writing ----------------------------------------------------------------

export async function addRecipes(list) {
  const now = new Date().toISOString()
  const rows = list.map((r) =>
    recipeToRow({ ...r, id: crypto.randomUUID(), created_at: now, updated_at: now }),
  )
  await send(
    `/values/${enc(`${RECIPES_TAB}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    'POST',
    { values: rows },
  )
}

export async function updateRecipe(recipe) {
  const row = await findRow(recipe.id)
  await write(
    `${RECIPES_TAB}!A${row}:${LAST_COL}${row}`,
    [recipeToRow({ ...recipe, updated_at: new Date().toISOString() })],
  )
}

// Soft delete: the row stays in the sheet with deleted = TRUE.
export async function deleteRecipe(recipe) {
  await updateRecipe({ ...recipe, deleted: true })
}
