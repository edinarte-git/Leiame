# Migração Supabase → Firebase — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir Supabase (Postgres + Auth) por Firebase (Firestore + Auth) como backend do Leiame, adicionando login com Google, mantendo o modo de teste local (sem nenhuma credencial de nuvem) e sem regredir nenhum comportamento existente.

**Architecture:** Um único arquivo `firebaseClient.ts` concentra a inicialização do Firebase e alterna, via `isMockMode`, entre as funções reais do SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`) e um shim local (`mockAuth.ts` + `mockFirestore.ts`) que reimplementa só o subconjunto da API usado, em localStorage. Cada serviço (`authService`, `booksService`, `logsService`, `statsService`) importa exclusivamente de `firebaseClient.ts` — nunca direto do SDK do Firebase nem dos mocks. Dados ficam em `users/{uid}` (perfil + estatísticas juntos) e subcoleções `users/{uid}/books`, `users/{uid}/readingLogs`, `users/{uid}/badges`.

**Tech Stack:** React 19 + TypeScript + Vite + Zustand + Firebase JS SDK (Auth + Firestore) + Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-20-firebase-migration-design.md`

## Global Constraints

- Nenhum dado de produção existe hoje — não há migração de dados a fazer, é reescrita limpa.
- Sem Cloud Functions: tudo client-side, segurança via Firestore Security Rules.
- O modo de teste local (`VITE_USE_MOCK=true`) continua funcionando sem nenhuma credencial real.
- **Desvio deliberado da spec:** os campos gravados no Firestore usam os **mesmos nomes em snake_case** que os tipos TypeScript já usam hoje (`default_daily_goal`, `total_pages_read`, `pages_read`, `book_id`, etc.), em vez de camelCase idiomático do Firestore. Isso elimina qualquer camada de tradução de nomes de campo entre o serviço e o Firestore — cada função de serviço fica quase uma tradução linha a linha da versão Supabase atual, o que reduz bastante o risco desta migração. É uma escolha de implementação, não uma mudança de requisito.
- `created_at`/`updated_at`/`earned_at` continuam sendo strings ISO calculadas no cliente (`new Date().toISOString()`), **não** o sentinel `serverTimestamp()` do Firestore — evita a complexidade do tipo `Timestamp` (que exigiria `.toDate()` em toda leitura) para um ganho que não importa num app pessoal.
- `book.user_id` / `log.user_id` / `badge.user_id` continuam existindo nos tipos TypeScript (para não quebrar nada que os leia), mas deixam de ser gravados como campo no Firestore (o caminho do documento já garante o dono) — cada serviço só injeta `user_id: uid` no objeto JS retornado, na hora de montar a resposta.
- Depois de cada task: `npx tsc -b`, `npx vitest run`, `npx oxlint` devem passar limpos antes de commitar.

---

## Mapa de arquivos

| Arquivo | O que muda |
|---|---|
| `src/services/mockFirestore.ts` | **novo** — engine Firestore local em localStorage |
| `src/services/mockAuth.ts` | **novo** — engine Auth local em localStorage |
| `src/services/firebaseClient.ts` | **novo**, substitui `supabaseClient.ts` — inicializa o Firebase real ou seleciona os mocks |
| `src/services/authService.ts` | reescrito sobre `firebaseClient.ts` |
| `src/services/booksService.ts` | reescrito; `updateBook`/`deleteBook` ganham parâmetro `userId` |
| `src/services/logsService.ts` | reescrito; `upsertTodayLog` vira `increment()` atômico |
| `src/services/statsService.ts` | reescrito |
| `src/store/authStore.ts` | `session` → `user` (tipo `AppUser`), `init()` simplificado, nova ação `signInWithGoogle` |
| `src/store/booksStore.ts` | `editBook`/`removeBook` ganham parâmetro `userId` |
| `src/hooks/useBooks.ts`, `useStats.ts`, `useTodayLog.ts` | `session` → `user` |
| `src/components/reading/TodayScreen.tsx`, `BookFormModal.tsx` | `session` → `user` |
| `src/components/dashboard/DashboardScreen.tsx` | `session` → `user` |
| `src/components/settings/SettingsScreen.tsx` | `session` → `user`, import de `isMockMode` |
| `src/components/layout/MockModeBanner.tsx` | import de `isMockMode` |
| `src/components/library/BookDetailModal.tsx` | ganha seletor de `user`, passa `userId` pro `editBook`/`removeBook` |
| `src/components/auth/AuthScreen.tsx` | liga `signInWithGoogle` de verdade, esconde o botão em modo mock |
| `src/types/index.ts` | adiciona `AppUser` |
| `firestore.rules` | **novo** |
| `supabase_schema.sql` | **removido** |
| `package.json`, `.env`, `.env.example`, `README.md` | trocam Supabase por Firebase |
| `src/hooks/useTodayLog.test.ts`, `src/components/settings/SettingsScreen.test.tsx`, `src/store/booksStore.test.ts` | ajustados para os novos tipos/assinaturas |

---

### Task 1: Dependências e engine mock do Firestore

**Files:**
- Modify: `package.json`
- Create: `src/services/mockFirestore.ts`
- Test: `src/services/mockFirestore.test.ts`

**Interfaces:**
- Produces: `doc(db, ...path)`, `collection(db, ...path)`, `getDoc(ref)`, `setDoc(ref, data, opts?)`, `updateDoc(ref, patch)`, `deleteDoc(ref)`, `addDoc(collRef, data)`, `query(collRef, ...clauses)`, `where(field, op, value)`, `orderBy(field, dir?)`, `getDocs(target)`, `increment(n)`, `resetMockFirestore()`

- [ ] **Step 1: Instalar o Firebase e remover o Supabase**

```bash
npm install firebase
npm uninstall @supabase/supabase-js
```

- [ ] **Step 2: Escrever o teste da engine mock (falhando)**

Crie `src/services/mockFirestore.test.ts`:

```ts
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
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/services/mockFirestore.test.ts`
Expected: falha — `Failed to resolve import "./mockFirestore"` (o arquivo ainda não existe).

- [ ] **Step 4: Implementar `mockFirestore.ts`**

Crie `src/services/mockFirestore.ts`:

