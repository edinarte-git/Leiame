import { supabase } from './supabaseClient'
import { todayIsoDate } from '../lib/date'
import type { ReadingLog } from '../types'

export async function listLogs(userId: string, sinceDate?: string): Promise<ReadingLog[]> {
  let query = supabase.from('reading_logs').select('*').eq('user_id', userId)
  if (sinceDate) query = query.gte('date', sinceDate)
  const { data, error } = await query.order('date', { ascending: true })
  if (error) throw error
  return data as ReadingLog[]
}

/** Registra páginas lidas hoje para um livro. Se já existir um log hoje, soma as páginas. */
export async function upsertTodayLog(
  userId: string,
  bookId: string,
  pagesRead: number,
): Promise<ReadingLog> {
  const today = todayIsoDate()

  const { data: existing, error: fetchError } = await supabase
    .from('reading_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('date', today)
    .maybeSingle()
  if (fetchError) throw fetchError

  if (existing) {
    const { data, error } = await supabase
      .from('reading_logs')
      .update({ pages_read: existing.pages_read + pagesRead })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data as ReadingLog
  }

  const { data, error } = await supabase
    .from('reading_logs')
    .insert({ user_id: userId, book_id: bookId, date: today, pages_read: pagesRead })
    .select()
    .single()
  if (error) throw error
  return data as ReadingLog
}
