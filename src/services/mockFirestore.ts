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
  id: string
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
  return { __mockDocRef: true, path, id: path[path.length - 1] }
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
    id: ref.id,
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
  const id = generateId()
  const docRef: MockDocRef = { __mockDocRef: true, path: [...ref.path, id], id }
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
