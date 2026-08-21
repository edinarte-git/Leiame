import { db, doc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from './firebaseClient'
import { todayIsoDate } from '../lib/date'
import type { Book, NewBook } from '../types'

export async function listBooks(userId: string): Promise<Book[]> {
  const q = query(collection(db, 'users', userId, 'books'), orderBy('created_at', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, user_id: userId, ...(d.data() as Omit<Book, 'id' | 'user_id'>) }))
}

export async function createBook(userId: string, book: NewBook): Promise<Book> {
  const now = new Date().toISOString()
  const data = {
    ...book,
    pages_read: 0,
    start_date: book.status === 'reading' ? todayIsoDate() : null,
    estimated_completion_date: null,
    completed_date: null,
    created_at: now,
    updated_at: now,
  }
  const ref = await addDoc(collection(db, 'users', userId, 'books'), data)
  return { id: ref.id, user_id: userId, ...data }
}

export async function updateBook(userId: string, bookId: string, patch: Partial<Book>): Promise<Book> {
  const ref = doc(db, 'users', userId, 'books', bookId)
  const { id: _id, user_id: _userId, ...rest } = patch
  await updateDoc(ref, { ...rest, updated_at: new Date().toISOString() })
  const books = await listBooks(userId)
  const updated = books.find((b) => b.id === bookId)
  if (!updated) throw new Error('Livro não encontrado após atualização.')
  return updated
}

export async function deleteBook(userId: string, bookId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'books', bookId))
}
