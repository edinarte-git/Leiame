import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildBackup } from './backupService'
import * as authService from './authService'
import * as booksService from './booksService'
import * as logsService from './logsService'
import * as statsService from './statsService'
import type { Book, Profile, ReadingLog, UserBadge, UserStats } from '../types'

vi.mock('./authService')
vi.mock('./booksService')
vi.mock('./logsService')
vi.mock('./statsService')

const profile: Profile = {
  id: 'user-1',
  name: 'Edinart',
  default_daily_goal: 10,
  theme: 'dark',
  sound_enabled: true,
  onboarded: true,
  created_at: '2026-01-01T00:00:00.000Z',
}

const book: Book = {
  id: 'b1',
  user_id: 'user-1',
  title: 'Duna',
  author: 'Frank Herbert',
  cover_url: null,
  total_pages: 400,
  pages_read: 50,
  daily_goal: 20,
  status: 'reading',
  start_date: '2026-01-01',
  estimated_completion_date: null,
  completed_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const log: ReadingLog = {
  id: 'b1_2026-01-01',
  user_id: 'user-1',
  book_id: 'b1',
  date: '2026-01-01',
  pages_read: 50,
  created_at: '2026-01-01T00:00:00.000Z',
}

const stats: UserStats = {
  user_id: 'user-1',
  current_streak: 3,
  longest_streak: 5,
  total_pages_read: 50,
  xp: 60,
  level: 1,
  last_read_date: '2026-01-01',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const badge: UserBadge = { user_id: 'user-1', badge_code: 'first_log', earned_at: '2026-01-01T00:00:00.000Z' }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildBackup', () => {
  it('compõe o backup a partir do perfil, livros, logs, stats e badges do usuário', async () => {
    vi.spyOn(authService, 'getProfile').mockResolvedValue(profile)
    vi.spyOn(booksService, 'listBooks').mockResolvedValue([book])
    vi.spyOn(logsService, 'listLogs').mockResolvedValue([log])
    vi.spyOn(statsService, 'getStats').mockResolvedValue(stats)
    vi.spyOn(statsService, 'listEarnedBadges').mockResolvedValue([badge])

    const backup = await buildBackup('user-1', new Date('2026-08-20T12:00:00.000Z'))

    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toBe('2026-08-20T12:00:00.000Z')
    expect(backup.profile).toEqual(profile)
    expect(backup.books).toEqual([book])
    expect(backup.readingLogs).toEqual([log])
    expect(backup.stats).toEqual(stats)
    expect(backup.badges).toEqual(['first_log'])
  })
})
