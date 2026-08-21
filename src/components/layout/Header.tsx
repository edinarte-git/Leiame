import { Flame } from 'lucide-react'
import { AppLogo } from './AppLogo'

interface HeaderProps {
  currentStreak?: number
}

export function Header({ currentStreak = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur">
      <AppLogo />
      {currentStreak > 0 && (
        <div className="ember flex items-center gap-1 rounded-full border border-warning/30 bg-gradient-to-br from-warning/20 to-warning/5 px-3 py-1 text-sm font-semibold text-warning">
          <Flame size={16} />
          {currentStreak}
        </div>
      )}
    </header>
  )
}
