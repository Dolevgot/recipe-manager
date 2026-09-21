// Google sign-in (Google Identity Services, "token model").
// The access token lives only in memory: refreshing the page means signing in again.
import { CLIENT_ID } from './config'

const BASE_SCOPES = 'openid email profile https://www.googleapis.com/auth/spreadsheets'
const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents.readonly'

export class AuthError extends Error {}
export class ApiError extends Error {
  constructor(status, service) {
    super(`${service} API error ${status}`)
    this.status = status
    this.service = service
  }
}

// `state` is replaced (never mutated) so React can tell when it changed.
let state = { token: null, expiresAt: 0, user: null, expired: false, hasDocs: false }
const listeners = new Set()

function setState(changes) {
  state = { ...state, ...changes }
  listeners.forEach((fn) => fn())
}
export const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const getSnapshot = () => state

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    script.onerror = () => reject(new Error('לא ניתן לטעון את שירות ההתחברות של Google'))
    document.head.appendChild(script)
  })
}

// Must be called from a click handler, otherwise the browser blocks the popup.
async function requestToken(scope, extra = {}) {
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope,
      ...extra,
      callback: (response) => {
        if (response.error) reject(new Error(response.error_description || response.error))
        else resolve(response)
      },
      error_callback: (err) => reject(new Error(err.type || 'popup_closed')),
    })
    client.requestAccessToken()
  })
}

function storeToken(response, extra = {}) {
  setState({
    token: response.access_token,
    expiresAt: Date.now() + Number(response.expires_in) * 1000,
    expired: false,
    ...extra,
  })
}

async function loadUser() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${state.token}` },
  })
  if (res.ok) setState({ user: await res.json() })
}

export async function signIn() {
  storeToken(await requestToken(BASE_SCOPES), { hasDocs: false })
  await loadUser()
}

// Same as signIn, but keeps the user's screen state: used by the "התחבר מחדש" button.
export async function reSignIn() {
  const scope = state.hasDocs ? `${BASE_SCOPES} ${DOCS_SCOPE}` : BASE_SCOPES
  storeToken(await requestToken(scope))
}

// The Docs permission is requested only when the user opens the import screen.
export async function ensureDocsAccess() {
  if (state.hasDocs && state.token) return
  const response = await requestToken(`${BASE_SCOPES} ${DOCS_SCOPE}`, { include_granted_scopes: true })
  storeToken(response, { hasDocs: true })
}

export function signOut() {
  if (state.token) window.google?.accounts.oauth2.revoke(state.token)
  setState({ token: null, expiresAt: 0, user: null, expired: false, hasDocs: false })
}

// fetch() with the access token. Marks the session as expired on 401 or an old token.
export async function authFetch(url, options = {}, service = 'sheets') {
  if (!state.token || Date.now() > state.expiresAt - 30_000) {
    setState({ expired: true })
    throw new AuthError('token expired')
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${state.token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (res.status === 401) {
    setState({ expired: true })
    throw new AuthError('unauthorized')
  }
  if (!res.ok) throw new ApiError(res.status, service)
  return res.json()
}

// A Hebrew message for anything that can go wrong.
export function errorMessage(err) {
  if (err instanceof AuthError) return 'פג תוקף ההתחברות. לחץ "התחבר מחדש" ונסה שוב.'
  if (err instanceof ApiError) {
    const what = err.service === 'docs' ? 'למסמך' : 'לגיליון'
    if (err.status === 403) return `אין לך גישה ${what}`
    if (err.status === 404) return err.service === 'docs' ? 'המסמך לא נמצא' : 'הגיליון לא נמצא'
    if (err.status === 429) return 'יותר מדי בקשות, נסה שוב בעוד דקה'
    return `שגיאה מ-Google (${err.status})`
  }
  return err?.message || 'משהו השתבש'
}