```ts
/**
 * Reimplementação mínima da API modular do Firestore (doc/collection/get/set/
 * update/delete/query/where/orderBy/increment) rodando 100% em localStorage.
 * Cobre só o que os services desta app realmente chamam.
 */

const DB_KEY = 'leiame_mock_firestore_v1'

type DocData = Record<string, unknown>
type CollectionName = 'books' | 'readingLogs' | 'badges'

interface MockFirestoreTree {
  [uid: string]: {
    profile: DocData
    books: Record<string, DocData>
    readingLogs: Record<string, DocData>
    badges: Record<string, DocData>
  }
}

function loadTree(): MockFirestoreTree {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveTree(tree: MockFirestoreTree) {
  localStorage.setItem(DB_KEY, JSON.stringify(tree))
}

function ensureUser(tree: MockFirestoreTree, uid: string) {
  if (!tree[uid]) tree[uid] = { profile: {}, books: {}, readingLogs: {}, badges: {} }
  return tree[uid]
}

function collectionNameFor(path: string[]): CollectionName | null {
  const key = path[2]
  if (key === 'books' || key === 'readingLogs' || key === 'badges') return key
  return null
}

export interface MockDocRef {
  __mockDocRef: true
  path: string[]
}

export interface MockCollectionRef {
  __mockCollectionRef: true
  path: string[]
}

interface MockIncrement {
  __mockIncrement: number
}

export function increment(n: number): MockIncrement {
  return { __mockIncrement: n }
}

function isIncrement(value: unknown): value is MockIncrement {
  return typeof value === 'object' && value !== null && '__mockIncrement' in value
}

function resolveIncrements(existing: DocData, patch: DocData): DocData {
  const resolved: DocData = { ...patch }
  for (const [key, value] of Object.entries(patch)) {
    if (isIncrement(value)) {
      const current = typeof existing[key] === 'number' ? (existing[key] as number) : 0
      resolved[key] = current + value.__mockIncrement
    }
  }
  return resolved
}

export function doc(_db: unknown, ...path: string[]): MockDocRef {
  return { __mockDocRef: true, path }
}

export function collection(_db: unknown, ...path: string[]): MockCollectionRef {
  return { __mockCollectionRef: true, path }
}

function readRawDoc(path: string[]): DocData | undefined {
  const tree = loadTree()
  const user = tree[path[1]]
  if (!user) return undefined
  if (path.length === 2) {
    return Object.keys(user.profile).length ? user.profile : undefined
  }
  const col = collectionNameFor(path)
  if (!col) return undefined
  return user[col][path[3]]
}

export interface MockDocSnapshot {
  id: string
  exists(): boolean
  data(): DocData | undefined
}

export async function getDoc(ref: MockDocRef): Promise<MockDocSnapshot> {
  const data = readRawDoc(ref.path)
  return {
    id: ref.path[ref.path.length - 1],
    exists: () => data !== undefined,
    data: () => data,
  }
}

export async function setDoc(ref: MockDocRef, data: DocData, opts?: { merge?: boolean }): Promise<void> {
  const tree = loadTree()
  const user = ensureUser(tree, ref.path[1])
  if (ref.path.length === 2) {
    const existing = opts?.merge ? user.profile : {}
    user.profile = { ...existing, ...resolveIncrements(existing, data) }
  } else {
    const col = collectionNameFor(ref.path)
    if (!col) throw new Error(`mockFirestore: caminho inválido ${ref.path.join('/')}`)
    const existing = opts?.merge ? (user[col][ref.path[3]] ?? {}) : {}
    user[col][ref.path[3]] = { ...existing, ...resolveIncrements(existing, data) }
  }
  saveTree(tree)
}

export async function updateDoc(ref: MockDocRef, patch: DocData): Promise<void> {
  const existing = readRawDoc(ref.path)
  if (existing === undefined) throw new Error(`mockFirestore: documento não existe em ${ref.path.join('/')}`)
  await setDoc(ref, patch, { merge: true })
}

export async function deleteDoc(ref: MockDocRef): Promise<void> {
  const tree = loadTree()
  const user = tree[ref.path[1]]
  if (!user) return
  const col = collectionNameFor(ref.path)
  if (col) delete user[col][ref.path[3]]
  saveTree(tree)
}

let autoIdCounter = 0
function generateId(): string {
  autoIdCounter += 1
  return `mock-${Date.now()}-${autoIdCounter}`
}

export async function addDoc(ref: MockCollectionRef, data: DocData): Promise<MockDocRef> {
  const docRef: MockDocRef = { __mockDocRef: true, path: [...ref.path, generateId()] }
  await setDoc(docRef, data)
  return docRef
}

interface MockWhereClause {
  __mockWhere: true
  field: string
  op: '>='
  value: unknown
}

interface MockOrderBy {
  __mockOrderBy: true
  field: string
  direction: 'asc' | 'desc'
}

export function where(field: string, op: '>=', value: unknown): MockWhereClause {
  return { __mockWhere: true, field, op, value }
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): MockOrderBy {
  return { __mockOrderBy: true, field, direction }
}

export interface MockQuery {
  __mockQuery: true
  path: string[]
  wheres: MockWhereClause[]
  order?: MockOrderBy
}

export function query(ref: MockCollectionRef, ...clauses: (MockWhereClause | MockOrderBy)[]): MockQuery {
  return {
    __mockQuery: true,
    path: ref.path,
    wheres: clauses.filter((c): c is MockWhereClause => '__mockWhere' in c),
    order: clauses.find((c): c is MockOrderBy => '__mockOrderBy' in c),
  }
}

export interface MockQuerySnapshot {
  docs: MockDocSnapshot[]
}

export async function getDocs(target: MockCollectionRef | MockQuery): Promise<MockQuerySnapshot> {
  const tree = loadTree()
  const user = tree[target.path[1]]
  const col = collectionNameFor(target.path)
  let entries = user && col ? Object.entries(user[col]) : []

  if ('wheres' in target) {
    for (const w of target.wheres) {
      entries = entries.filter(([, data]) => (data[w.field] as string) >= (w.value as string))
    }
  }
  if ('order' in target && target.order) {
    const { field, direction } = target.order
    entries = [...entries].sort((a, b) => {
      const cmp = (a[1][field] as string) > (b[1][field] as string) ? 1 : -1
      return direction === 'asc' ? cmp : -cmp
    })
  }

  return { docs: entries.map(([id, data]) => ({ id, exists: () => true, data: () => data })) }
}

export function resetMockFirestore() {
  localStorage.removeItem(DB_KEY)
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/services/mockFirestore.test.ts`
Expected: 8 testes passando.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/services/mockFirestore.ts src/services/mockFirestore.test.ts
git commit -m "Adiciona dependência do Firebase e engine mock do Firestore"
```

---

### Task 2: Engine mock do Auth

**Files:**
- Create: `src/services/mockAuth.ts`
- Test: `src/services/mockAuth.test.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `MockUser { uid, email, displayName }`, `createUserWithEmailAndPassword(auth, email, password)`, `signInWithEmailAndPassword(auth, email, password)`, `updateAuthProfile(user, {displayName})`, `signOutUser(auth)`, `onAuthStateChanged(auth, callback)`, `signInWithGoogleRedirect(auth)` (lança erro amigável — Google não é simulável em mock), `getGoogleRedirectResult(auth)`, `resetMockAuth()`

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `src/services/mockAuth.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  resetMockAuth,
  signInWithEmailAndPassword,
  signInWithGoogleRedirect,
  signOutUser,
} from './mockAuth'

afterEach(() => {
  resetMockAuth()
})

describe('mockAuth', () => {
  it('cria um usuário novo e inicia a sessão', async () => {
    const { user } = await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    expect(user.email).toBe('ana@example.com')
    expect(user.uid).toBeTruthy()
  })

  it('rejeita cadastro com e-mail já usado', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    await expect(createUserWithEmailAndPassword({}, 'ana@example.com', 'outrasenha')).rejects.toThrow(
      'já está cadastrado',
    )
  })

  it('faz login com e-mail e senha corretos', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    const { user } = await signInWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    expect(user.email).toBe('ana@example.com')
  })

  it('rejeita login com senha errada', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    await expect(signInWithEmailAndPassword({}, 'ana@example.com', 'errada')).rejects.toThrow('inválidos')
  })

  it('onAuthStateChanged dispara com o usuário atual e depois com null após signOut', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    const callback = vi.fn()
    onAuthStateChanged({}, callback)
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com' }))

    await signOutUser({})
    expect(callback).toHaveBeenLastCalledWith(null)
  })

  it('signInWithGoogleRedirect rejeita com uma mensagem amigável (não simulável em mock)', async () => {
    await expect(signInWithGoogleRedirect({})).rejects.toThrow('não está disponível no modo de teste local')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/services/mockAuth.test.ts`
