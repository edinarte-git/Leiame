import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStatsStore } from './statsStore'
import * as statsService from '../services/statsService'

vi.mock('../services/statsService')

afterEach(() => {
  vi.restoreAllMocks()
  useStatsStore.setState({ stats: null, badges: [], loading: false, error: null })
})

describe('statsStore.fetchStats', () => {
  it('records an error message instead of throwing when the fetch fails', async () => {
    vi.spyOn(statsService, 'getStats').mockRejectedValue(new Error('offline'))

    await useStatsStore.getState().fetchStats('user-1')

    expect(useStatsStore.getState().error).toBe('offline')
    expect(useStatsStore.getState().loading).toBe(false)
  })

  it('clears a previous error once a fetch succeeds', async () => {
    useStatsStore.setState({ error: 'offline' })
    vi.spyOn(statsService, 'getStats').mockResolvedValue({
      user_id: 'user-1',
      current_streak: 0,
      longest_streak: 0,
      total_pages_read: 0,
      xp: 0,
      level: 1,
      last_read_date: null,
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    await useStatsStore.getState().fetchStats('user-1')

    expect(useStatsStore.getState().error).toBeNull()
  })
})

describe('statsStore.fetchBadges', () => {
  it('records an error message instead of throwing when the fetch fails', async () => {
    vi.spyOn(statsService, 'listEarnedBadges').mockRejectedValue(new Error('offline'))

    await useStatsStore.getState().fetchBadges('user-1')

    expect(useStatsStore.getState().error).toBe('offline')
  })
})
