import { useEffect, useState } from 'react'
import { BookMarked } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useStats } from './hooks/useStats'
import { useAuthStore } from './store/authStore'
import { AuthScreen } from './components/auth/AuthScreen'
import { OnboardingModal } from './components/onboarding/OnboardingModal'
import { Header } from './components/layout/Header'
import { BottomNav, type Screen } from './components/layout/BottomNav'
import { TodayScreen } from './components/reading/TodayScreen'
import { LibraryScreen } from './components/library/LibraryScreen'
import { DashboardScreen } from './components/dashboard/DashboardScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { BookFormModal } from './components/reading/BookFormModal'
import { MockModeBanner } from './components/layout/MockModeBanner'
import { setSoundEnabled } from './lib/sound'
import type { Book } from './types'

function SplashScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-muted">
      <BookMarked className="animate-pulse text-accent" size={40} />
      <p className="text-sm">Carregando...</p>
    </div>
  )
}

function AppShell() {
  const [screen, setScreen] = useState<Screen>('today')
  const [bookForm, setBookForm] = useState<{ open: boolean; book: Book | null }>({ open: false, book: null })
  const { stats } = useStats()
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    setSoundEnabled(profile?.sound_enabled ?? true)
  }, [profile?.sound_enabled])

  const openAddBook = () => setBookForm({ open: true, book: null })
  const openEditBook = (book: Book) => setBookForm({ open: true, book })

  return (
    <>
      <MockModeBanner />
      <Header currentStreak={stats?.current_streak ?? 0} />
      {screen === 'today' && <TodayScreen onAddBook={openAddBook} />}
      {screen === 'library' && <LibraryScreen onAddBook={openAddBook} onEditBook={openEditBook} />}
      {screen === 'stats' && <DashboardScreen />}
      {screen === 'settings' && <SettingsScreen />}
      <BottomNav active={screen} onChange={setScreen} />
      <BookFormModal
        key={bookForm.book?.id ?? 'new'}
        open={bookForm.open}
        book={bookForm.book}
        onClose={() => setBookForm({ open: false, book: null })}
      />
    </>
  )
}

function App() {
  const { session, profile, loading } = useAuth()

  if (loading) return <SplashScreen />
  if (!session)
    return (
      <>
        <MockModeBanner />
        <AuthScreen />
      </>
    )
  if (!profile) return <SplashScreen />
  if (!profile.onboarded) return <OnboardingModal />

  return <AppShell />
}

export default App
