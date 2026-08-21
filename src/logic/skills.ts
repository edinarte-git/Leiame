/**
 * "Habilidades" desenvolvidas pela leitura: um jeito de mostrar que ler
 * traz ganhos além do streak — foco, vocabulário, comunicação, cultura
 * geral e criatividade crescem junto com as páginas lidas.
 */

export interface SkillDef {
  code: string
  name: string
  description: string
  icon: string
  /** fração do total de páginas lidas que alimenta esta habilidade (somam 1) */
  weight: number
}

export const SKILLS: SkillDef[] = [
  { code: 'mind', name: 'Mente', description: 'Foco e concentração.', icon: 'Brain', weight: 0.25 },
  { code: 'writing', name: 'Escrita', description: 'Vocabulário e redação.', icon: 'PenLine', weight: 0.2 },
  { code: 'speaking', name: 'Oratória', description: 'Comunicação e argumentação.', icon: 'Mic', weight: 0.2 },
  { code: 'knowledge', name: 'Conhecimento', description: 'Cultura geral.', icon: 'GraduationCap', weight: 0.2 },
  { code: 'creativity', name: 'Criatividade', description: 'Imaginação.', icon: 'Sparkles', weight: 0.15 },
]

const POINTS_PER_LEVEL_STEP = 20 // páginas ponderadas necessárias por nível (passo cresce a cada nível)

export interface SkillProgress {
  code: string
  name: string
  description: string
  icon: string
  points: number
  level: number
  percentIntoLevel: number
}

function levelForPoints(points: number): { level: number; pointsAtLevelStart: number; pointsForNextLevel: number } {
  let level = 1
  let start = 0
  let step = POINTS_PER_LEVEL_STEP
  while (points >= start + step) {
    start += step
    step += POINTS_PER_LEVEL_STEP
    level += 1
  }
  return { level, pointsAtLevelStart: start, pointsForNextLevel: start + step }
}

export function calculateSkillProgress(totalPagesRead: number): SkillProgress[] {
  return SKILLS.map((skill) => {
    const points = Math.floor(totalPagesRead * skill.weight)
    const { level, pointsAtLevelStart, pointsForNextLevel } = levelForPoints(points)
    const span = pointsForNextLevel - pointsAtLevelStart
    const percentIntoLevel = span > 0 ? Math.round(((points - pointsAtLevelStart) / span) * 100) : 0
    return {
      code: skill.code,
      name: skill.name,
      description: skill.description,
      icon: skill.icon,
      points,
      level,
      percentIntoLevel,
    }
  })
}

export function skillLevel(totalPagesRead: number, skillCode: string): number {
  const skill = SKILLS.find((s) => s.code === skillCode)
  if (!skill) return 1
  const points = Math.floor(totalPagesRead * skill.weight)
  return levelForPoints(points).level
}
