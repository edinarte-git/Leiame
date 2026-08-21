import { create } from 'zustand'
import type { Book, NewBook } from '../types'
import * as booksService from '../services/booksService'

interface BooksState {
  books: Book[]
  loading: boolean
  error: string | null
  fetchBooks: (userId: string) => Promise<void>
  addBook: (userId: string, book: NewBook) => Promise<Book>
  editBook: (userId: string, bookId: string, patch: Partial<Book>) => Promise<Book>
  removeBook: (userId: string, bookId: string) => Promise<void>
  applyLocal: (book: Book) => void
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  loading: false,
  error: null,

  fetchBooks: async (userId) => {
    set({ loading: true, error: null })
    try {
      const books = await booksService.listBooks(userId)
      set({ books })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Falha ao carregar livros.' })
    } finally {
      set({ loading: false })
    }
  },

  addBook: async (userId, book) => {
    const created = await booksService.createBook(userId, book)
    set({ books: [created, ...get().books] })
    return created
  },

  editBook: async (userId, bookId, patch) => {
    const updated = await booksService.updateBook(userId, bookId, patch)
    set({ books: get().books.map((b) => (b.id === bookId ? updated : b)) })
    return updated
  },

  removeBook: async (userId, bookId) => {
    await booksService.deleteBook(userId, bookId)
    set({ books: get().books.filter((b) => b.id !== bookId) })
  },

  applyLocal: (book) => {
    set({ books: get().books.map((b) => (b.id === book.id ? book : b)) })
  },
}))
