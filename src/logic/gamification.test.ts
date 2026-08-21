import { describe, expect, it } from 'vitest'
import { calculateXpGain, checkNewBadges, levelForXp, xpForNextLevel } from './gamification'

describe('calculateXpGain', () => {
  it('sem bônus quando streak < 3', () => {
    expect(calculateXpGain(10, 1)).toBe(10)
  })

  it('aplica bônus de 20% quando streak >= 3', () => {
    expect(calculateXpGain(10, 3)).toBe(12)
  })
})

describe('levelForXp', () => {
  it('começa no nível 1', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(99)).toBe(1)
  })

  it('sobe para o nível 2 aos 100 XP', () => {
    expect(levelForXp(100)).toBe(2)
  })

  it('sobe para o nível 3 aos 300 XP (100 + 200)', () => {
    expect(levelForXp(299)).toBe(2)
    expect(levelForXp(300)).toBe(3)
  })
})

describe('xpForNextLevel', () => {
  it('nível 1 precisa de 100 XP para o próximo', () => {
    expect(xpForNextLevel(1)).toBe(100)
  })

  it('nível 2 precisa de 300 XP acumulados', () => {
    expect(xpForNextLevel(2)).toBe(300)
  })
})

describe('checkNewBadges', () => {
  it('concede first_log apenas na primeira leitura', () => {
    const badges = checkNewBadges({
      isFirstLogEver: true,
      currentStreak: 1,
      justCompletedBook: false,
      totalBooksCompleted: 0,
      totalPagesRead: 10,
      skillLevels: {},
      alreadyEarned: new Set(),
    })
    expect(badges).toContain('first_log')
  })

  it('não repete badges já conquistadas', () => {
    const badges = checkNewBadges({
      isFirstLogEver: false,
      currentStreak: 7,
      justCompletedBook: false,
      totalBooksCompleted: 0,
      totalPagesRead: 10,
      skillLevels: {},
      alreadyEarned: new Set(['streak_3', 'streak_7']),
    })
    expect(badges).not.toContain('streak_3')
    expect(badges).not.toContain('streak_7')
  })

  it('concede múltiplas badges de streak simultaneamente na primeira vez', () => {
    const badges = checkNewBadges({
      isFirstLogEver: false,
      currentStreak: 30,
      justCompletedBook: false,
      totalBooksCompleted: 0,
      totalPagesRead: 500,
      skillLevels: {},
      alreadyEarned: new Set(),
    })
    expect(badges).toEqual(expect.arrayContaining(['streak_3', 'streak_7', 'streak_30']))
    expect(badges).not.toContain('streak_100')
  })

  it('só concede first_book quando o livro foi concluído agora', () => {
    const badges = checkNewBadges({
      isFirstLogEver: false,
      currentStreak: 1,
      justCompletedBook: false,
      totalBooksCompleted: 1,
      totalPagesRead: 300,
      skillLevels: {},
      alreadyEarned: new Set(),
    })
    expect(badges).not.toContain('first_book')
  })

  it('concede marcos de páginas totais (100/500/1000/5000)', () => {
    const badges = checkNewBadges({
      isFirstLogEver: false,
      currentStreak: 1,
      justCompletedBook: false,
      totalBooksCompleted: 0,
      totalPagesRead: 5000,
      skillLevels: {},
      alreadyEarned: new Set(),
    })
    expect(badges).toEqual(expect.arrayContaining(['pages_100', 'pages_500', 'pages_1000', 'pages_5000']))
  })

  it('concede badge de habilidade ao atingir nível 5', () => {
    const badges = checkNewBadges({
      isFirstLogEver: false,
      currentStreak: 1,
      justCompletedBook: false,
      totalBooksCompleted: 0,
      totalPagesRead: 10,
      skillLevels: { mind: 5, writing: 4 },
      alreadyEarned: new Set(),
    })
    expect(badges).toContain('mind_5')
    expect(badges).not.toContain('writing_5')
  })

  it('concede books_10 apenas ao atingir 10 livros concluídos', () => {
    const badges = checkNewBadges({
      isFirstLogEver: false,
      currentStreak: 1,
      justCompletedBook: false,
      totalBooksCompleted: 9,
      totalPagesRead: 10,
      skillLevels: {},
      alreadyEarned: new Set(),
    })
    expect(badges).not.toContain('books_10')
  })
})
