import { useEffect } from 'react'
import { useStatsStore } from '../store/statsStore'
import { useAuthStore } from '../store/authStore'

export function useStats() {
  const session = useAuthStore((s) => s.session)
  const store = useStatsStore()

  useEffect(() => {
    if (session) {
      store.fetchStats(session.user.id)
      store.fetchBadges(session.user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  return store
}