Expected: falha — módulo `./mockAuth` não existe.

- [ ] **Step 3: Implementar `mockAuth.ts`**

Crie `src/services/mockAuth.ts`:

```ts
/**
 * Reimplementação mínima da API de Auth do Firebase (e-mail/senha +
 * onAuthStateChanged) rodando 100% em localStorage. Entrar com Google não é
 * simulável em modo mock — o botão fica oculto (ver AuthScreen.tsx); a função
 * abaixo só existe como uma rede de segurança caso seja chamada por engano.
 */

const USERS_KEY = 'leiame_mock_auth_users_v1'
const SESSION_KEY = 'leiame_mock_auth_session_v1'

export interface MockUser {
  uid: string
  email: string | null
  displayName: string | null
}

interface StoredAuthUser {
  uid: string
  email: string
  password: string
  displayName: string
}

function loadUsers(): StoredAuthUser[] {
  const raw = localStorage.getItem(USERS_KEY)
  return raw ? JSON.parse(raw) : []
}

function saveUsers(users: StoredAuthUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readSession(): MockUser | null {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

type Listener = (user: MockUser | null) => void
const listeners: Listener[] = []

function writeSession(user: MockUser | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else localStorage.removeItem(SESSION_KEY)
  listeners.forEach((cb) => cb(user))
}

export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
): Promise<{ user: MockUser }> {
  const users = loadUsers()
  if (users.some((u) => u.email === email)) {
    throw new Error('Este e-mail já está cadastrado (modo de teste local).')
  }
  const stored: StoredAuthUser = { uid: crypto.randomUUID(), email, password, displayName: '' }
  users.push(stored)
  saveUsers(users)
  const user: MockUser = { uid: stored.uid, email: stored.email, displayName: stored.displayName || null }
  writeSession(user)
  return { user }
}

export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
): Promise<{ user: MockUser }> {
  const stored = loadUsers().find((u) => u.email === email)
  if (!stored || stored.password !== password) {
    throw new Error('E-mail ou senha inválidos.')
  }
  const user: MockUser = { uid: stored.uid, email: stored.email, displayName: stored.displayName || null }
  writeSession(user)
  return { user }
}

export async function updateAuthProfile(user: MockUser, patch: { displayName?: string }): Promise<void> {
  const users = loadUsers()
  const stored = users.find((u) => u.uid === user.uid)
  if (stored && patch.displayName !== undefined) {
    stored.displayName = patch.displayName
    saveUsers(users)
    if (readSession()?.uid === user.uid) writeSession({ ...user, displayName: patch.displayName })
  }
}

export async function signOutUser(_auth: unknown): Promise<void> {
  writeSession(null)
}

export function onAuthStateChanged(_auth: unknown, callback: Listener): () => void {
  listeners.push(callback)
  callback(readSession())
  return () => {
    const i = listeners.indexOf(callback)
    if (i >= 0) listeners.splice(i, 1)
  }
}

export async function signInWithGoogleRedirect(_auth: unknown): Promise<void> {
  throw new Error('Login com Google não está disponível no modo de teste local.')
}

export async function getGoogleRedirectResult(_auth: unknown): Promise<null> {
  return null
}

export function resetMockAuth() {
  localStorage.removeItem(USERS_KEY)
  localStorage.removeItem(SESSION_KEY)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/services/mockAuth.test.ts`
Expected: 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/services/mockAuth.ts src/services/mockAuth.test.ts
git commit -m "Adiciona engine mock de autenticação"
```

---

### Task 3: `firebaseClient.ts` (seam real/mock)

**Files:**
- Create: `src/services/firebaseClient.ts`
- Delete: `src/services/supabaseClient.ts`
- Delete: `src/services/mockDb.ts`
- Delete: `src/services/mockSupabase.ts`
- Modify: `.env`, `.env.example`

**Interfaces:**
- Consumes: tudo de `mockFirestore.ts` (Task 1) e `mockAuth.ts` (Task 2).
- Produces: `isMockMode: boolean`, `auth`, `db`, e todas as funções re-exportadas (`doc`, `collection`, `getDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `addDoc`, `query`, `where`, `orderBy`, `getDocs`, `increment`, `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `updateAuthProfile`, `signOutUser`, `onAuthStateChangedCompat`, `signInWithGoogleRedirect`, `getGoogleRedirectResult`) — assinaturas idênticas nos dois modos.

- [ ] **Step 1: Atualizar `.env` e `.env.example`**

`.env.example`:

```
VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx
```

`.env` (mantém modo mock, como já estava):

```
VITE_USE_MOCK=true
```

- [ ] **Step 2: Criar `src/services/firebaseClient.ts`**

```ts
import { initializeApp } from 'firebase/app'
import * as realAuth from 'firebase/auth'
import * as realFirestore from 'firebase/firestore'
import * as mockAuth from './mockAuth'
import * as mockFirestore from './mockFirestore'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
const explicitMock = import.meta.env.VITE_USE_MOCK === 'true'

/** Modo de teste local: nenhuma credencial Firebase configurada (ou VITE_USE_MOCK=true). */
export const isMockMode = explicitMock || !apiKey || !projectId

const app = isMockMode
  ? null
  : initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })

export const auth: unknown = isMockMode ? { __mockAuth: true } : realAuth.getAuth(app!)
export const db: unknown = isMockMode ? { __mockFirestore: true } : realFirestore.getFirestore(app!)

// --- Firestore ---
export const doc = isMockMode ? mockFirestore.doc : (realFirestore.doc as typeof mockFirestore.doc)
export const collection = isMockMode
  ? mockFirestore.collection
  : (realFirestore.collection as typeof mockFirestore.collection)
export const getDoc = isMockMode ? mockFirestore.getDoc : (realFirestore.getDoc as typeof mockFirestore.getDoc)
export const setDoc = isMockMode ? mockFirestore.setDoc : (realFirestore.setDoc as typeof mockFirestore.setDoc)
export const updateDoc = isMockMode
  ? mockFirestore.updateDoc
  : (realFirestore.updateDoc as typeof mockFirestore.updateDoc)
