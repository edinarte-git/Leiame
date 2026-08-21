import { useEffect } from 'react'
import { useStatsStore } from '../store/statsStore'
import { useAuthStore } from '../store/authStore'

export function useStats() {
  const user = useAuthStore((s) => s.user)
  const store = useStatsStore()

  useEffect(() => {
    if (user) {
      store.fetchStats(user.uid)
      store.fetchBadges(user.uid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  return store
}
