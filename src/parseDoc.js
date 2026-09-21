// Turns the JSON returned by the Google Docs API into a list of recipes.
// Pure function: no network, no React. See parseDoc.test.js for the expected doc shape.
import { DEFAULT_CATEGORIES } from './config'
import { normalize } from './text'

// --- step 1: flatten the Docs JSON ------------------------------------------

const paragraphText = (p) =>
  (p.elements ?? []).map((e) => e.textRun?.content ?? '').join('').replace(/\n$/, '')

// A table cell -> its paragraphs as plain lines (empty ones dropped).
const cellLines = (cell) =>
  (cell.content ?? [])
    .filter((c) => c.paragraph)
    .map((c) => paragraphText(c.paragraph).trim())
    .filter(Boolean)

// Body -> a flat list of { type: 'p', text } | { type: 'table', cells: [[lines]] } | { type: 'break' }.
function flatten(doc) {
  const items = []
  const content = doc.body?.content ?? doc.tabs?.[0]?.documentTab?.body?.content ?? []
  for (const el of content) {
    if (el.paragraph) {
      let text = ''
      for (const part of el.paragraph.elements ?? []) {
        if (part.pageBreak) {
          if (text.trim()) items.push({ type: 'p', text: text.trim() })
          text = ''
          items.push({ type: 'break' })
        } else {
          text += part.textRun?.content ?? ''
        }
      }
      if (text.trim()) items.push({ type: 'p', text: text.trim() })
    } else if (el.table) {
      // Recipes use one-row tables; other shapes are flattened row by row anyway.
      const cells = el.table.tableRows.flatMap((row) => row.tableCells.map(cellLines))
      items.push({ type: 'table', cells })
    }
  }
  return items
}

// --- step 2: read one recipe ------------------------------------------------

const INGREDIENTS_LABEL = 'מצרכים'
const STEPS_LABEL = 'אופן ההכנה'

const startsWithLabel = (cell, label) => normalize(cell[0] ?? '').startsWith(label)

// Cell lines -> the lines after the label ("מצרכים" or "מצרכים:"), text on the label line is kept.
function afterLabel(cell, label) {
  const first = cell[0].replace(new RegExp(`^\\s*${label}\\s*:?\\s*`), '').trim()
  return [first, ...cell.slice(1)].filter(Boolean)
}

// "סה"כ" is written with several kinds of quote marks.
const META_LABELS = [
  ['מנות', 'servings'],
  ['סוג', 'kashrut'],
  ['הכנה', 'prep_time'],
  ['בישול', 'cook_time'],
  ['צלייה', 'cook_time'],
  ['אפייה', 'cook_time'],
  ['אפיה', 'cook_time'],
  ['סה"כ', 'total_time'],
  ['תנור', 'oven'],
]

function readMeta(table) {
  const meta = {}
  const cookParts = []
  for (const cell of table.cells) {
    const text = cell.join(' ').replace(/[“”״]/g, '"') // keep the value's own casing
    const found = META_LABELS.find(([label]) => text.startsWith(label))
    if (!found) continue
    const [label, field] = found
    const value = text.slice(label.length).replace(/^[\s:]+/, '')
    if (field === 'cook_time') cookParts.push({ label, value })
    else meta[field] = value
  }
  if (cookParts.length === 1) meta.cook_time = cookParts[0].value
  else if (cookParts.length > 1) meta.cook_time = cookParts.map((p) => `${p.label} ${p.value}`).join(', ')
  return meta
}

export function kashrutFromType(type) {
  const t = normalize(type)
  if (t.includes('טבעוני')) return 'טבעוני'
  return ['בשרי', 'חלבי', 'פרווה'].find((k) => t.includes(k)) ?? ''
}

