import { useEffect, useState } from 'react'
import { errorMessage } from './auth'
import { parseLines } from './text'
import { Badge, ConfirmDialog } from './ui'

// Keeps the phone screen on while a recipe is open (if the browser supports it).
function useWakeLock() {
  useEffect(() => {
    let lock = null
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen')
      } catch {
        /* not allowed right now: ignore */
      }
    }
    // The lock is released when the tab is hidden, so ask again when it comes back.
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [])
}

export default function RecipeView({ recipe, onDelete }) {
  useWakeLock()
  const [checked, setChecked] = useState(new Set())
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const toggle = (i) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  async function confirmDelete() {
    setBusy(true)
    try {
      await onDelete(recipe)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
      setConfirming(false)
    }
  }

  const facts = [
    ['מנות', recipe.servings],
    ['הכנה', recipe.prep_time],
    ['בישול', recipe.cook_time],
    ['סה"כ', recipe.total_time],
    ['תנור', recipe.oven],
  ].filter(([, value]) => value)

  let step = 0
  return (
    <article className="recipe">
      <a href="#/" className="back">→ חזרה לרשימה</a>
      <div className="card-head">
        <h1>{recipe.name}</h1>
        <Badge kashrut={recipe.kashrut} />
      </div>
      {recipe.category && <p className="meta"><span>{recipe.category}</span></p>}
      {recipe.description && <p className="desc">{recipe.description}</p>}
      {recipe.image_url && <img className="photo" src={recipe.image_url} alt={recipe.name} />}

      {facts.length > 0 && (
        <dl className="facts">
          {facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}

      <h2>מצרכים</h2>
      <ul className="checklist">
        {parseLines(recipe.ingredients).map((line, i) =>
          line.heading ? (
            <li key={i}><h3>{line.text}</h3></li>
          ) : (
            <li key={i}>
              <label className={checked.has(i) ? 'done' : ''}>
                <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
                <span>{line.text}</span>
              </label>
            </li>
          ),
        )}
      </ul>

      <h2>אופן ההכנה</h2>
      <ol className="steps">
        {parseLines(recipe.instructions).map((line, i) =>
          line.heading ? (
            <li key={i} className="step-heading"><h3>{line.text}</h3></li>
          ) : (
            <li key={i}><b className="num">{++step}</b><span>{line.text}</span></li>
          ),
        )}
      </ol>

      {recipe.tips && (
        <aside className="tips">
          <strong>💡 טיפים</strong>
          {parseLines(recipe.tips).map((l, i) => <p key={i}>{l.text}</p>)}
        </aside>
      )}

      {(recipe.tags || recipe.source) && (
        <p className="meta">
          {recipe.tags && <span>תגיות: {recipe.tags}</span>}
          {recipe.source && <span>מקור: {recipe.source}</span>}
        </p>
      )}

      {error && <div className="error-box" role="alert"><p>{error}</p></div>}
      <div className="row actions">
        <a className="btn" href={`#/edit/${recipe.id}`}>עריכה</a>
        <button className="danger" onClick={() => setConfirming(true)}>מחיקה</button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="למחוק את המתכון?"
          text={`"${recipe.name}" יוסתר מהאפליקציה. אפשר לשחזר אותו בגיליון (העמודה deleted).`}
          confirmLabel="כן, מחק"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </article>
  )
}
