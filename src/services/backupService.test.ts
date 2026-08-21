import { describe, expect, it } from 'vitest'
import { buildBackup } from './backupService'
import type { MockTables } from './mockDb'

function makeDb(overrides: Partial<MockTables> = {}): MockTables {
  return {
    profiles: [],
    books: [],
    reading_logs: [],
    user_stats: [],
    user_badges: [],
    auth_users: [],
    ...overrides,
  }
}

describe('buildBackup', () => {
  it('only includes books belonging to the given user', () => {
    const db = makeDb({
      books: [
        { id: 'b1', user_id: 'user-1', title: 'Meu livro' },
        { id: 'b2', user_id: 'user-2', title: 'De outra pessoa' },
      ],
    })

    const backup = buildBackup(db, 'user-1')

    expect(backup.books).toEqual([{ id: 'b1', user_id: 'user-1', title: 'Meu livro' }])
  })

  it('only includes reading logs whose book belongs to the user', () => {
    const db = makeDb({
      books: [{ id: 'b1', user_id: 'user-1' }],
      reading_logs: [
        { id: 'l1', user_id: 'user-1', book_id: 'b1', date: '2026-01-01', pages_read: 10 },
        { id: 'l2', user_id: 'user-1', book_id: 'other-book', date: '2026-01-02', pages_read: 5 },
      ],
    })

    const backup = buildBackup(db, 'user-1')

    expect(backup.readingLogs).toHaveLength(1)
    expect(backup.readingLogs[0].id).toBe('l1')
  })

  it('includes the user profile, stats and badge codes, excluding other users', () => {
    const db = makeDb({
      profiles: [{ id: 'user-1', name: 'Edinart' }],
      user_stats: [{ user_id: 'user-1', xp: 120 }],
      user_badges: [
        { user_id: 'user-1', badge_code: 'first_log' },
        { user_id: 'user-2', badge_code: 'streak_3' },
      ],
    })

    const backup = buildBackup(db, 'user-1')

    expect(backup.profile).toEqual({ id: 'user-1', name: 'Edinart' })
    expect(backup.stats).toEqual({ user_id: 'user-1', xp: 120 })
    expect(backup.badges).toEqual(['first_log'])
  })

  it('stamps the export with a version and the given timestamp', () => {
    const backup = buildBackup(makeDb(), 'user-1', new Date('2026-08-20T12:00:00.000Z'))

    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toBe('2026-08-20T12:00:00.000Z')
  })
})
