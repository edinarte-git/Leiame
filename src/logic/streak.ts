/**
 * Streak de leitura: um dia "conta" se o usuário registrou pelo menos
 * 1 página lida (em qualquer livro) naquele dia.
 */

export interface StreakResult {
  currentStreak: number
  longestStreak: number
  lastReadDate: string | null
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((toDateOnly(a).getTime() - toDateOnly(b).getTime()) / msPerDay)
}

/**
 * @param readDates datas (YYYY-MM-DD) com pelo menos uma leitura registrada, não precisam estar ordenadas nem ser únicas
 */
export function calculateStreak(readDates: string[], today: Date = new Date()): StreakResult {
  if (readDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastReadDate: null }
  }

  const uniqueSorted = Array.from(new Set(readDates)).sort()
  const dates = uniqueSorted.map((d) => new Date(d + 'T00:00:00'))

  let longestStreak = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i], dates[i - 1]) === 1) {
      run += 1
    } else {
      run = 1
    }
    longestStreak = Math.max(longestStreak, run)
  }

  const lastReadDate = uniqueSorted[uniqueSorted.length - 1]
  const gapFromToday = daysBetween(today, dates[dates.length - 1])

  // Streak atual só é válida se a última leitura foi hoje ou ontem;
  // se o usuário pulou 2+ dias, o streak atual zera.
  let currentStreak = 0
  if (gapFromToday <= 1) {
    currentStreak = 1
    for (let i = dates.length - 1; i > 0; i--) {
      if (daysBetween(dates[i], dates[i - 1]) === 1) {
        currentStreak += 1
      } else {
        break
      }
    }
  }

  return { currentStreak, longestStreak, lastReadDate }
}

/** Mapa de data -> total de páginas lidas naquele dia, para o heatmap. */
export function buildDailyTotals(logs: { date: string; pages_read: number }[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const log of logs) {
    totals.set(log.date, (totals.get(log.date) ?? 0) + log.pages_read)
  }
  return totals
}
