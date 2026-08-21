import { afterEach, describe, expect, it } from 'vitest'
import { awardBadge, getStats, listEarnedBadges, saveStats } from './statsService'
import { getProfile } from './authService'
import { resetMockAuth } from './mockAuth'
import { resetMockFirestore } from './mockFirestore'

afterEach(() => {
  resetMockAuth()
  resetMockFirestore()
})

describe('statsService', () => {
  it('lê as estatísticas do documento criado por getProfile', async () => {
    await getProfile('user-1', 'Ana')
    const stats = await getStats('user-1')
    expect(stats).toEqual({
      user_id: 'user-1',
      current_streak: 0,
      longest_streak: 0,
      total_pages_read: 0,
      xp: 0,
      level: 1,
      last_read_date: null,
      updated_at: expect.any(String),
    })
  })

  it('salva e relê estatísticas atualizadas', async () => {
    await getProfile('user-1', 'Ana')
    await saveStats('user-1', { current_streak: 3, xp: 45 })
    const stats = await getStats('user-1')
    expect(stats.current_streak).toBe(3)
    expect(stats.xp).toBe(45)
  })

  it('concede uma badge de forma idempotente (sem erro se repetir)', async () => {
    await getProfile('user-1', 'Ana')
    await awardBadge('user-1', 'first_log')
    await awardBadge('user-1', 'first_log') // não deve lançar
    const badges = await listEarnedBadges('user-1')
    expect(badges).toHaveLength(1)
    expect(badges[0].badge_code).toBe('first_log')
  })
})
