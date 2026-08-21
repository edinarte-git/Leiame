import { db, doc, collection, getDoc, getDocs, setDoc, query, where, orderBy, increment } from './firebaseClient'
import { todayIsoDate } from '../lib/date'
import type { ReadingLog } from '../types'

export async function listLogs(userId: string, sinceDate?: string): Promise<ReadingLog[]> {
  const clauses = sinceDate ? [where('date', '>=', sinceDate), orderBy('date', 'asc')] : [orderBy('date', 'asc')]
  const q = query(collection(db, 'users', userId, 'readingLogs'), ...clauses)
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, user_id: userId, ...(d.data() as Omit<ReadingLog, 'id' | 'user_id'>) }))
}

/** Registra páginas lidas hoje para um livro. Se já existir um log hoje, soma as páginas (atomicamente). */
export async function upsertTodayLog(userId: string, bookId: string, pagesRead: number): Promise<ReadingLog> {
  const date = todayIsoDate()
  const docId = `${bookId}_${date}`
  const ref = doc(db, 'users', userId, 'readingLogs', docId)
  // created_at não é lido em nenhum lugar do app (só existe no tipo ReadingLog);
  // grava-se a cada chamada, inclusive incrementos subsequentes no mesmo dia —
  // reflete a última escrita, não a criação original, sem custo funcional real.
  await setDoc(
    ref,
    { book_id: bookId, date, pages_read: increment(pagesRead), created_at: new Date().toISOString() },
    { merge: true },
  )
  const snapshot = await getDoc(ref)
  const data = snapshot.data() as Omit<ReadingLog, 'id' | 'user_id'>
  return { id: docId, user_id: userId, ...data }
}
