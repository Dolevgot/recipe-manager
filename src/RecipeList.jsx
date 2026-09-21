import { useMemo, useState } from 'react'
import { KASHRUT } from './config'
import { matchesSearch } from './text'
import { Badge } from './ui'

export default function RecipeList({ recipes, categories }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [kashrut, setKashrut] = useState('')

  const shown = useMemo(
    () =>
      recipes.filter(
        (r) =>
          matchesSearch(r, query) &&
          (!category || r.category === category) &&
          (!kashrut || r.kashrut === kashrut),
      ),
    [recipes, query, category, kashrut],
  )

  if (recipes.length === 0) {
    return (
      <div className="center-note">
        <p>עוד אין מתכונים.</p>
        <p>
          <a href="#/new">הוסף את הראשון</a> או <a href="#/import">ייבא מגוגל דוקס</a>.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="filters">
        <input
          type="search"
          placeholder="חיפוש לפי שם או מצרך…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="חיפוש"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="קטגוריה">
          <option value="">כל הקטגוריות</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={kashrut} onChange={(e) => setKashrut(e.target.value)} aria-label="כשרות">
          <option value="">כל סוגי הכשרות</option>
          {KASHRUT.map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>
      <p className="count" aria-live="polite">
        {shown.length === recipes.length ? `${recipes.length} מתכונים` : `נמצאו ${shown.length} מתכונים מתוך ${recipes.length}`}
      </p>
      {shown.length === 0 ? (
        <div className="center-note"><p>לא נמצאו מתכונים שמתאימים לחיפוש.</p></div>
      ) : (
        <ul className="cards">
          {shown.map((r) => (
            <li key={r.id}>
              <a className="card" href={`#/recipe/${r.id}`}>
                <div className="card-head">
                  <h2>{r.name}</h2>
                  <Badge kashrut={r.kashrut} />
                </div>
                {r.description && <p className="desc">{r.description}</p>}
                <p className="meta">
                  {r.category && <span>{r.category}</span>}
                  {r.total_time && <span>⏱ {r.total_time}</span>}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
