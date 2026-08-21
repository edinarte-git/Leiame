import type { MockTables } from './mockDb'

export interface MockBackup {
  version: 1
  exportedAt: string
  profile: MockTables['profiles'][number] | null
  books: MockTables['books']
  readingLogs: MockTables['reading_logs']
  stats: MockTables['user_stats'][number] | null
  badges: string[]
}

/** Monta um backup exportável com apenas os dados do usuário informado. */
export function buildBackup(db: MockTables, userId: string, now: Date = new Date()): MockBackup {
  const books = db.books.filter((b) => b.user_id === userId)
  const bookIds = new Set(books.map((b) => b.id))
  const readingLogs = db.reading_logs.filter((l) => l.user_id === userId && bookIds.has(l.book_id))
  const stats = db.user_stats.find((s) => s.user_id === userId) ?? null
  const badges = db.user_badges.filter((b) => b.user_id === userId).map((b) => b.badge_code)
  const profile = db.profiles.find((p) => p.id === userId) ?? null

  return {
    version: 1,
    exportedAt: now.toISOString(),
    profile,
    books,
    readingLogs,
    stats,
    badges,
  }
}