export const deleteDoc = isMockMode
  ? mockFirestore.deleteDoc
  : (realFirestore.deleteDoc as typeof mockFirestore.deleteDoc)
export const addDoc = isMockMode ? mockFirestore.addDoc : (realFirestore.addDoc as typeof mockFirestore.addDoc)
export const query = isMockMode ? mockFirestore.query : (realFirestore.query as typeof mockFirestore.query)
export const where = isMockMode ? mockFirestore.where : (realFirestore.where as typeof mockFirestore.where)
export const orderBy = isMockMode ? mockFirestore.orderBy : (realFirestore.orderBy as typeof mockFirestore.orderBy)
export const getDocs = isMockMode ? mockFirestore.getDocs : (realFirestore.getDocs as typeof mockFirestore.getDocs)
export const increment = isMockMode
  ? mockFirestore.increment
  : (realFirestore.increment as typeof mockFirestore.increment)

// --- Auth ---
export const createUserWithEmailAndPassword = isMockMode
  ? mockAuth.createUserWithEmailAndPassword
  : (realAuth.createUserWithEmailAndPassword as typeof mockAuth.createUserWithEmailAndPassword)
export const signInWithEmailAndPassword = isMockMode
  ? mockAuth.signInWithEmailAndPassword
  : (realAuth.signInWithEmailAndPassword as typeof mockAuth.signInWithEmailAndPassword)
export const signOutUser = isMockMode ? mockAuth.signOutUser : (realAuth.signOut as typeof mockAuth.signOutUser)
export const onAuthStateChangedCompat = isMockMode
  ? mockAuth.onAuthStateChanged
  : (realAuth.onAuthStateChanged as typeof mockAuth.onAuthStateChanged)

export async function updateAuthProfile(user: { uid: string }, patch: { displayName?: string }): Promise<void> {
  if (isMockMode) return mockAuth.updateAuthProfile(user as mockAuth.MockUser, patch)
  return realAuth.updateProfile(user as realAuth.User, patch)
}

export async function signInWithGoogleRedirect(authInstance: unknown): Promise<void> {
  if (isMockMode) return mockAuth.signInWithGoogleRedirect(authInstance)
  const provider = new realAuth.GoogleAuthProvider()
  await realAuth.signInWithRedirect(authInstance as realAuth.Auth, provider)
}

export async function getGoogleRedirectResult(authInstance: unknown): Promise<{ uid: string } | null> {
  if (isMockMode) return mockAuth.getGoogleRedirectResult(authInstance)
  const result = await realAuth.getRedirectResult(authInstance as realAuth.Auth)
  return result?.user ?? null
}
```

- [ ] **Step 3: Apagar os arquivos do Supabase**

```bash
rm src/services/supabaseClient.ts src/services/mockDb.ts src/services/mockSupabase.ts supabase_schema.sql
```

- [ ] **Step 4: Rodar o typecheck**

Run: `npx tsc -b`
Expected: erros nos arquivos que ainda importam `supabaseClient`/`mockDb`/`mockSupabase` — são exatamente os arquivos das próximas tasks. Confirme que a lista de erros bate com: `authService.ts`, `authStore.ts`, `booksService.ts`, `logsService.ts`, `statsService.ts`, `SettingsScreen.tsx`, `SettingsScreen.test.tsx`, `MockModeBanner.tsx`, `useTodayLog.test.ts`. Não corrija ainda — isso é esperado até o fim da Task 8.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Adiciona firebaseClient.ts e remove os arquivos do Supabase"
```

---

### Task 4: `authService.ts`

**Files:**
- Modify: `src/services/authService.ts`
- Test: `src/services/authService.test.ts`

**Interfaces:**
- Consumes: `auth`, `db`, `doc`, `getDoc`, `setDoc`, `updateDoc`, `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `updateAuthProfile`, `signOutUser`, `signInWithGoogleRedirect`, `getGoogleRedirectResult` de `firebaseClient.ts` (Task 3).
- Produces: `signUp(email, password, name)`, `signIn(email, password)`, `signInWithGoogle()`, `consumeGoogleRedirectResult()`, `signOut()`, `getProfile(uid, fallbackName?)`, `updateProfile(uid, patch)` — mesmas assinaturas usadas por `authStore.ts` (Task 5).

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `src/services/authService.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { getProfile, signUp, updateProfile } from './authService'
import { resetMockAuth } from './mockAuth'
import { resetMockFirestore } from './mockFirestore'

afterEach(() => {
  resetMockAuth()
  resetMockFirestore()
})

describe('authService.getProfile', () => {
  it('cria o documento com valores padrão se ainda não existir (1º login, ex.: Google)', async () => {
    const profile = await getProfile('user-x', 'Convidado do Google')
    expect(profile).toEqual({
      id: 'user-x',
      name: 'Convidado do Google',
      default_daily_goal: 10,
      theme: 'dark',
      sound_enabled: true,
      onboarded: false,
      created_at: expect.any(String),
    })
  })

  it('retorna o documento existente sem sobrescrever', async () => {
    await updateProfile('user-x', { name: 'Nome já salvo', onboarded: true })
    // getProfile deve ter criado o doc por baixo dos panos na chamada acima (updateProfile chama getProfile
    // internamente); confirme que a segunda leitura preserva o que foi salvo.
    const profile = await getProfile('user-x')
    expect(profile.name).toBe('Nome já salvo')
    expect(profile.onboarded).toBe(true)
  })
})

