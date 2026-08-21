import { afterEach, describe, expect, it } from 'vitest'
import { createBook, deleteBook, listBooks, updateBook } from './booksService'
import { resetMockFirestore } from './mockFirestore'
import type { NewBook } from '../types'

afterEach(() => {
  resetMockFirestore()
})

const newBook: NewBook = {
  title: 'Duna',
  author: 'Frank Herbert',
  total_pages: 412,
  daily_goal: 20,
  cover_url: null,
  status: 'reading',
}

describe('booksService', () => {
  it('cria um livro e o devolve com id e user_id preenchidos', async () => {
    const book = await createBook('user-1', newBook)
    expect(book.id).toBeTruthy()
    expect(book.user_id).toBe('user-1')
    expect(book.title).toBe('Duna')
    expect(book.pages_read).toBe(0)
    expect(book.status).toBe('reading')
    expect(book.start_date).toEqual(expect.any(String))
  })

  it('lista só os livros do usuário informado, ordenados por criação (mais recente primeiro)', async () => {
    await createBook('user-1', newBook)
    await createBook('user-2', { ...newBook, title: 'Livro de outra pessoa' })
    const books = await listBooks('user-1')
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe('Duna')
  })

  it('atualiza um livro existente', async () => {
    const created = await createBook('user-1', newBook)
    const updated = await updateBook('user-1', created.id, { pages_read: 50 })
    expect(updated.pages_read).toBe(50)
  })

  it('remove um livro', async () => {
    const created = await createBook('user-1', newBook)
    await deleteBook('user-1', created.id)
    const books = await listBooks('user-1')
    expect(books).toHaveLength(0)
  })
})
