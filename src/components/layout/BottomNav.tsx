import { BookOpen, Library, Trophy, Settings } from 'lucide-react'
import { playTap } from '../../lib/sound'

export type Screen = 'today' | 'library' | 'stats' | 'settings'

interface BottomNavProps {
  active: Screen
  onChange: (screen: Screen) => void
}

const items: { screen: Screen; label: string; icon: typeof BookOpen }[] = [
  { screen: 'today', label: 'Hoje', icon: BookOpen },
  { screen: 'library', label: 'Biblioteca', icon: Library },
  { screen: 'stats', label: 'Conquistas', icon: Trophy },
  { screen: 'settings', label: 'Ajustes', icon: Settings },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {items.map(({ screen, label, icon: Icon }) => {
        const isActive = screen === active
        return (
          <button
            key={screen}
            onClick={() => {
              playTap()
              onChange(screen)
            }}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors active:scale-95 ${isActive ? 'text-accent' : 'text-text-muted hover:text-text'}`}
          >
            <span
              className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-accent/15' : ''}`}
            >
              <Icon size={20} />
            </span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}