describe('authService.signUp', () => {
  it('cria a conta e o documento de usuário com o nome do formulário', async () => {
    const user = await signUp('ana@example.com', 'senha123', 'Ana')
    expect(user.email).toBe('ana@example.com')
    const profile = await getProfile(user.uid)
    expect(profile.name).toBe('Ana')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/services/authService.test.ts`
Expected: falha (o `authService.ts` atual ainda usa `supabaseClient`, que não existe mais; ou os exports não batem).

- [ ] **Step 3: Reescrever `src/services/authService.ts`**

```ts
import {
  auth,
  doc,
  db,
  getDoc,
  setDoc,
  updateDoc,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateAuthProfile,
  signOutUser,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
} from './firebaseClient'
import type { Profile } from '../types'

interface AppUserDocument {
  name: string
  default_daily_goal: number
  theme: 'dark' | 'light'
  sound_enabled: boolean
  onboarded: boolean
  created_at: string
  current_streak: number
  longest_streak: number
  total_pages_read: number
  xp: number
  level: number
  last_read_date: string | null
}

function defaultUserDocument(name: string): AppUserDocument {
  return {
    name,
    default_daily_goal: 10,
    theme: 'dark',
    sound_enabled: true,
    onboarded: false,
    created_at: new Date().toISOString(),
    current_streak: 0,
    longest_streak: 0,
    total_pages_read: 0,
    xp: 0,
    level: 1,
    last_read_date: null,
  }
}

export async function signUp(email: string, password: string, name: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateAuthProfile(user, { displayName: name })
  await setDoc(doc(db, 'users', user.uid), defaultUserDocument(name))
  return user
}

export async function signIn(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function signInWithGoogle() {
  await signInWithGoogleRedirect(auth)
}

/** Chamado uma vez, na inicialização do app, pra capturar erro do redirecionamento do Google. */
export async function consumeGoogleRedirectResult(): Promise<void> {
  await getGoogleRedirectResult(auth)
}

export async function signOut() {
  await signOutUser(auth)
}

/** Auto-curativo: se `users/{uid}` ainda não existir (1º login, inclusive via Google), cria com valores padrão. */
export async function getProfile(uid: string, fallbackName = ''): Promise<Profile> {
  const ref = doc(db, 'users', uid)
  const snapshot = await getDoc(ref)
  const data = snapshot.exists() ? (snapshot.data() as AppUserDocument) : defaultUserDocument(fallbackName)
  if (!snapshot.exists()) {
    await setDoc(ref, data)
  }
  return {
    id: uid,
    name: data.name,
    default_daily_goal: data.default_daily_goal,
    theme: data.theme,
    sound_enabled: data.sound_enabled,
    onboarded: data.onboarded,
    created_at: data.created_at,
  }
}

export async function updateProfile(uid: string, patch: Partial<Profile>): Promise<Profile> {
  await getProfile(uid) // garante que o documento já existe antes do update
  const { id: _id, ...rest } = patch
  await updateDoc(doc(db, 'users', uid), rest)
  return getProfile(uid)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/services/authService.test.ts`
Expected: 3 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/services/authService.ts src/services/authService.test.ts
git commit -m "Reescreve authService sobre o Firebase Auth/Firestore"
```

---

### Task 5: `authStore.ts` + renomeação `session` → `user` em todo o app

**Files:**
- Modify: `src/types/index.ts` (adiciona `AppUser`)
- Modify: `src/store/authStore.ts`
- Modify: `src/hooks/useBooks.ts`, `src/hooks/useStats.ts`, `src/hooks/useTodayLog.ts`
- Modify: `src/components/reading/TodayScreen.tsx`, `src/components/reading/BookFormModal.tsx`
- Modify: `src/components/dashboard/DashboardScreen.tsx`
- Modify: `src/components/settings/SettingsScreen.tsx`
- Modify: `src/components/layout/MockModeBanner.tsx`
- Modify: `src/hooks/useTodayLog.test.ts`
- Modify: `src/components/settings/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `signUp`, `signIn`, `signInWithGoogle`, `consumeGoogleRedirectResult`, `signOut`, `getProfile`, `updateProfile` de `authService.ts` (Task 4).
- Produces: `useAuthStore().user: AppUser | null` (era `session`), ação `signInWithGoogle()`.

- [ ] **Step 1: Adicionar `AppUser` em `src/types/index.ts`**

Adicione, perto da interface `Profile`:

```ts
export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
}
```

- [ ] **Step 2: Reescrever `src/store/authStore.ts`**

```ts
import { create } from 'zustand'
import type { AppUser, Profile } from '../types'
import { auth, onAuthStateChangedCompat } from '../services/firebaseClient'
import * as authService from '../services/authService'

interface AuthState {
  user: AppUser | null
  profile: Profile | null
  loading: boolean
  error: string | null
  init: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  completeOnboarding: (defaultDailyGoal: number) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      await authService.consumeGoogleRedirectResult()
    } catch (err) {
      set({ error: (err as Error).message })
    }

    onAuthStateChangedCompat(auth, async (user) => {
      const appUser: AppUser | null = user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null
      set({ user: appUser, loading: false })
      if (appUser) {
        const profile = await authService.getProfile(appUser.uid, appUser.displayName ?? '')
        set({ profile })
      } else {
        set({ profile: null })
      }
    })
  },

  signUp: async (email, password, name) => {
    set({ error: null })
    try {
      await authService.signUp(email, password, name)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  signIn: async (email, password) => {
    set({ error: null })
    try {
      await authService.signIn(email, password)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  signInWithGoogle: async () => {
    set({ error: null })
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  signOut: async () => {
    await authService.signOut()
    set({ user: null, profile: null })
  },

  refreshProfile: async () => {
    const user = get().user
    if (!user) return
    const profile = await authService.getProfile(user.uid)
    set({ profile })
  },

  completeOnboarding: async (defaultDailyGoal) => {
    const user = get().user
    if (!user) return
    const profile = await authService.updateProfile(user.uid, {
      default_daily_goal: defaultDailyGoal,
      onboarded: true,
    })
    set({ profile })
  },
}))
```

> Nota: o listener retornado por `onAuthStateChangedCompat` não é cancelado aqui pelo mesmo motivo de hoje (o app nunca desmonta o `useAuth()`); isso é o mesmo comportamento de antes, não uma regressão.

- [ ] **Step 3: Trocar `session` por `user` nos hooks**

`src/hooks/useBooks.ts` — troque:
```ts
const session = useAuthStore((s) => s.session)
```
por:
```ts
const user = useAuthStore((s) => s.user)
```
e, mais abaixo:
```ts
if (session) store.fetchBooks(session.user.id)
// ...
}, [session?.user.id])
```
por:
```ts
if (user) store.fetchBooks(user.uid)
// ...
}, [user?.uid])
```

`src/hooks/useStats.ts` — mesma troca (`session` → `user`, `session.user.id` → `user.uid`, `session?.user.id` → `user?.uid`) nas 2 chamadas (`fetchStats`, `fetchBadges`) e no array de dependências do `useEffect`.

`src/hooks/useTodayLog.ts` — troque:
```ts
const session = useAuthStore((s) => s.session)
```
por:
```ts
const user = useAuthStore((s) => s.user)
```
e:
```ts
if (!session || pagesRead <= 0) return null
```
por:
```ts
if (!user || pagesRead <= 0) return null
```
e:
```ts
const userId = session.user.id
```
por:
```ts
const userId = user.uid
```
e no array de dependências do `useCallback`, troque `session` por `user`.

- [ ] **Step 4: Trocar `session` por `user` nas telas**

`src/components/reading/TodayScreen.tsx`:
```ts
const session = useAuthStore((s) => s.session)
```
→
```ts
const user = useAuthStore((s) => s.user)
```
e:
```ts
if (session) fetchLogs(session.user.id)
// ...
}, [session?.user.id])
```
→
```ts
if (user) fetchLogs(user.uid)
// ...
}, [user?.uid])
```

`src/components/reading/BookFormModal.tsx`:
```ts
const session = useAuthStore((s) => s.session)
```
→
```ts
const user = useAuthStore((s) => s.user)
```
e:
```ts
if (!session) return
```
→
```ts
if (!user) return
```
e:
```ts
await addBook(session.user.id, newBook)
```
→
```ts
await addBook(user.uid, newBook)
```

`src/components/dashboard/DashboardScreen.tsx`:
```ts
const session = useAuthStore((s) => s.session)
```
→
```ts
const user = useAuthStore((s) => s.user)
```
e:
```ts
if (session) fetchLogs(session.user.id)
// ...
}, [session?.user.id])
```
→
```ts
if (user) fetchLogs(user.uid)
// ...
}, [user?.uid])
```

`src/components/settings/SettingsScreen.tsx` — troque a desestruturação:
```ts
const { profile, session, signOut, refreshProfile } = useAuthStore()
```
por:
```ts
const { profile, user, signOut, refreshProfile } = useAuthStore()
```
e todas as 5 ocorrências de `session.user.id`/`session?.user.email`/`if (!session)` no restante do arquivo por `user.uid`/`user?.email`/`if (!user)`. Também troque o import:
```ts
import { isMockMode } from '../../services/supabaseClient'
```
por:
```ts
import { isMockMode } from '../../services/firebaseClient'
```

`src/components/layout/MockModeBanner.tsx` — troque o import:
```ts
import { isMockMode } from '../../services/supabaseClient'
```
por:
```ts
import { isMockMode } from '../../services/firebaseClient'
```
e o texto do aviso:
```
Modo de teste local — seus dados ficam só neste navegador, nenhum Supabase é usado.
```
por:
```
Modo de teste local — seus dados ficam só neste navegador, nenhum Firebase é usado.
```

`src/App.tsx` — troque:
```ts
const { session, profile, loading } = useAuth()
```
por:
```ts
const { user, profile, loading } = useAuth()
```
e:
```ts
if (!session)
```
por:
```ts
if (!user)
```

- [ ] **Step 5: Ajustar os testes existentes**

`src/hooks/useTodayLog.test.ts` — troque o import e o tipo:
```ts
import type { Session } from '@supabase/supabase-js'
// ...
const fakeSession = { user: { id: 'user-1' } } as unknown as Session
```
por:
```ts
import type { AppUser } from '../types'
// ...
const fakeUser: AppUser = { uid: 'user-1', email: 'user@example.com', displayName: 'Usuário' }
```
e troque as duas ocorrências de `useAuthStore.setState({ session: ... })` por `useAuthStore.setState({ user: ... })` (usando `fakeUser`/`null`).

`src/components/settings/SettingsScreen.test.tsx` — troque:
```ts
vi.mock('../../services/supabaseClient', () => ({ isMockMode: true, supabase: {} }))
```
por:
```ts
vi.mock('../../services/firebaseClient', () => ({ isMockMode: true, auth: {}, db: {} }))
```

- [ ] **Step 6: Rodar o typecheck**

Run: `npx tsc -b`
Expected: sem erros relacionados a `session`/`Session`/`supabaseClient` (ainda vai haver erros em `booksService.ts`/`logsService.ts`/`statsService.ts` — são as próximas tasks).

- [ ] **Step 7: Rodar os testes já ajustados**

Run: `npx vitest run src/hooks/useTodayLog.test.ts src/components/settings/SettingsScreen.test.tsx`
Expected: os testes que não dependem de `booksService`/`logsService`/`statsService` passam; é esperado que `useTodayLog.test.ts` ainda falhe até a Task 8 (ele mocka `logsService`/`booksService`/`statsService`, que só terminam de mudar depois).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Renomeia authStore.session para user e integra Firebase Auth"
```

