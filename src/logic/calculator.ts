/**
 * Recalcula o progresso e o prazo estimado de um livro.
 * Sem penalidade: dias sem leitura apenas empurram a data prevista,
 * sempre calculada a partir de "hoje" com o ritmo (daily_goal) atual.
 */

import { localIsoDate } from '../lib/date'

export interface ProgressResult {
  pagesRead: number
  remainingPages: number
  percentComplete: number
  isComplete: boolean
  estimatedCompletionDate: string | null
  daysRemaining: number | null
}

export function calculateProgress(
  totalPages: number,
  pagesRead: number,
  dailyGoal: number,
  today: Date = new Date(),
): ProgressResult {
  const clampedRead = Math.min(Math.max(pagesRead, 0), totalPages)
  const remainingPages = totalPages - clampedRead
  const percentComplete = totalPages > 0 ? Math.round((clampedRead / totalPages) * 100) : 0
  const isComplete = remainingPages <= 0

  if (isComplete) {
    return {
      pagesRead: clampedRead,
      remainingPages: 0,
      percentComplete: 100,
      isComplete: true,
      estimatedCompletionDate: null,
      daysRemaining: null,
    }
  }

  const daysRemaining = Math.ceil(remainingPages / Math.max(dailyGoal, 1))
  const estimated = new Date(today)
  estimated.setDate(estimated.getDate() + daysRemaining)

  return {
    pagesRead: clampedRead,
    remainingPages,
    percentComplete,
    isComplete: false,
    estimatedCompletionDate: localIsoDate(estimated),
    daysRemaining,
  }
}

/** Meta diária sugerida para terminar até uma data-alvo. */
export function suggestDailyGoal(
  totalPages: number,
  pagesRead: number,
  targetDate: Date,
  today: Date = new Date(),
): number {
  const remainingPages = Math.max(totalPages - pagesRead, 0)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysAvailable = Math.max(
    Math.ceil((targetDate.getTime() - today.getTime()) / msPerDay),
    1,
  )
  return Math.max(Math.ceil(remainingPages / daysAvailable), 1)
}
