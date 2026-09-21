import { authFetch } from './auth'

// Accepts a full Doc URL or a bare ID.
export function extractDocId(input) {
  const text = String(input ?? '').trim()
  const fromUrl = text.match(/\/document\/d\/([\w-]+)/)
  if (fromUrl) return fromUrl[1]
  return /^[\w-]{20,}$/.test(text) ? text : null
}

export async function fetchDoc(docId) {
  const doc = await authFetch(`https://docs.googleapis.com/v1/documents/${docId}`, {}, 'docs')
  if (import.meta.env.DEV) {
    // Dev only: inspect the real structure in the console (window.__doc).
    console.log('Docs API response', doc)
    window.__doc = doc
  }
  return doc
}
