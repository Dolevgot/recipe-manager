// Small text helpers, shared by search, the recipe view and the importer.

// Lower-case, drop niqqud/cantillation, unify quote marks, collapse whitespace.
export function normalize(text) {
  return String(text ?? '')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[“”״]/g, '"')
    .replace(/[‘’׳]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Every word typed in the search box must appear in the name or the ingredients.
export function matchesSearch(recipe, query) {
  const words = normalize(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalize(`${recipe.name} ${recipe.ingredients}`)
  return words.every((w) => haystack.includes(w))
}

// A multi-line cell -> [{ heading: bool, text }]. A line ending with ":" is a sub-heading.
export function parseLines(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ heading: line.endsWith(':'), text: line }))
}
