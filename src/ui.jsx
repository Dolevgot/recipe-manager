// Small shared building blocks.
import { errorMessage } from './auth'

export function Badge({ kashrut }) {
  if (!kashrut) return null
  return <span className={`badge badge-${kashrut}`}>{kashrut}</span>
}

export function Loading({ text = 'טוען…' }) {
  return (
    <div className="center-note" role="status">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <p>{errorMessage(error)}</p>
      {onRetry && <button onClick={onRetry}>נסה שוב</button>}
    </div>
  )
}

export function ConfirmDialog({ title, text, confirmLabel, busy, onConfirm, onCancel }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="row">
          <button className="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'מוחק…' : confirmLabel}
          </button>
          <button className="secondary" onClick={onCancel} disabled={busy}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