// Ordered: the first matching rule wins ("מרק עוף" is a soup, not chicken).
const CATEGORY_RULES = [
  ['מרקים', ['מרק', 'ציר']],
  ['עוגות וקינוחים', ['עוגה', 'עוגת', 'עוגיות', 'קינוח', 'מוס ', 'פאי', 'בראוניז', 'גלידה', 'טירמיסו', 'פאדג', 'קרמבל', 'מאפינס']],
  ['לחמים ומאפים', ['לחם', 'לחמני', 'פיתה', 'פוקאצ', 'חלה', 'בורקס', 'מאפה', 'פיצה', 'בצק', 'לאפה', 'בגט']],
  ['רטבים ותיבולים', ['רוטב', 'תיבול', 'מרינדה', 'ויניגרט', 'פסטו', 'צ\'ימיצ\'ורי', 'קטשופ']],
  ['סלטים וממרחים', ['סלט', 'ממרח', 'חומוס', 'טחינה', 'מטבוחה', 'סחוג', 'חצילים', 'טבולה', 'גואקמולה']],
  ['פסטה ואורז', ['פסטה', 'אורז', 'ניוקי', 'לזניה', 'ריזוטו', 'קוסקוס', 'פילאף', 'ספגטי', 'אטריות', 'פתיתים']],
  ['דגים', ['דג', 'סלמון', 'טונה', 'אמנון', 'לברק', 'מוסר', 'קרפיון', 'בורי']],
  ['עוף', ['עוף', 'פרגית', 'פרגיות', 'שניצל', 'חזה', 'כנפיים', 'הודו', 'שוקיים']],
  ['בשר', ['בשר', 'בקר', 'קציצ', 'צלי', 'אסאדו', 'המבורגר', 'כבד', 'סטייק', 'אנטריקוט', 'קבב', 'שווארמה']],
  ['ירקות ותוספות', ['ירקות', 'תפוחי אדמה', 'תפו"א', 'פירה', 'שעועית', 'ברוקולי', 'קישוא', 'תירס', 'בטטה', 'כרובית', 'תוספת', 'צ\'יפס']],
  ['עיקריות צמחוניות', ['שקשוקה', 'פשטידה', 'מג\'דרה', 'טופו', 'חביתה', 'קציצות ירק', 'עדשים', 'צמחוני']],
]

export function guessCategory(name, description = '') {
  for (const text of [normalize(name), normalize(description)]) {
    for (const [category, words] of CATEGORY_RULES) {
      if (words.some((w) => text.includes(w))) return DEFAULT_CATEGORIES.includes(category) ? category : ''
    }
  }
  return ''
}

// One page of the doc -> one recipe, or null if it isn't a recipe (e.g. the table of contents).
function readRecipe(chunk) {
  const tables = chunk.filter((i) => i.type === 'table')
  const content = tables.flatMap((t) => t.cells)
  const ingredients = content.find((c) => startsWithLabel(c, INGREDIENTS_LABEL))
  const steps = content.find((c) => startsWithLabel(c, STEPS_LABEL))
  if (!ingredients && !steps) return null

  const paragraphs = chunk.filter((i) => i.type === 'p').map((i) => i.text)
  const tipLines = paragraphs.filter((p) => p.startsWith('💡'))
  const textLines = paragraphs.filter((p) => !p.startsWith('💡'))
  if (textLines.length === 0) return null

  const isMetaCell = (c) => META_LABELS.some(([l]) => normalize(c.join(' ')).startsWith(l))
  const metaTable = tables.find((t) => t.cells.some(isMetaCell))
  const meta = metaTable ? readMeta(metaTable) : {}
  const [name, ...descriptionLines] = textLines
  const description = descriptionLines.join(' ')

  return {
    name: name.trim(),
    description,
    category: guessCategory(name, description),
    kashrut: kashrutFromType(meta.kashrut ?? ''),
    servings: meta.servings ?? '',
    prep_time: meta.prep_time ?? '',
    cook_time: meta.cook_time ?? '',
    total_time: meta.total_time ?? '',
    oven: meta.oven ?? '',
    ingredients: ingredients ? afterLabel(ingredients, INGREDIENTS_LABEL).join('\n') : '',
    instructions: steps ? afterLabel(steps, STEPS_LABEL).join('\n') : '',
    tips: tipLines.map((t) => t.replace(/^💡\s*/, '')).join('\n'),
    tags: '',
    source: 'ייבוא מגוגל דוקס',
    image_url: '',
  }
}

// --- public -----------------------------------------------------------------

export function parseDoc(doc) {
  const chunks = [[]]
  for (const item of flatten(doc)) {
    if (item.type === 'break') chunks.push([])
    else chunks[chunks.length - 1].push(item)
  }
  return chunks.map(readRecipe).filter(Boolean)
}
