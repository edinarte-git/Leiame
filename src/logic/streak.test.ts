import { describe, expect, it } from 'vitest'
import { buildDailyTotals, calculateStreak } from './streak'

describe('calculateStreak', () => {
  it('retorna zero para lista vazia', () => {
    expect(calculateStreak([])).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
    })
  })

  it('calcula streak atual quando a última leitura foi hoje', () => {
    const today = new Date('2026-01-10T00:00:00')
    const dates = ['2026-01-08', '2026-01-09', '2026-01-10']
    const result = calculateStreak(dates, today)
    expect(result.currentStreak).toBe(3)
    expect(result.longestStreak).toBe(3)
    expect(result.lastReadDate).toBe('2026-01-10')
  })

  it('mantém streak atual quando a última leitura foi ontem (ainda não leu hoje)', () => {
    const today = new Date('2026-01-10T00:00:00')
    const dates = ['2026-01-08', '2026-01-09']
    const result = calculateStreak(dates, today)
    expect(result.currentStreak).toBe(2)
  })

  it('zera streak atual quando pulou 2+ dias', () => {
    const today = new Date('2026-01-10T00:00:00')
    const dates = ['2026-01-05', '2026-01-06', '2026-01-07']
    const result = calculateStreak(dates, today)
    expect(result.currentStreak).toBe(0)
    expect(result.longestStreak).toBe(3)
  })

  it('ignora datas duplicadas', () => {
    const today = new Date('2026-01-02T00:00:00')
    const dates = ['2026-01-01', '2026-01-01', '2026-01-02']
    const result = calculateStreak(dates, today)
    expect(result.currentStreak).toBe(2)
  })

  it('calcula longestStreak corretamente mesmo com streak atual quebrado', () => {
    const today = new Date('2026-02-01T00:00:00')
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05']
    const result = calculateStreak(dates, today)
    expect(result.longestStreak).toBe(5)
    expect(result.currentStreak).toBe(0)
  })
})

describe('buildDailyTotals', () => {
  it('soma páginas de múltiplos livros no mesmo dia', () => {
    const totals = buildDailyTotals([
      { date: '2026-01-01', pages_read: 10 },
      { date: '2026-01-01', pages_read: 5 },
      { date: '2026-01-02', pages_read: 20 },
    ])
    expect(totals.get('2026-01-01')).toBe(15)
    expect(totals.get('2026-01-02')).toBe(20)
  })
})
