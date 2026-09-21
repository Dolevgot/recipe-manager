import { useState } from 'react'
import { ensureDocsAccess } from './auth'
import { extractDocId, fetchDoc } from './docs'
import { parseDoc } from './parseDoc'
import { addRecipes } from './sheets'
import { normalize } from './text'
import { Badge, ErrorBox, Loading } from './ui'

export default function ImportScreen({ categories, existingNames, onImported }) {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('input') // input | reading | preview | importing
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  async function read(e) {
    e.preventDefault()
    const docId = extractDocId(input)
    if (!docId) return setError(new Error('לא זוהה קישור או מזהה של מסמך'))
    setError(null)
    setPhase('reading')
    try {
      await ensureDocsAccess()
      const recipes = parseDoc(await fetchDoc(docId))
      const known = new Set(existingNames.map(normalize))
      setRows(recipes.map((recipe) => {
        const exists = known.has(normalize(recipe.name))
        return { recipe, exists, selected: !exists }
      }))
      setPhase('preview')
    } catch (err) {
      setError(err)
      setPhase('input')
    }
  }

  const change = (i, patch) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const changeCategory = (i, category) =>
    setRows((all) => all.map((r, j) => (j === i ? { ...r, recipe: { ...r.recipe, category } } : r)))
  const chosen = rows.filter((r) => r.selected && !r.exists)

  async function doImport() {
    setPhase('importing')
    try {
      await addRecipes(chosen.map((r) => r.recipe))
      await onImported()
    } catch (err) {
      setError(err)
      setPhase('preview')
    }
  }

  if (phase === 'reading') return <Loading text="קורא את המסמך…" />
  if (phase === 'importing') return <Loading text="מייבא לגיליון…" />

  return (
    <section className="import">
      <h1>ייבוא מגוגל דוקס</h1>
      {phase === 'input' && (
        <form onSubmit={read} className="form">
          <label className="field">
            <span>קישור למסמך או מזהה (ID)</span>
            <input value={input} onChange={(e) => setInput(e.target.value)} dir="ltr" placeholder="https://docs.google.com/document/d/…" />
          </label>
          <div className="row"><button type="submit">קרא מסמך</button></div>
        </form>
      )}
      {error && <ErrorBox error={error} />}

      {phase === 'preview' && (
        <>
          <p>
            נמצאו {rows.length} מתכונים. אפשר לתקן קטגוריה לכל אחד ולבטל סימון למתכונים שלא רוצים.
            מתכונים שהשם שלהם כבר קיים בגיליון מדולגים.
          </p>
          {rows.length === 0 && <p>לא זוהו מתכונים במסמך. בדוק שזה המסמך הנכון.</p>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th></th><th>שם</th><th>כשרות</th><th>קטגוריה</th></tr>
              </thead>
              <tbody>
                {rows.map(({ recipe, exists, selected }, i) => (
                  <tr key={i} className={exists ? 'skipped' : ''}>
                    <td>
                      <input type="checkbox" checked={selected && !exists} disabled={exists}
                        onChange={(e) => change(i, { selected: e.target.checked })} aria-label={`ייבוא ${recipe.name}`} />
                    </td>
                    <td>{recipe.name}{exists && <small> (כבר קיים)</small>}</td>
                    <td><Badge kashrut={recipe.kashrut} /></td>
                    <td>
                      <select value={recipe.category} onChange={(e) => changeCategory(i, e.target.value)} disabled={exists}>
                        <option value="">ללא</option>
                        {categories.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button onClick={doImport} disabled={chosen.length === 0}>ייבא {chosen.length} מתכונים</button>
            <button className="secondary" onClick={() => setPhase('input')}>חזרה</button>
          </div>
        </>
      )}
    </section>
  )
}
