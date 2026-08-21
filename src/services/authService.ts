import {
  auth,
  doc,
  db,
  getDoc,
  setDoc,
  updateDoc,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateAuthProfile,
  signOutUser,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
} from './firebaseClient'
import type { Profile } from '../types'

interface AppUserDocument {
  name: string
  default_daily_goal: number
  theme: 'dark' | 'light'
  sound_enabled: boolean
  onboarded: boolean
  created_at: string
  current_streak: number
  longest_streak: number
  total_pages_read: number
  xp: number
  level: number
  last_read_date: string | null
}

function defaultUserDocument(name: string): AppUserDocument {
  return {
    name,
    default_daily_goal: 10,
    theme: 'dark',
    sound_enabled: true,
    onboarded: false,
    created_at: new Date().toISOString(),
    current_streak: 0,
    longest_streak: 0,
    total_pages_read: 0,
    xp: 0,
    level: 1,
    last_read_date: null,
  }
}

export async function signUp(email: string, password: string, name: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateAuthProfile(user, { displayName: name })
  await setDoc(doc(db, 'users', user.uid), defaultUserDocument(name))
  return user
}

export async function signIn(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function signInWithGoogle() {
  await signInWithGoogleRedirect(auth)
}

/** Chamado uma vez, na inicialização do app, pra capturar erro do redirecionamento do Google. */
export async function consumeGoogleRedirectResult(): Promise<void> {
  await getGoogleRedirectResult(auth)
}

export async function signOut() {
  await signOutUser(auth)
}

/** Auto-curativo: se `users/{uid}` ainda não existir (1º login, inclusive via Google), cria com valores padrão. */
export async function getProfile(uid: string, fallbackName = ''): Promise<Profile> {
  const ref = doc(db, 'users', uid)
  const snapshot = await getDoc(ref)
  const data = snapshot.exists() ? (snapshot.data() as AppUserDocument) : defaultUserDocument(fallbackName)
  if (!snapshot.exists()) {
    await setDoc(ref, data)
  }
  return {
    id: uid,
    name: data.name,
    default_daily_goal: data.default_daily_goal,
    theme: data.theme,
    sound_enabled: data.sound_enabled,
    onboarded: data.onboarded,
    created_at: data.created_at,
  }
}

export async function updateProfile(uid: string, patch: Partial<Profile>): Promise<Profile> {
  await getProfile(uid) // garante que o documento já existe antes do update
  const { id: _id, ...rest } = patch
  await updateDoc(doc(db, 'users', uid), rest)
  return getProfile(uid)
}
