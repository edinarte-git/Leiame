import { useCallback, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useBooksStore } from '../store/booksStore'
import { useLogsStore } from '../store/logsStore'
import { useStatsStore } from '../store/statsStore'
import * as logsService from '../services/logsService'
import * as booksService from '../services/booksService'
import * as statsService from '../services/statsService'
import { calculateProgress } from '../logic/calculator'
import { todayIsoDate } from '../lib/date'
import { calculateStreak } from '../logic/streak'
import { calculateXpGain, checkNewBadges, levelForXp } from '../logic/gamification'
import { SKILLS, calculateSkillProgress } from '../logic/skills'
import type { Book } from '../types'

export interface RegisterResult {
  book: Book
  xpGained: number
  newBadgeCodes: string[]
  leveledUp: boolean
  bookJustCompleted: boolean
}

/** Orquestra o registro de leitura: log -> progresso do livro -> streak -> XP -> badges. */
export function useTodayLog() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const applyLocalLog = useLogsStore((s) => s.applyLocal)
  const applyLocalBook = useBooksStore((s) => s.applyLocal)
  const stats = useStatsStore((s) => s.stats)
  const badges = useStatsStore((s) => s.badges)
  const applyStats = useStatsStore((s) => s.applyStats)
  const applyNewBadges = useStatsStore((s) => s.applyNewBadges)

  const registerReading = useCallback(
    async (book: Book, pagesRead: number): Promise<RegisterResult | null> => {
      if (!user || pagesRead <= 0) return null
      setSubmitting(true)
      setError(null)
      try {
        const userId = user.uid
        const isFirstLogEver = !stats || stats.total_pages_read === 0

        const log = await logsService.upsertTodayLog(userId, book.id, pagesRead)
        applyLocalLog(log)

        const progress = calculateProgress(book.total_pages, book.pages_read + pagesRead, book.daily_goal)
        const bookJustCompleted = progress.isComplete && book.status !== 'completed'
        const updatedBook = await booksService.updateBook(userId, book.id, {
          pages_read: progress.pagesRead,
          estimated_completion_date: progress.estimatedCompletionDate,
          status: progress.isComplete ? 'completed' : 'reading',
          completed_date: bookJustCompleted ? todayIsoDate() : book.completed_date,
        })
        applyLocalBook(updatedBook)

        const allLogs = await logsService.listLogs(userId)
        const readDates = allLogs.map((l) => l.date)
        const streak = calculateStreak(readDates)

        const xpGained = calculateXpGain(pagesRead, streak.currentStreak)
        const prevXp = stats?.xp ?? 0
        const newXp = prevXp + xpGained
        const prevLevel = stats?.level ?? 1
        const newLevel = levelForXp(newXp)
        const totalPagesRead = (stats?.total_pages_read ?? 0) + pagesRead

        const allBooks = await booksService.listBooks(userId)
        const totalBooksCompleted = allBooks.filter((b) => b.status === 'completed').length

        const skillLevels = Object.fromEntries(
          calculateSkillProgress(totalPagesRead).map((s) => [s.code, s.level]),
        ) as Record<(typeof SKILLS)[number]['code'], number>

        const newBadgeCodes = checkNewBadges({
          isFirstLogEver,
          currentStreak: streak.currentStreak,
          justCompletedBook: bookJustCompleted,
          totalBooksCompleted,
          totalPagesRead,
          skillLevels,
          alreadyEarned: new Set(badges.map((b) => b.badge_code)),
        })

        const savedStats = await statsService.saveStats(userId, {
          current_streak: streak.currentStreak,
          longest_streak: Math.max(streak.longestStreak, stats?.longest_streak ?? 0),
          total_pages_read: totalPagesRead,
          xp: newXp,
          level: newLevel,
          last_read_date: streak.lastReadDate,
        })
        applyStats(savedStats)

        if (newBadgeCodes.length > 0) {
          await Promise.all(newBadgeCodes.map((code) => statsService.awardBadge(userId, code)))
          applyNewBadges(newBadgeCodes.map((code) => ({ user_id: userId, badge_code: code, earned_at: new Date().toISOString() })))
        }

        return {
          book: updatedBook,
          xpGained,
          newBadgeCodes,
          leveledUp: newLevel > prevLevel,
          bookJustCompleted,
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível registrar a leitura.')
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [user, stats, badges, applyLocalLog, applyLocalBook, applyStats, applyNewBadges],
  )

  return { registerReading, submitting, error }
}
