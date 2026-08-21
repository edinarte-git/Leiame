/**
 * Reimplementação mínima da API de Auth do Firebase (e-mail/senha +
 * onAuthStateChanged) rodando 100% em localStorage. Entrar com Google não é
 * simulável em modo mock — o botão fica oculto (ver AuthScreen.tsx); a função
 * abaixo só existe como uma rede de segurança caso seja chamada por engano.
 */

const USERS_KEY = 'leiame_mock_auth_users_v1'
const SESSION_KEY = 'leiame_mock_auth_session_v1'

export interface MockUser {
  uid: string
  email: string | null
  displayName: string | null
}

interface StoredAuthUser {
  uid: string
  email: string
  password: string
  displayName: string
}

function loadUsers(): StoredAuthUser[] {
  const raw = localStorage.getItem(USERS_KEY)
  return raw ? JSON.parse(raw) : []
}

function saveUsers(users: StoredAuthUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readSession(): MockUser | null {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

type Listener = (user: MockUser | null) => void
const listeners: Listener[] = []

function writeSession(user: MockUser | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else localStorage.removeItem(SESSION_KEY)
  listeners.forEach((cb) => cb(user))
}

export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
): Promise<{ user: MockUser }> {
  const users = loadUsers()
  if (users.some((u) => u.email === email)) {
    throw new Error('Este e-mail já está cadastrado (modo de teste local).')
  }
  const stored: StoredAuthUser = { uid: crypto.randomUUID(), email, password, displayName: '' }
  users.push(stored)
  saveUsers(users)
  const user: MockUser = { uid: stored.uid, email: stored.email, displayName: stored.displayName || null }
  writeSession(user)
  return { user }
}

export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
): Promise<{ user: MockUser }> {
  const stored = loadUsers().find((u) => u.email === email)
  if (!stored || stored.password !== password) {
    throw new Error('E-mail ou senha inválidos.')
  }
  const user: MockUser = { uid: stored.uid, email: stored.email, displayName: stored.displayName || null }
  writeSession(user)
  return { user }
}

export async function updateAuthProfile(user: MockUser, patch: { displayName?: string }): Promise<void> {
  const users = loadUsers()
  const stored = users.find((u) => u.uid === user.uid)
  if (stored && patch.displayName !== undefined) {
    stored.displayName = patch.displayName
    saveUsers(users)
    if (readSession()?.uid === user.uid) writeSession({ ...user, displayName: patch.displayName })
  }
}

export async function signOutUser(_auth: unknown): Promise<void> {
  writeSession(null)
}

export function onAuthStateChanged(_auth: unknown, callback: Listener): () => void {
  listeners.push(callback)
  callback(readSession())
  return () => {
    const i = listeners.indexOf(callback)
    if (i >= 0) listeners.splice(i, 1)
  }
}

export async function signInWithGoogleRedirect(_auth: unknown): Promise<void> {
  throw new Error('Login com Google não está disponível no modo de teste local.')
}

export async function getGoogleRedirectResult(_auth: unknown): Promise<null> {
  return null
}

export function resetMockAuth() {
  localStorage.removeItem(USERS_KEY)
  localStorage.removeItem(SESSION_KEY)
}
