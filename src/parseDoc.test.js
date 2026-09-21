import { describe, expect, it } from 'vitest'
import { guessCategory, kashrutFromType, parseDoc } from './parseDoc'
import { matchesSearch, normalize, parseLines } from './text'

// --- tiny builders that produce the same shape as the Google Docs API ------
const para = (text) => ({ paragraph: { elements: [{ textRun: { content: `${text}\n` } }] } })
const pageBreak = () => ({ paragraph: { elements: [{ pageBreak: {} }, { textRun: { content: '\n' } }] } })
const cell = (...lines) => ({ content: lines.map(para) })
const table = (...cells) => ({ table: { rows: 1, tableRows: [{ tableCells: cells }] } })

const fixture = {
  body: {
    content: [
      { sectionBreak: {} },
      para('תוכן העניינים'),
      para('מרק עדשים'),
      para('שניצל בתנור'),
      pageBreak(),
      para('מרק עדשים כתומות'),
      para('מרק חם ומחמם לימי חורף'),
      table(cell('מנות', '6'), cell('סוג', 'טבעוני/פרווה'), cell('הכנה', "10 דק'"), cell('בישול', "30 דק'")),
      table(
        cell('אופן ההכנה', 'מטגנים את הבצל', 'מוסיפים עדשים ומים', 'להגשה:', 'מפזרים כוסברה'),
        cell('מצרכים', 'בצל', 'עדשים כתומות', 'לתיבול:', 'כורכום'),
      ),
      para('💡 אפשר להקפיא עד חודש'),
      pageBreak(),
      para('שניצל בתנור'),
      para('פריך בלי טיגון'),
      table(cell('מנות', '4'), cell('סוג', 'בשרי'), cell('אפייה', "25 דק'"), cell('תנור', '200 מעלות'), cell('סה"כ', 'כ-40 דק׳')),
      table(cell('אופן ההכנה', 'מתבלים', 'אופים'), cell('מצרכים', 'חזה עוף', 'פירורי לחם')),
    ],
  },
}

describe('parseDoc', () => {
  const recipes = parseDoc(fixture)

  it('skips the table of contents and finds every recipe', () => {
    expect(recipes.map((r) => r.name)).toEqual(['מרק עדשים כתומות', 'שניצל בתנור'])
  })

  it('reads title, description and meta cells', () => {
    const [soup] = recipes
    expect(soup.description).toBe('מרק חם ומחמם לימי חורף')
    expect(soup.servings).toBe('6')
    expect(soup.prep_time).toBe("10 דק'")
    expect(soup.cook_time).toBe("30 דק'")
    expect(soup.total_time).toBe('')
  })

  it('maps סוג to kashrut', () => {
    expect(recipes[0].kashrut).toBe('טבעוני')
    expect(recipes[1].kashrut).toBe('בשרי')
  })

  it('handles optional meta cells: oven, total, baking', () => {
    const [, schnitzel] = recipes
    expect(schnitzel.cook_time).toBe("25 דק'")
    expect(schnitzel.oven).toBe('200 מעלות')
    expect(schnitzel.total_time).toBe('כ-40 דק׳')
  })

  it('splits ingredients and steps, keeping sub-headings', () => {
    const [soup] = recipes
    expect(soup.ingredients).toBe('בצל\nעדשים כתומות\nלתיבול:\nכורכום')
    expect(soup.instructions).toBe('מטגנים את הבצל\nמוסיפים עדשים ומים\nלהגשה:\nמפזרים כוסברה')
  })

  it('puts the 💡 line in tips, without the emoji', () => {
    expect(recipes[0].tips).toBe('אפשר להקפיא עד חודש')
    expect(recipes[1].tips).toBe('')
  })

  it('guesses categories from keywords', () => {
    expect(recipes[0].category).toBe('מרקים')
    expect(recipes[1].category).toBe('עוף')
  })

  it('returns an empty list for an empty doc', () => {
    expect(parseDoc({ body: { content: [] } })).toEqual([])
  })
})

describe('helpers', () => {
  it('kashrutFromType', () => {
    expect(kashrutFromType('טבעוני/פרווה')).toBe('טבעוני')
    expect(kashrutFromType('חלבי')).toBe('חלבי')
    expect(kashrutFromType('')).toBe('')
  })

  it('guessCategory prefers soup over chicken', () => {
    expect(guessCategory('מרק עוף')).toBe('מרקים')
    expect(guessCategory('פרגיות בגריל')).toBe('עוף')
    expect(guessCategory('משהו לא מוכר')).toBe('')
  })

  it('normalize ignores niqqud and extra spaces', () => {
    expect(normalize('  שָׁלוֹם   עוֹלָם ')).toBe('שלום עולם')
  })

  it('search matches name and ingredients, all words required', () => {
    const recipe = { name: 'מרק עדשים', ingredients: 'בצל\nגזר' }
    expect(matchesSearch(recipe, 'עדשים')).toBe(true)
    expect(matchesSearch(recipe, 'גזר  מרק')).toBe(true)
    expect(matchesSearch(recipe, 'גזר תפוח')).toBe(false)
    expect(matchesSearch(recipe, '')).toBe(true)
  })

  it('parseLines marks lines ending with a colon as headings', () => {
    expect(parseLines('למרק:\nבצל\n\nלהגשה:')).toEqual([
      { heading: true, text: 'למרק:' },
      { heading: false, text: 'בצל' },
      { heading: true, text: 'להגשה:' },
    ])
  })
})
