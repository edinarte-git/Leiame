import type { MoodState } from '../../logic/mood'

interface ReadingMascotProps {
  mood: MoodState
  size?: number
}

const MOOD_LABEL: Record<MoodState, string> = {
  radiante: 'Carinha de leitura radiante: meta de hoje concluída',
  neutro: 'Carinha de leitura neutra: ainda dá tempo de ler hoje',
  triste: 'Carinha de leitura triste: um dia sem ler',
  frustrado: 'Carinha de leitura frustrada: vários dias sem ler',
}

interface FaceSpec {
  eye: string
  mouth: string
  brow?: string
  blush?: boolean
  tear?: boolean
  eyeFill?: boolean
}

const FACE: Record<MoodState, FaceSpec> = {
  radiante: {
    // olhos fechados em "^ ^" de tanta felicidade + sorriso aberto
    eye: 'M -11 -2 Q -7 -8 -3 -2 M 3 -2 Q 7 -8 11 -2',
    mouth: 'M -8 4 Q 0 15 8 4 Q 0 9 -8 4 Z',
    blush: true,
  },
  neutro: {
    eye: 'M -9 -2 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 5 -2 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0',
    mouth: 'M -6 6 H 6',
    eyeFill: true,
  },
  triste: {
    eye: 'M -9 -1 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 5 -1 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0',
    mouth: 'M -7 10 Q 0 3 7 10',
    brow: 'M -11 -7 Q -7 -4.5 -3 -6.5 M 3 -6.5 Q 7 -4.5 11 -7',
    tear: true,
    eyeFill: true,
  },
  frustrado: {
    eye: 'M -10 -0.5 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0 M 6.8 -0.5 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    // boca de dentes cerrados, em zigue-zague, para transmitir tensão/frustração
    mouth: 'M -7 10.5 L -4.2 12.8 L -1.4 10.2 L 1.4 12.8 L 4.2 10.2 L 7 12.8',
    brow: 'M -11.5 -9 L -3.5 -4.5 M 3.5 -4.5 L 11.5 -9',
    eyeFill: true,
  },
}

/** Tom do rosto por humor — parte do "amarelo" clássico, mais quente quando feliz, mais frio quando abatido. */
const FACE_COLOR: Record<MoodState, { fill: string; stroke: string }> = {
  radiante: { fill: 'var(--color-success)', stroke: 'var(--color-success)' },
  neutro: { fill: 'var(--color-accent)', stroke: 'var(--color-accent)' },
  triste: { fill: 'var(--color-warning)', stroke: 'var(--color-warning)' },
  frustrado: { fill: 'var(--color-danger)', stroke: 'var(--color-danger)' },
}

/**
 * Carinha redonda e brilhante que reflete o humor de leitura de um livro
 * (meta batida, em dia, ou atrasada). Puramente visual — o cálculo do
 * estado vem de `calculateMood`.
 */
export function ReadingMascot({ mood, size = 40 }: ReadingMascotProps) {
  const face = FACE[mood]
  const { fill, stroke } = FACE_COLOR[mood]
  const gradId = `mascot-sheen-${mood}`

  return (
    <div
      className={mood === 'radiante' ? 'mascot-bounce' : undefined}
      style={{ width: size, height: size }}
      role="img"
      aria-label={MOOD_LABEL[mood]}
      title={MOOD_LABEL[mood]}
    >
      <svg viewBox="-18 -18 36 36" width={size} height={size} className="mascot-breathe">
        <defs>
          <radialGradient id={gradId} cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor={fill} stopOpacity="0.55" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.22" />
          </radialGradient>
        </defs>

        <circle cx="0" cy="0" r="16.5" fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.4" />
        <ellipse cx="-6" cy="-9" rx="5.5" ry="3.2" fill="#fff" opacity="0.18" transform="rotate(-25 -6 -9)" />

        {face.blush && (
          <>
            <ellipse cx="-11" cy="4" rx="2.6" ry="1.7" fill={fill} opacity="0.45" />
            <ellipse cx="11" cy="4" rx="2.6" ry="1.7" fill={fill} opacity="0.45" />
          </>
        )}

        {face.brow && <path d={face.brow} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />}

        <path
          d={face.eye}
          stroke={stroke}
          strokeWidth={face.eyeFill ? 0.5 : 2}
          fill={face.eyeFill ? stroke : 'none'}
          strokeLinecap="round"
        />

        {face.tear && <path d="M 9 1 Q 11 5 9 7 Q 7 5 9 1 Z" fill="#7dd3fc" opacity="0.8" />}

        <path
          d={face.mouth}
          stroke={stroke}
          strokeWidth="2"
          fill={mood === 'radiante' ? stroke : 'none'}
          fillOpacity={mood === 'radiante' ? 0.85 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