---

### Task 6: `booksService.ts` + `booksStore.ts` + `BookDetailModal.tsx`

**Files:**
- Modify: `src/services/booksService.ts`
- Test: `src/services/booksService.test.ts`
- Modify: `src/store/booksStore.ts`
- Modify: `src/store/booksStore.test.ts`
- Modify: `src/components/library/BookDetailModal.tsx`

**Interfaces:**
- Consumes: `db`, `doc`, `collection`, `getDoc`, `getDocs`, `addDoc`, `updateDoc`, `deleteDoc`, `query`, `orderBy` de `firebaseClient.ts` (Task 3).
- Produces: `listBooks(userId)`, `createBook(userId, book)`, `updateBook(userId, bookId, patch)`, `deleteBook(userId, bookId)` — **assinatura muda**: `updateBook`/`deleteBook` ganham `userId` como primeiro parâmetro.

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `src/services/booksService.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/services/booksService.test.ts`
Expected: falha (assinaturas antigas / import de `supabaseClient` inexistente).

- [ ] **Step 3: Reescrever `src/services/booksService.ts`**

```ts
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
  return { id: ref.path[ref.path.length - 1], user_id: userId, ...data }
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
```

> `updateBook` relê a lista inteira e filtra pelo id porque o `getDoc`/mock não devolve `created_at` fora de ordem de forma prática para um único doc sem outra ida ao banco a mais; é uma troca aceitável (mesmo número de idas ao banco que antes, já que o Supabase também fazia `.select().single()` depois do update).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/services/booksService.test.ts`
Expected: 4 testes passando.

- [ ] **Step 5: Atualizar `src/store/booksStore.ts`**

```ts
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
```

- [ ] **Step 6: Atualizar `src/store/booksStore.test.ts`**

Ajuste as chamadas de `fetchBooks('user-1')` — permanecem iguais (assinatura não mudou). Não precisa de outra mudança nesse arquivo, já que os testes existentes só cobrem `fetchBooks`.

- [ ] **Step 7: Atualizar `src/components/library/BookDetailModal.tsx`**

Adicione o import e o seletor do usuário:
```ts
import { useAuthStore } from '../../store/authStore'
```
dentro do componente, logo abaixo de `const removeBook = useBooksStore((s) => s.removeBook)`:
```ts
const user = useAuthStore((s) => s.user)
```
Troque:
```ts
async function setStatus(status: BookStatus) {
    if (!book) return
    setBusy(true)
    try {
      await editBook(book.id, {
        status,
        start_date: status === 'reading' && !book.start_date ? todayIsoDate() : book.start_date,
      })
    } finally {
      setBusy(false)
    }
  }
```
por:
```ts
async function setStatus(status: BookStatus) {
    if (!book || !user) return
    setBusy(true)
    try {
      await editBook(user.uid, book.id, {
        status,
        start_date: status === 'reading' && !book.start_date ? todayIsoDate() : book.start_date,
      })
    } finally {
      setBusy(false)
    }
  }
