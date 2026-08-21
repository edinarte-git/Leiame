import { useEffect } from 'react'
import { useBooksStore } from '../store/booksStore'
import { useAuthStore } from '../store/authStore'

export function useBooks() {
  const user = useAuthStore((s) => s.user)
  const store = useBooksStore()

  useEffect(() => {
    if (user) store.fetchBooks(user.uid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  return store
}
