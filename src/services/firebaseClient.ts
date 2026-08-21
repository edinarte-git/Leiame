import { initializeApp } from 'firebase/app'
import * as realAuth from 'firebase/auth'
import * as realFirestore from 'firebase/firestore'
import * as mockAuth from './mockAuth'
import * as mockFirestore from './mockFirestore'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
const explicitMock = import.meta.env.VITE_USE_MOCK === 'true'

/** Modo de teste local: nenhuma credencial Firebase configurada (ou VITE_USE_MOCK=true). */
export const isMockMode = explicitMock || !apiKey || !projectId

const app = isMockMode
  ? null
  : initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })

export const auth: unknown = isMockMode ? { __mockAuth: true } : realAuth.getAuth(app!)
export const db: unknown = isMockMode ? { __mockFirestore: true } : realFirestore.getFirestore(app!)

// --- Firestore ---
export const doc = isMockMode ? mockFirestore.doc : (realFirestore.doc as unknown as typeof mockFirestore.doc)
export const collection = isMockMode
  ? mockFirestore.collection
  : (realFirestore.collection as unknown as typeof mockFirestore.collection)
export const getDoc = isMockMode
  ? mockFirestore.getDoc
  : (realFirestore.getDoc as unknown as typeof mockFirestore.getDoc)
export const setDoc = isMockMode
  ? mockFirestore.setDoc
  : (realFirestore.setDoc as unknown as typeof mockFirestore.setDoc)
export const updateDoc = isMockMode
  ? mockFirestore.updateDoc
  : (realFirestore.updateDoc as unknown as typeof mockFirestore.updateDoc)
export const deleteDoc = isMockMode
  ? mockFirestore.deleteDoc
  : (realFirestore.deleteDoc as unknown as typeof mockFirestore.deleteDoc)
export const addDoc = isMockMode
  ? mockFirestore.addDoc
  : (realFirestore.addDoc as unknown as typeof mockFirestore.addDoc)
export const query = isMockMode
  ? mockFirestore.query
  : (realFirestore.query as unknown as typeof mockFirestore.query)
export const where = isMockMode
  ? mockFirestore.where
  : (realFirestore.where as unknown as typeof mockFirestore.where)
export const orderBy = isMockMode
  ? mockFirestore.orderBy
  : (realFirestore.orderBy as unknown as typeof mockFirestore.orderBy)
export const getDocs = isMockMode
  ? mockFirestore.getDocs
  : (realFirestore.getDocs as unknown as typeof mockFirestore.getDocs)
export const increment = isMockMode
  ? mockFirestore.increment
  : (realFirestore.increment as unknown as typeof mockFirestore.increment)

// --- Auth ---
export const createUserWithEmailAndPassword = isMockMode
  ? mockAuth.createUserWithEmailAndPassword
  : (realAuth.createUserWithEmailAndPassword as unknown as typeof mockAuth.createUserWithEmailAndPassword)
export const signInWithEmailAndPassword = isMockMode
  ? mockAuth.signInWithEmailAndPassword
  : (realAuth.signInWithEmailAndPassword as unknown as typeof mockAuth.signInWithEmailAndPassword)
export const signOutUser = isMockMode
  ? mockAuth.signOutUser
  : (realAuth.signOut as unknown as typeof mockAuth.signOutUser)
export const onAuthStateChangedCompat = isMockMode
  ? mockAuth.onAuthStateChanged
  : (realAuth.onAuthStateChanged as unknown as typeof mockAuth.onAuthStateChanged)

export async function updateAuthProfile(user: { uid: string }, patch: { displayName?: string }): Promise<void> {
  if (isMockMode) return mockAuth.updateAuthProfile(user as mockAuth.MockUser, patch)
  return realAuth.updateProfile(user as realAuth.User, patch)
}

export async function signInWithGoogleRedirect(authInstance: unknown): Promise<void> {
  if (isMockMode) return mockAuth.signInWithGoogleRedirect(authInstance)
  const provider = new realAuth.GoogleAuthProvider()
  await realAuth.signInWithRedirect(authInstance as realAuth.Auth, provider)
}

export async function getGoogleRedirectResult(authInstance: unknown): Promise<{ uid: string } | null> {
  if (isMockMode) return mockAuth.getGoogleRedirectResult(authInstance)
  const result = await realAuth.getRedirectResult(authInstance as realAuth.Auth)
  return result?.user ?? null
}
