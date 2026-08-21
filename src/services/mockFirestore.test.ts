import { afterEach, describe, expect, it } from 'vitest'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  resetMockFirestore,
  setDoc,
  updateDoc,
  where,
} from './mockFirestore'

afterEach(() => {
  resetMockFirestore()
})

describe('mockFirestore', () => {
  it('grava e lê um documento de perfil (users/{uid})', async () => {
    const ref = doc({}, 'users', 'user-1')
    await setDoc(ref, { name: 'Edinart' })
    const snapshot = await getDoc(ref)
    expect(snapshot.exists()).toBe(true)
    expect(snapshot.data()).toEqual({ name: 'Edinart' })
  })

  it('retorna exists() false para documento inexistente', async () => {
    const snapshot = await getDoc(doc({}, 'users', 'ninguem'))
    expect(snapshot.exists()).toBe(false)
    expect(snapshot.data()).toBeUndefined()
  })

  it('updateDoc mescla campos sem apagar o resto', async () => {
    const ref = doc({}, 'users', 'user-1')
    await setDoc(ref, { name: 'Edinart', xp: 0 })
    await updateDoc(ref, { xp: 50 })
    const snapshot = await getDoc(ref)
    expect(snapshot.data()).toEqual({ name: 'Edinart', xp: 50 })
  })

  it('increment soma atomicamente sobre o valor existente', async () => {
    const ref = doc({}, 'users', 'user-1', 'readingLogs', 'book-1_2026-08-20')
    await setDoc(ref, { pages_read: increment(10) }, { merge: true })
    await setDoc(ref, { pages_read: increment(5) }, { merge: true })
    const snapshot = await getDoc(ref)
    expect(snapshot.data()?.pages_read).toBe(15)
  })

  it('addDoc gera um id novo dentro da coleção', async () => {
    const col = collection({}, 'users', 'user-1', 'books')
    const ref = await addDoc(col, { title: 'Duna' })
    const snapshot = await getDoc(ref)
    expect(snapshot.data()).toEqual({ title: 'Duna' })
  })

  it('deleteDoc remove o documento', async () => {
    const ref = doc({}, 'users', 'user-1', 'books', 'book-1')
    await setDoc(ref, { title: 'Duna' })
    await deleteDoc(ref)
    expect((await getDoc(ref)).exists()).toBe(false)
  })

  it('getDocs numa coleção retorna todos os documentos', async () => {
    const col = collection({}, 'users', 'user-1', 'badges')
    await setDoc(doc({}, 'users', 'user-1', 'badges', 'first_log'), { earned_at: '2026-08-20' })
    await setDoc(doc({}, 'users', 'user-1', 'badges', 'streak_3'), { earned_at: '2026-08-21' })
    const snapshot = await getDocs(col)
    expect(snapshot.docs.map((d) => d.id).sort()).toEqual(['first_log', 'streak_3'])
  })

  it('query com where(">=") e orderBy filtra e ordena', async () => {
    const col = collection({}, 'users', 'user-1', 'readingLogs')
    await setDoc(doc({}, 'users', 'user-1', 'readingLogs', 'a'), { date: '2026-08-18', pages_read: 10 })
    await setDoc(doc({}, 'users', 'user-1', 'readingLogs', 'b'), { date: '2026-08-20', pages_read: 20 })
    const q = query(col, where('date', '>=', '2026-08-19'), orderBy('date', 'asc'))
    const snapshot = await getDocs(q)
    expect(snapshot.docs.map((d) => d.data()?.date)).toEqual(['2026-08-20'])
  })
})
