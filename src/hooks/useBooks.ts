import { useEffect } from 'react'
import { useBooksStore } from '../store/booksStore'
import { useAuthStore } from '../store/authStore'

export function useBooks() {
  const session = useAuthStore((s) => s.session)
  const store = useBooksStore()

  useEffect(() => {
    if (session) store.fetchBooks(session.user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  return store
}
