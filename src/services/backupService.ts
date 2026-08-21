import * as authService from './authService'
import * as booksService from './booksService'
import * as logsService from './logsService'
import * as statsService from './statsService'
import type { Book, Profile, ReadingLog, UserStats } from '../types'

export interface Backup {
  version: 1
  exportedAt: string
  profile: Profile
  books: Book[]
  readingLogs: ReadingLog[]
  stats: UserStats
  badges: string[]
}

/** Monta um backup exportável com os dados do usuário, compondo sobre os serviços já existentes. */
export async function buildBackup(userId: string, now: Date = new Date()): Promise<Backup> {
  const [profile, books, readingLogs, stats, badges] = await Promise.all([
    authService.getProfile(userId),
    booksService.listBooks(userId),
    logsService.listLogs(userId),
    statsService.getStats(userId),
    statsService.listEarnedBadges(userId),
  ])
  return {
    version: 1,
    exportedAt: now.toISOString(),
    profile,
    books,
    readingLogs,
    stats,
    badges: badges.map((b) => b.badge_code),
  }
}
