import { create } from 'zustand'
import type { AppUser, Profile } from '../types'
import { auth, onAuthStateChangedCompat } from '../services/firebaseClient'
import * as authService from '../services/authService'

interface AuthState {
  user: AppUser | null
  profile: Profile | null
  loading: boolean
  error: string | null
  init: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  completeOnboarding: (defaultDailyGoal: number) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      await authService.consumeGoogleRedirectResult()
    } catch (err) {
      set({ error: (err as Error).message })
    }

    onAuthStateChangedCompat(auth, async (user) => {
      const appUser: AppUser | null = user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null
      set({ user: appUser, loading: false })
      if (appUser) {
        const profile = await authService.getProfile(appUser.uid, appUser.displayName ?? '')
        set({ profile })
      } else {
        set({ profile: null })
      }
    })
  },

  signUp: async (email, password, name) => {
    set({ error: null })
    try {
      await authService.signUp(email, password, name)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  signIn: async (email, password) => {
    set({ error: null })
    try {
      await authService.signIn(email, password)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  signInWithGoogle: async () => {
    set({ error: null })
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  signOut: async () => {
    await authService.signOut()
    set({ user: null, profile: null })
  },

  refreshProfile: async () => {
    const user = get().user
    if (!user) return
    const profile = await authService.getProfile(user.uid)
    set({ profile })
  },

  completeOnboarding: async (defaultDailyGoal) => {
    const user = get().user
    if (!user) return
    const profile = await authService.updateProfile(user.uid, {
      default_daily_goal: defaultDailyGoal,
      onboarded: true,
    })
    set({ profile })
  },
}))
