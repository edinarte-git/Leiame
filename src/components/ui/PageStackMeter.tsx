// Alturas em % do container, cíclicas — dá a textura orgânica de um maço de páginas
// (em vez de barras perfeitamente uniformes), sem depender de aleatoriedade real.
const HEIGHT_PATTERN = [100, 78, 92, 65, 88, 72, 96, 82]

interface PageStackMeterProps {
  /** 0–100 */
  percentComplete: number
  barCount?: number
  heightPx?: number
}

/** Progresso de leitura visualizado como a lombada de um livro: páginas lidas em traços dourados. */
export function PageStackMeter({ percentComplete, barCount = 32, heightPx = 20 }: PageStackMeterProps) {
  const clamped = Math.min(Math.max(percentComplete, 0), 100)
  const filledCount = Math.round((clamped / 100) * barCount)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(clamped)}% do livro lido`}
      className="flex items-end gap-[2px]"
      style={{ height: heightPx }}
    >
      {Array.from({ length: barCount }, (_, i) => {
        const isFilled = i < filledCount
        const height = HEIGHT_PATTERN[i % HEIGHT_PATTERN.length]
        return (
          <div
            key={i}
            aria-hidden="true"
            className={`flex-1 rounded-t-[1px] ${isFilled ? 'bg-gradient-to-t from-accent to-accent-2' : 'bg-border/60'}`}
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}
