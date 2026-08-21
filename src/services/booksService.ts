import { supabase } from './supabaseClient'
import { todayIsoDate } from '../lib/date'
import type { Book, NewBook } from '../types'

export async function listBooks(userId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Book[]
}

export async function createBook(userId: string, book: NewBook): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .insert({
      ...book,
      user_id: userId,
      start_date: book.status === 'reading' ? todayIsoDate() : null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Book
}

export async function updateBook(bookId: string, patch: Partial<Book>): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', bookId)
    .select()
    .single()
  if (error) throw error
  return data as Book
}

export async function deleteBook(bookId: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', bookId)
  if (error) throw error
}
