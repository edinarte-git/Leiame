import { BookMarked } from 'lucide-react'

export function AppLogo({ size = 22 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 font-display font-semibold text-text">
      <BookMarked size={size} className="text-accent" />
      <span>Leiame</span>
    </div>
  )
}
