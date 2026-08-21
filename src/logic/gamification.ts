/**
 * XP e níveis: XP = páginas lidas, com bônus de 20% enquanto o streak
 * atual for >= 3 dias, para reforçar a consistência.
 */

export function calculateXpGain(pagesRead: number, currentStreak: number): number {
  const bonusMultiplier = currentStreak >= 3 ? 1.2 : 1
  return Math.round(pagesRead * bonusMultiplier)
}

/** Curva de nível: cada nível exige 100 XP a mais que o anterior (progressão triangular). */
export function levelForXp(xp: number): number {
  let level = 1
  let threshold = 0
  let step = 100
  while (xp >= threshold + step) {
    threshold += step
    step += 100
    level += 1
  }
  return level
}

export function xpForNextLevel(level: number): number {
  // XP acumulado necessário para atingir `level + 1`
  let threshold = 0
  let step = 100
  for (let l = 1; l < level; l++) {
    threshold += step
    step += 100
  }
  return threshold + step
}

export interface BadgeCheckInput {
  isFirstLogEver: boolean
  currentStreak: number
  justCompletedBook: boolean
  totalBooksCompleted: number
  totalPagesRead: number
  /** nível atual de cada habilidade (código -> nível), ver src/logic/skills.ts */
  skillLevels: Record<string, number>
  alreadyEarned: Set<string>
}

/** Retorna os códigos de badges recém-desbloqueadas (ainda não em `alreadyEarned`). */
export function checkNewBadges(input: BadgeCheckInput): string[] {
  const earned: string[] = []
  const grant = (code: string, condition: boolean) => {
    if (condition && !input.alreadyEarned.has(code)) earned.push(code)
  }

  grant('first_log', input.isFirstLogEver)
  grant('streak_3', input.currentStreak >= 3)
  grant('streak_7', input.currentStreak >= 7)
  grant('streak_30', input.currentStreak >= 30)
  grant('streak_100', input.currentStreak >= 100)
  grant('first_book', input.justCompletedBook && input.totalBooksCompleted >= 1)
  grant('books_5', input.totalBooksCompleted >= 5)
  grant('books_10', input.totalBooksCompleted >= 10)
  grant('pages_100', input.totalPagesRead >= 100)
  grant('pages_500', input.totalPagesRead >= 500)
  grant('pages_1000', input.totalPagesRead >= 1000)
  grant('pages_5000', input.totalPagesRead >= 5000)
  grant('mind_5', (input.skillLevels.mind ?? 1) >= 5)
  grant('writing_5', (input.skillLevels.writing ?? 1) >= 5)
  grant('speaking_5', (input.skillLevels.speaking ?? 1) >= 5)
  grant('knowledge_5', (input.skillLevels.knowledge ?? 1) >= 5)

  return earned
}
