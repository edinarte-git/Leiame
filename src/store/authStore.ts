import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../types'
import { supabase } from '../services/supabaseClient'
import * as authService from '../services/authService'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  init: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  completeOnboarding: (defaultDailyGoal: number) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  error: null,

  init: async () => {
    set({ loading: true })
    try {
      const session = await authService.getSession()
      set({ session })
      if (session) {
        const profile = await authService.getProfile(session.user.id)
        set({ profile })
      }
    } finally {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      set({ session })
      if (session) {
        const profile = await authService.getProfile(session.user.id)
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

  signOut: async () => {
    await authService.signOut()
    set({ session: null, profile: null })
  },

  refreshProfile: async () => {
    const session = get().session
    if (!session) return
    const profile = await authService.getProfile(session.user.id)
    set({ profile })
  },

  completeOnboarding: async (defaultDailyGoal) => {
    const session = get().session
    if (!session) return
    const profile = await authService.updateProfile(session.user.id, {
      default_daily_goal: defaultDailyGoal,
      onboarded: true,
    })
    set({ profile })
  },
}))
