import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'

/** Extrai a cor média (predominante) de uma imagem, amostrando um canvas pequeno. */
function useDominantColor(coverUrl: string | null): string | null {
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!coverUrl) {
      setColor(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const size = 16
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, size, size)
      try {
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
        if (count > 0 && !cancelled) {
          setColor(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`)
        }
      } catch {
        if (!cancelled) setColor(null)
      }
    }
    img.onerror = () => {
      if (!cancelled) setColor(null)
    }
    img.src = coverUrl
    return () => {
      cancelled = true
    }
  }, [coverUrl])

  return color
}

interface BookCoverRingProps {
  coverUrl: string | null
  size?: number
  strokeWidth?: number
}

export function BookCoverRing({ coverUrl, size = 48, strokeWidth = 4 }: BookCoverRingProps) {
  const dominantColor = useDominantColor(coverUrl)
  const strokeColor = dominantColor ?? 'var(--color-accent)'
  const radius = (size - strokeWidth) / 2
  const inset = strokeWidth + 2

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
      </svg>
      <div
        className="overflow-hidden rounded-full bg-surface-2"
        style={{ width: size - inset * 2, height: size - inset * 2 }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <BookOpen size={Math.max(size * 0.35, 14)} />
          </div>
        )}
      </div>
    </div>
  )
}
