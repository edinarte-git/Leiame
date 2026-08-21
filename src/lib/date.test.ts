import { describe, expect, it } from 'vitest'
import { formatWeekdayDate, localIsoDate, todayIsoDate } from './date'

describe('localIsoDate', () => {
  it('returns the local calendar date late at night, not the UTC date', () => {
    // 15/jan às 23:30 no horário local: se convertido para UTC num fuso
    // negativo (ex.: UTC-3), a data UTC já seria 16/jan.
    const lateNight = new Date(2026, 0, 15, 23, 30)
    expect(localIsoDate(lateNight)).toBe('2026-01-15')
  })

  it('pads month and day with a leading zero', () => {
    const date = new Date(2026, 0, 5, 8, 0)
    expect(localIsoDate(date)).toBe('2026-01-05')
  })
})

describe('formatWeekdayDate', () => {
  it('formats the weekday and day/month in pt-BR, without the year', () => {
    const date = new Date(2026, 7, 20) // quinta-feira, 20 de agosto de 2026
    expect(formatWeekdayDate(date)).toBe('quinta-feira, 20 de agosto')
  })
})

describe('todayIsoDate', () => {
  it('returns the local iso date for a given reference date', () => {
    const date = new Date(2026, 11, 31, 23, 59)
    expect(todayIsoDate(date)).toBe('2026-12-31')
  })
})
