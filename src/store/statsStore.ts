import { create } from 'zustand'
import type { UserBadge, UserStats } from '../types'
import * as statsService from '../services/statsService'

interface StatsState {
  stats: UserStats | null
  badges: UserBadge[]
  loading: boolean
  error: string | null
  fetchStats: (userId: string) => Promise<void>
  fetchBadges: (userId: string) => Promise<void>
  applyStats: (stats: UserStats) => void
  applyNewBadges: (badges: UserBadge[]) => void
}

export const useStatsStore = create<StatsState>((set, get) => ({
  stats: null,
  badges: [],
  loading: false,
  error: null,

  fetchStats: async (userId) => {
    set({ loading: true, error: null })
    try {
      const stats = await statsService.getStats(userId)
      set({ stats })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Falha ao carregar estatísticas.' })
    } finally {
      set({ loading: false })
    }
  },

  fetchBadges: async (userId) => {
    try {
      const badges = await statsService.listEarnedBadges(userId)
      set({ badges })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Falha ao carregar conquistas.' })
    }
  },

  applyStats: (stats) => set({ stats }),

  applyNewBadges: (badges) => set({ badges: [...get().badges, ...badges] }),
}))
