import { useState } from 'react'
import { errorMessage } from './auth'
import { KASHRUT } from './config'

const EMPTY = {
  name: '', description: '', category: '', kashrut: '', servings: '', prep_time: '',
  cook_time: '', total_time: '', oven: '', ingredients: '', instructions: '', tips: '',
  tags: '', source: '', image_url: '',
}

export default function RecipeForm({ recipe, categories, onSave }) {
  // The form keeps its own copy, so nothing typed is lost if the token expires mid-edit.
  const [values, setValues] = useState({ ...EMPTY, ...recipe })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))
  const categoryOptions = values.category && !categories.includes(values.category)
    ? [...categories, values.category]
    : categories

  async function submit(e) {
    e.preventDefault()
    const found = {}
    if (!values.name.trim()) found.name = 'צריך לתת שם למתכון'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setSaveError('')
    try {
      await onSave({ ...values, name: values.name.trim() })
    } catch (err) {
      setSaveError(errorMessage(err))
      setSaving(false)
    }
  }

  const text = (field, label, props = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={values[field]} onChange={set(field)} {...props} />
    </label>
  )
  const area = (field, label, hint, rows = 8) => (
    <label className="field">
      <span>{label} <small>{hint}</small></span>
      <textarea rows={rows} value={values[field]} onChange={set(field)} />
    </label>
  )

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h1>{recipe ? 'עריכת מתכון' : 'מתכון חדש'}</h1>

      <label className="field">
        <span>שם המתכון *</span>
        <input value={values.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} autoFocus />
        {errors.name && <em className="field-error">{errors.name}</em>}
      </label>
      {text('description', 'תיאור קצר')}

      <div className="two">
        <label className="field">
          <span>קטגוריה</span>
          <select value={values.category} onChange={set('category')}>
            <option value="">בחר…</option>
            {categoryOptions.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>כשרות</span>
          <select value={values.kashrut} onChange={set('kashrut')}>
            <option value="">בחר…</option>
            {KASHRUT.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
      </div>

      <div className="two">
        {text('servings', 'מנות')}
        {text('oven', 'תנור')}
        {text('prep_time', 'זמן הכנה')}
        {text('cook_time', 'זמן בישול')}
        {text('total_time', 'סה"כ זמן')}
      </div>

      {area('ingredients', 'מצרכים', '(שורה לכל מצרך; שורה שמסתיימת ב-: היא כותרת)')}
      {area('instructions', 'אופן ההכנה', '(שורה לכל שלב; שורה שמסתיימת ב-: היא כותרת)', 10)}
      {area('tips', 'טיפים', '', 3)}
      {text('tags', 'תגיות')}
      {text('source', 'מקור')}
      {text('image_url', 'כתובת תמונה', { dir: 'ltr' })}

      {saveError && <div className="error-box" role="alert"><p>{saveError}</p></div>}
      <div className="row">
        <button type="submit" disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</button>
        <a className="btn secondary" href={recipe ? `#/recipe/${recipe.id}` : '#/'}>ביטול</a>
      </div>
    </form>
  )
}
