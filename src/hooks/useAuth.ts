import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const store = useAuthStore()

  useEffect(() => {
    store.init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return store
}