```
e troque:
```ts
async function handleDelete() {
    if (!book) return
    if (!confirm(`Remover "${book.title}" da sua biblioteca?`)) return
    setBusy(true)
    try {
      await removeBook(book.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }
```
por:
```ts
async function handleDelete() {
    if (!book || !user) return
    if (!confirm(`Remover "${book.title}" da sua biblioteca?`)) return
    setBusy(true)
    try {
      await removeBook(user.uid, book.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }
```

- [ ] **Step 8: Atualizar `src/components/reading/BookFormModal.tsx`**

Troque:
```ts
await editBook(book.id, {
          title,
          author,
          total_pages: totalPages,
          daily_goal: dailyGoal,
          cover_url: coverUrl,
        })
```
por:
```ts
await editBook(user.uid, book.id, {
          title,
          author,
          total_pages: totalPages,
          daily_goal: dailyGoal,
          cover_url: coverUrl,
        })
```
(o nome `user` já existe aqui desde a Task 5.)

- [ ] **Step 9: Atualizar `src/hooks/useTodayLog.ts`**

Troque:
```ts
const updatedBook = await booksService.updateBook(book.id, {
```
por:
```ts
const updatedBook = await booksService.updateBook(userId, book.id, {
```
(a variável `userId` já existe nessa função, definida como `const userId = user.uid`.)

- [ ] **Step 10: Rodar o typecheck e os testes**

Run: `npx tsc -b && npx vitest run src/services/booksService.test.ts src/store/booksStore.test.ts`
Expected: ambos passam sem erro de tipos.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Reescreve booksService/booksStore sobre o Firestore, com userId explícito"
```

---

### Task 7: `logsService.ts` com incremento atômico

**Files:**
- Modify: `src/services/logsService.ts`
- Test: `src/services/logsService.test.ts`

**Interfaces:**
- Consumes: `db`, `doc`, `collection`, `getDoc`, `getDocs`, `setDoc`, `query`, `where`, `orderBy`, `increment` de `firebaseClient.ts` (Task 3).
- Produces: `listLogs(userId, sinceDate?)`, `upsertTodayLog(userId, bookId, pagesRead)` — mesmas assinaturas de hoje.

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `src/services/logsService.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { listLogs, upsertTodayLog } from './logsService'
import { resetMockFirestore } from './mockFirestore'
import { todayIsoDate } from '../lib/date'

afterEach(() => {
  resetMockFirestore()
})

describe('logsService.upsertTodayLog', () => {
  it('cria o log de hoje na primeira chamada', async () => {
    const log = await upsertTodayLog('user-1', 'book-1', 10)
    expect(log.pages_read).toBe(10)
    expect(log.date).toBe(todayIsoDate())
    expect(log.book_id).toBe('book-1')
  })

  it('soma páginas em chamadas repetidas no mesmo dia (atômico via increment)', async () => {
    await upsertTodayLog('user-1', 'book-1', 10)
    const second = await upsertTodayLog('user-1', 'book-1', 5)
    expect(second.pages_read).toBe(15)
  })

  it('duas chamadas concorrentes não perdem incremento', async () => {
    await Promise.all([
      upsertTodayLog('user-1', 'book-1', 10),
      upsertTodayLog('user-1', 'book-1', 10),
    ])
    const [log] = await listLogs('user-1')
    expect(log.pages_read).toBe(20)
  })
})

describe('logsService.listLogs', () => {
  it('lista só os logs do usuário informado, ordenados por data', async () => {
    await upsertTodayLog('user-1', 'book-1', 10)
    await upsertTodayLog('user-2', 'book-9', 99)
    const logs = await listLogs('user-1')
    expect(logs).toHaveLength(1)
    expect(logs[0].pages_read).toBe(10)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/services/logsService.test.ts`
Expected: falha (import de `supabaseClient` inexistente / comportamento antigo).

- [ ] **Step 3: Reescrever `src/services/logsService.ts`**

```ts
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
  await setDoc(ref, { book_id: bookId, date, pages_read: increment(pagesRead) }, { merge: true })
  const snapshot = await getDoc(ref)
  const data = snapshot.data() as Omit<ReadingLog, 'id' | 'user_id'>
  return { id: docId, user_id: userId, ...data }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/services/logsService.test.ts`
Expected: 4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/services/logsService.ts src/services/logsService.test.ts
git commit -m "Reescreve logsService com increment atômico do Firestore"
```

---

### Task 8: `statsService.ts`

**Files:**
- Modify: `src/services/statsService.ts`
- Test: `src/services/statsService.test.ts`

**Interfaces:**
- Consumes: `db`, `doc`, `collection`, `getDoc`, `getDocs`, `updateDoc`, `setDoc` de `firebaseClient.ts` (Task 3).
- Produces: `getStats(userId)`, `saveStats(userId, patch)`, `listEarnedBadges(userId)`, `awardBadge(userId, badgeCode)` — mesmas assinaturas de hoje.

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `src/services/statsService.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { awardBadge, getStats, listEarnedBadges, saveStats } from './statsService'
import { getProfile } from './authService'
import { resetMockAuth } from './mockAuth'
import { resetMockFirestore } from './mockFirestore'

afterEach(() => {
  resetMockAuth()
  resetMockFirestore()
})

describe('statsService', () => {
  it('lê as estatísticas do documento criado por getProfile', async () => {
    await getProfile('user-1', 'Ana')
    const stats = await getStats('user-1')
    expect(stats).toEqual({
      user_id: 'user-1',
      current_streak: 0,
      longest_streak: 0,
      total_pages_read: 0,
      xp: 0,
      level: 1,
      last_read_date: null,
      updated_at: expect.any(String),
    })
  })

  it('salva e relê estatísticas atualizadas', async () => {
    await getProfile('user-1', 'Ana')
    await saveStats('user-1', { current_streak: 3, xp: 45 })
    const stats = await getStats('user-1')
    expect(stats.current_streak).toBe(3)
    expect(stats.xp).toBe(45)
  })

  it('concede uma badge de forma idempotente (sem erro se repetir)', async () => {
    await getProfile('user-1', 'Ana')
    await awardBadge('user-1', 'first_log')
    await awardBadge('user-1', 'first_log') // não deve lançar
    const badges = await listEarnedBadges('user-1')
    expect(badges).toHaveLength(1)
    expect(badges[0].badge_code).toBe('first_log')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/services/statsService.test.ts`
Expected: falha (import de `supabaseClient` inexistente).

- [ ] **Step 3: Reescrever `src/services/statsService.ts`**

```ts
import { db, doc, collection, getDoc, getDocs, updateDoc, setDoc } from './firebaseClient'
import type { UserBadge, UserStats } from '../types'

// Pressupõe que o documento users/{uid} já existe. Isso é garantido porque
// authStore.init() sempre chama authService.getProfile() (auto-curativo, cria
// o documento se faltar) antes de qualquer tela montar useStats()/fetchStats.
export async function getStats(userId: string): Promise<UserStats> {
  const snapshot = await getDoc(doc(db, 'users', userId))
  const data = snapshot.data() as Record<string, unknown>
  return {
    user_id: userId,
    current_streak: data.current_streak as number,
    longest_streak: data.longest_streak as number,
    total_pages_read: data.total_pages_read as number,
    xp: data.xp as number,
    level: data.level as number,
    last_read_date: (data.last_read_date as string | null) ?? null,
    updated_at: (data.updated_at as string) ?? (data.created_at as string),
  }
}

export async function saveStats(userId: string, patch: Partial<UserStats>): Promise<UserStats> {
  const { user_id: _userId, ...rest } = patch
  await updateDoc(doc(db, 'users', userId), { ...rest, updated_at: new Date().toISOString() })
  return getStats(userId)
}

export async function listEarnedBadges(userId: string): Promise<UserBadge[]> {
  const snapshot = await getDocs(collection(db, 'users', userId, 'badges'))
  return snapshot.docs.map((d) => ({
    user_id: userId,
    badge_code: d.id,
    earned_at: (d.data() as { earned_at: string }).earned_at,
  }))
}

/** Idempotente: conceder de novo uma badge já concedida só sobrescreve com o mesmo conteúdo, sem erro. */
export async function awardBadge(userId: string, badgeCode: string): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'badges', badgeCode), { earned_at: new Date().toISOString() })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/services/statsService.test.ts`
Expected: 3 testes passando.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx tsc -b && npx vitest run && npx oxlint`
Expected: typecheck limpo, todos os testes passando (incluindo `useTodayLog.test.ts`, que dependia de `booksService`/`logsService`/`statsService` já reescritos), lint limpo.

- [ ] **Step 6: Commit**

```bash
git add src/services/statsService.ts src/services/statsService.test.ts
git commit -m "Reescreve statsService sobre o Firestore"
```

---

### Task 9: Ligar "Continuar com Google" de verdade

**Files:**
- Modify: `src/components/auth/AuthScreen.tsx`

**Interfaces:**
- Consumes: `useAuthStore().signInWithGoogle()` (Task 5), `isMockMode` de `firebaseClient.ts` (Task 3).

- [ ] **Step 1: Atualizar `src/components/auth/AuthScreen.tsx`**

Troque o import:
```ts
import { useAuthStore } from '../../store/authStore'
```
por:
```ts
import { useAuthStore } from '../../store/authStore'
import { isMockMode } from '../../services/firebaseClient'
```

Troque:
```ts
const { signIn, signUp } = useAuthStore()
```
por:
```ts
const { signIn, signUp, signInWithGoogle } = useAuthStore()
```

Troque a função placeholder:
```ts
async function handleGoogleSignIn() {
    setError(null)
    setGoogleSubmitting(true)
    try {
      // TODO: liga de verdade quando a migração para Firebase Auth estiver pronta.
      await new Promise((resolve) => setTimeout(resolve, 600))
      setError('Login com Google ainda não está ligado — chega junto com a migração para o Firebase.')
    } finally {
      setGoogleSubmitting(false)
    }
  }
```
por:
```ts
async function handleGoogleSignIn() {
    setError(null)
    setGoogleSubmitting(true)
    try {
      await signInWithGoogle()
      // Em caso de sucesso, a página redireciona para o Google — não há o que fazer depois daqui.
    } catch (err) {
      setError((err as Error).message || 'Não foi possível continuar com o Google.')
      setGoogleSubmitting(false)
    }
  }
```

Envolva o botão do Google e o divisor "ou" numa checagem de `!isMockMode`, trocando:
```tsx
<Button
        variant="secondary"
        fullWidth
        onClick={handleGoogleSignIn}
        disabled={googleSubmitting}
        className="mb-4"
      >
        <GoogleIcon />
        {googleSubmitting ? 'Aguarde...' : 'Continuar com Google'}
      </Button>

      <div className="mb-4 flex items-center gap-3 text-xs text-text-muted">
        <div className="h-px flex-1 bg-border" />
        ou
        <div className="h-px flex-1 bg-border" />
      </div>
```
por:
```tsx
{!isMockMode && (
        <>
          <Button
            variant="secondary"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={googleSubmitting}
            className="mb-4"
          >
            <GoogleIcon />
            {googleSubmitting ? 'Aguarde...' : 'Continuar com Google'}
          </Button>

          <div className="mb-4 flex items-center gap-3 text-xs text-text-muted">
            <div className="h-px flex-1 bg-border" />
            ou
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
```

- [ ] **Step 2: Rodar o typecheck e o lint**

Run: `npx tsc -b && npx oxlint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthScreen.tsx
git commit -m "Liga o login com Google de verdade e o esconde em modo mock"
```

---

### Task 10: Regras de segurança, README e `package.json`

**Files:**
- Create: `firestore.rules`
- Modify: `README.md`
- Modify: `package.json` (conferência final de dependências)

**Interfaces:** nenhuma (documentação e configuração).

- [ ] **Step 1: Criar `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 2: Atualizar `README.md`**

Troque a seção `### Usando Supabase de verdade` por:

```markdown
### Usando Firebase de verdade

Quando quiser persistência real (múltiplos dispositivos, backup na nuvem, login com Google):

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com).
2. Em **Authentication → Sign-in method**, ative os provedores **E-mail/senha** e **Google** (o Google é um único toggle — o Firebase provisiona o client OAuth sozinho, não precisa mexer no Google Cloud Console).
3. Em **Firestore Database**, crie o banco (modo produção) e cole o conteúdo de `firestore.rules` na aba **Regras**.
4. Em **Configurações do projeto → Seus apps**, crie um app Web e copie as credenciais.
5. No `.env`, remova/comente `VITE_USE_MOCK=true` e preencha as 6 variáveis `VITE_FIREBASE_*` (veja `.env.example`).
6. Reinicie `npm run dev`.
```

Também troque, no topo do README, a menção "Supabase (Postgres + Auth)" por "Firebase (Firestore + Auth)" na stack, e no parágrafo de segurança, troque a frase sobre RLS por algo como: "Regras de segurança do Firestore amarradas a `request.auth.uid` (cada usuário só acessa a própria árvore de documentos)."

- [ ] **Step 3: Conferir `package.json`**

Confirme que `@supabase/supabase-js` não aparece mais e `firebase` está presente (já feito na Task 1, aqui é só conferência):

Run: `grep -n "supabase\|firebase" package.json`
Expected: só a linha de `"firebase": "..."` aparece.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules README.md package.json
git commit -m "Adiciona firestore.rules e atualiza documentação para Firebase"
```

---

### Task 11: Verificação final

**Files:** nenhum arquivo novo — só verificação.

- [ ] **Step 1: Suíte completa**

Run: `npx tsc -b && npx vitest run && npx oxlint && npx vite build`
Expected: tudo passa sem erro; build de produção gerado em `dist/`.

- [ ] **Step 2: Checagem visual no navegador (modo mock)**

```bash
npm run dev
```

Abra `http://localhost:5173` e confirme manualmente (ou repita o roteiro de Playwright já usado nas rodadas anteriores desta sessão):
- Criar conta por e-mail/senha → onboarding → tela Hoje.
- Botão "Continuar com Google" **não aparece** (modo mock).
- Adicionar um livro, registrar leitura, ver o streak/XP/badge.
- Biblioteca, Conquistas e Ajustes carregam sem erro no console.
- Exportar backup (Ajustes) ainda funciona.
- Sair e entrar de novo com a mesma conta — dados persistem.

- [ ] **Step 3: Commit final (se algo foi ajustado na checagem)**

```bash
git add -A
git commit -m "Ajustes finais da migração para Firebase"
```

> A partir daqui, testar o login com Google de verdade e a persistência real no Firestore só é possível depois que o dono do projeto configurar um projeto Firebase real (Task 10, passos 1-5) e desligar `VITE_USE_MOCK` — isso é um teste manual, fora do que a suíte automatizada consegue cobrir.
