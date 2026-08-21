import { localIsoDate } from '../../lib/date'

interface HeatmapProps {
  dailyTotals: Map<string, number>
  days?: number
}

function intensityClass(pages: number): string {
  if (pages <= 0) return 'bg-surface-2'
  if (pages < 5) return 'bg-accent/25'
  if (pages < 15) return 'bg-accent/50'
  if (pages < 30) return 'bg-accent/75'
  return 'bg-accent'
}

export function Heatmap({ dailyTotals, days = 91 }: HeatmapProps) {
  const cells: { date: string; pages: number }[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localIsoDate(d)
    cells.push({ date: key, pages: dailyTotals.get(key) ?? 0 })
  }

  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-1">
      {cells.map((cell) => (
        <div
          key={cell.date}
          title={`${cell.date}: ${cell.pages} página(s)`}
          className={`h-3 w-3 rounded-sm ${intensityClass(cell.pages)}`}
        />
      ))}
    </div>
  )
}
