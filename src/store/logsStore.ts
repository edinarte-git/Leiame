import { create } from 'zustand'
import type { ReadingLog } from '../types'
import * as logsService from '../services/logsService'

interface LogsState {
  logs: ReadingLog[]
  loading: boolean
  error: string | null
  fetchLogs: (userId: string, sinceDate?: string) => Promise<void>
  applyLocal: (log: ReadingLog) => void
}

export const useLogsStore = create<LogsState>((set, get) => ({
  logs: [],
  loading: false,
  error: null,

  fetchLogs: async (userId, sinceDate) => {
    set({ loading: true, error: null })
    try {
      const logs = await logsService.listLogs(userId, sinceDate)
      set({ logs })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Falha ao carregar o histórico de leitura.' })
    } finally {
      set({ loading: false })
    }
  },

  applyLocal: (log) => {
    const rest = get().logs.filter((l) => l.id !== log.id)
    set({ logs: [...rest, log] })
  },
}))
