import { describe, expect, it } from 'vitest'
import { SKILLS, calculateSkillProgress, skillLevel } from './skills'

describe('calculateSkillProgress', () => {
  it('retorna nível 1 e zero pontos para totalPagesRead = 0', () => {
    const progress = calculateSkillProgress(0)
    expect(progress).toHaveLength(SKILLS.length)
    for (const skill of progress) {
      expect(skill.level).toBe(1)
      expect(skill.points).toBe(0)
      expect(skill.percentIntoLevel).toBe(0)
    }
  })

  it('distribui pontos proporcionalmente ao peso de cada habilidade', () => {
    const progress = calculateSkillProgress(100)
    const mind = progress.find((s) => s.code === 'mind')!
    const creativity = progress.find((s) => s.code === 'creativity')!
    expect(mind.points).toBe(25) // 100 * 0.25
    expect(creativity.points).toBe(15) // 100 * 0.15
  })

  it('sobe de nível conforme os pontos acumulam', () => {
    // mind (peso 0.25): nível 2 aos 20 pontos -> 80 páginas
    const before = calculateSkillProgress(79).find((s) => s.code === 'mind')!
    const after = calculateSkillProgress(80).find((s) => s.code === 'mind')!
    expect(before.level).toBe(1)
    expect(after.level).toBe(2)
  })

  it('os pesos de todas as habilidades somam 1', () => {
    const total = SKILLS.reduce((sum, s) => sum + s.weight, 0)
    expect(total).toBeCloseTo(1)
  })
})

describe('skillLevel', () => {
  it('retorna 1 para código desconhecido', () => {
    expect(skillLevel(1000, 'nao_existe')).toBe(1)
  })

  it('bate com o nível calculado em calculateSkillProgress', () => {
    const progress = calculateSkillProgress(500)
    for (const skill of progress) {
      expect(skillLevel(500, skill.code)).toBe(skill.level)
    }
  })
})
