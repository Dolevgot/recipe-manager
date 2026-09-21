import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { getSnapshot, reSignIn, signIn, signOut, subscribe, errorMessage } from './auth'
import { CLIENT_ID, SHEET_ID } from './config'
import { addRecipes, deleteRecipe, initSheet, loadAll, updateRecipe } from './sheets'
import ImportScreen from './ImportScreen'
import RecipeForm from './RecipeForm'
import RecipeList from './RecipeList'
import RecipeView from './RecipeView'
import { ErrorBox, Loading } from './ui'

// Hash routing: "#/recipe/ID", "#/new", "#/edit/ID", "#/import", anything else = list.
function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, '').split('/')
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
const go = (hash) => (location.hash = hash)

export default function App() {
  const auth = useSyncExternalStore(subscribe, getSnapshot)
  const [page, id] = useRoute()
  const [data, setData] = useState({ status: 'idle', recipes: [], categories: [], error: null })
  const signedIn = Boolean(auth.token)

  const load = useCallback(async ({ init = false } = {}) => {
    setData((d) => ({ ...d, status: d.recipes.length ? 'refreshing' : 'loading', error: null }))
    try {
      if (init) await initSheet()
      const { recipes, categories } = await loadAll()
      setData({ status: 'ready', recipes, categories, error: null })
    } catch (error) {
      setData((d) => ({ ...d, status: 'error', error }))
    }
  }, [])

  // Load once after signing in (a re-login after expiry keeps the same session).
  useEffect(() => {
    if (signedIn) load({ init: true })
  }, [signedIn, load])

  // Clear the recipes from memory on sign-out, so the next person to sign in never sees them.
  function handleSignOut() {
    signOut()
    setData({ status: 'idle', recipes: [], categories: [], error: null })
    go('#/')
  }

  async function handleReSignIn() {
    try {
      await reSignIn()
      if (data.status === 'error') load()
    } catch {
      /* the user closed the popup: the banner stays */
    }
  }

  if (!CLIENT_ID || !SHEET_ID) {
    return (
      <main className="page">
        <ErrorBox error={new Error('חסרות הגדרות: VITE_GOOGLE_CLIENT_ID ו-VITE_SHEET_ID. ראה README.')} />
      </main>
    )
  }

  if (!signedIn) return <LoginScreen />

  const recipe = data.recipes.find((r) => r.id === id)

  // Writes go to the sheet, then the whole list is re-read so the screen always matches the sheet.
  const save = async (fields) => {
    if (fields.id) await updateRecipe({ ...recipe, ...fields })
    else await addRecipes([fields])
    await load()
    go(fields.id ? `#/recipe/${fields.id}` : '#/')
  }
  const remove = async (r) => {
    await deleteRecipe(r)
    await load()
    go('#/')
  }

  let body
  if (data.status === 'loading' || data.status === 'idle') body = <Loading text="טוען את המתכונים…" />
  else if (data.status === 'error' && !data.recipes.length && !data.categories.length)
    body = <ErrorBox error={data.error} onRetry={() => load({ init: true })} />
  else if (page === 'new') body = <RecipeForm categories={data.categories} onSave={save} />
  else if (page === 'import')
    body = (
      <ImportScreen
        categories={data.categories}
        existingNames={data.recipes.map((r) => r.name)}
        onImported={async () => {
          await load()
          go('#/')
        }}
      />
    )
  else if (page === 'edit' && recipe) body = <RecipeForm recipe={recipe} categories={data.categories} onSave={save} />
  else if (page === 'recipe' && recipe) body = <RecipeView recipe={recipe} onDelete={remove} />
  else if (page === 'recipe' || page === 'edit') body = <ErrorBox error={new Error('המתכון לא נמצא')} />
  else body = <RecipeList recipes={data.recipes} categories={data.categories} />

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">המתכונים שלי</a>
        <nav>
          <a href="#/new" className="btn">＋ מתכון חדש</a>
          <a href="#/import" className="btn secondary">ייבוא מגוגל דוקס</a>
        </nav>
        <div className="who">
          <span>{auth.user?.email ?? ''}</span>
          <button className="link" onClick={handleSignOut}>התנתק</button>
        </div>
      </header>
      {auth.expired && (
        <div className="banner" role="alert">
          <span>פג תוקף ההתחברות. מה שהקלדת נשמר במסך.</span>
          <button onClick={handleReSignIn}>התחבר מחדש</button>
        </div>
      )}
      {data.status === 'error' && data.recipes.length > 0 && (
        <div className="banner" role="alert">{errorMessage(data.error)}</div>
      )}
      <main className="page">{body}</main>
    </>
  )
}

function LoginScreen() {
  const [error, setError] = useState(null)
  return (
    <main className="page login">
      <h1>המתכונים שלי</h1>
      <p>אוסף המתכונים המשפחתי, שמור בגיליון Google שלך.</p>
      <button
        className="big"
        onClick={() => signIn().catch((e) => setError(e))}
      >
        התחברות עם Google
      </button>
      {error && <ErrorBox error={error} />}
    </main>
  )
}
