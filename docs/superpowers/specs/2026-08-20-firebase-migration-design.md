# Migração de Supabase para Firebase

**Data:** 2026-08-20
**Status:** aprovado para planejamento de implementação

## Contexto e motivação

O app Leiame (PWA de hábito de leitura) foi construído sobre Supabase (Postgres +
Auth + RLS), ainda em modo de teste local (`VITE_USE_MOCK=true`, sem projeto
Supabase real configurado — nenhum dado de produção existe hoje). O dono do
projeto quer adicionar "Entrar com sua conta Google" e decidiu que prefere usar
o Firebase (Google) como plataforma de backend em vez de configurar o provedor
Google dentro do Supabase.

Isso implica trocar toda a camada de backend: autenticação (Supabase Auth →
Firebase Auth) e banco de dados (Postgres/RLS → Firestore/Security Rules).

## Objetivos

- Login por e-mail/senha **e** por conta Google, via Firebase Auth.
- Todos os dados hoje em Postgres (perfil, livros, logs de leitura, streak/XP/nível,
  badges) passam a viver no Firestore, com o mesmo modelo de segurança "cada
  usuário só acessa os próprios dados" que o RLS garantia.
- Preservar o "modo de teste local" (sem nenhuma credencial de nuvem) que o app
  tem hoje, com o mesmo espírito: zero setup, tudo em localStorage.
- Não regredir nenhum comportamento existente (streak, XP, badges, PWA, etc.) e,
  onde a migração permitir, corrigir de graça dois itens já conhecidos de uma
  auditoria anterior: a corrida em `upsertTodayLog` e o listener de auth sem
  cleanup.

## Não-objetivos

- Não há dados de produção para migrar (projeto ainda não foi lançado).
- Não vamos introduzir Cloud Functions/backend próprio — tudo client-side com
  Security Rules, como o app já funciona hoje (client-side com RLS).
- Não vamos trocar o hospedeiro do front-end (continua Vercel); só as variáveis
  de ambiente mudam.
- Não vamos usar o Firebase Emulator Suite — o modo de teste local continua
  sendo um shim próprio em localStorage (`mockFirebase`), como o `mockSupabase`
  de hoje.

## Modelo de dados (Firestore)

```
users/{uid}
  name: string
  defaultDailyGoal: number
  theme: 'dark' | 'light'
  soundEnabled: boolean
  onboarded: boolean
  currentStreak: number
  longestStreak: number
  totalPagesRead: number
  xp: number
  level: number
  lastReadDate: string | null   // YYYY-MM-DD, local (ver localIsoDate)

users/{uid}/books/{bookId}        # bookId gerado pelo Firestore
  title, author, coverUrl, totalPages, pagesRead, dailyGoal, status,
  startDate, estimatedCompletionDate, completedDate, createdAt, updatedAt

users/{uid}/readingLogs/{bookId}_{date}   # ID determinístico: "<bookId>_<YYYY-MM-DD>"
  bookId: string
  date: string
  pagesRead: number

users/{uid}/badges/{badgeCode}    # ID = o próprio código do badge
  earnedAt: timestamp
```

Perfil e estatísticas (hoje `profiles` + `user_stats`) ficam **no mesmo
documento** `users/{uid}` — não há razão para dois documentos quando não há
custo de "join" no Firestore; `authService` e `statsService` continuam como
módulos separados, cada um lendo/gravando só os campos que lhe dizem respeito
no mesmo documento.

**Nomenclatura de campos:** os nomes acima (`defaultDailyGoal`,
`totalPagesRead` etc.) são o formato idiomático do Firestore (camelCase), mas
os tipos `Profile`/`Book`/`ReadingLog`/`UserStats` em `types/index.ts`
continuam em snake_case exatamente como hoje (`default_daily_goal`,
`total_pages_read`...) — **sem renomear nada ali**. A tradução camelCase
(Firestore) ↔ snake_case (tipos do app) acontece só dentro de cada função de
`services/*.ts`, na hora de montar o objeto a gravar e ao ler de volta. Isso é
o que mantém `logic/`, `store/` e as telas completamente intocadas por esta
migração, fora dos pontos já listados explicitamente.

**Por que ID determinístico no log:** permite que `upsertTodayLog` vire uma
única escrita atômica com `pagesRead: increment(N)` via
`setDoc(ref, {...}, {merge: true})`, eliminando a janela de corrida do
"lê → soma → grava" atual (auditoria, item 7). Depois da escrita, uma leitura
de volta (`getDoc`) recupera o total salvo para atualizar a tela — mesmo
número de idas ao banco de hoje, sem a corrida.

**Por que badges por ID = código:** conceder de novo uma badge já ganha vira
uma escrita idempotente (mesmo documento, mesmo conteúdo), sem precisar tratar
"já existe" como erro (hoje o código ignora explicitamente o erro `23505` do
Postgres).

### Regras de segurança (`firestore.rules`)

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

## Autenticação

- **E-mail/senha:** `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`
  do Firebase Auth substituem as chamadas equivalentes do Supabase.
- **Google:** `signInWithRedirect(auth, googleProvider)` (mais confiável que
  popup dentro de um PWA instalado). `getRedirectResult(auth)` é chamado uma
  vez na inicialização só para capturar um erro amigável se o login falhar —
  o sucesso já é tratado pelo listener de sessão.
- **Criação do perfil:** sem trigger de banco (como o Postgres tinha),
  `authService.getProfile(uid)` fica "auto-curativo": se `users/{uid}` não
  existir, cria com valores padrão (nome do formulário no cadastro por
  e-mail, ou do `displayName` da conta Google no primeiro login social) e
  devolve. Cobre os dois métodos de login com a mesma lógica.
- **Renomeação:** `authStore.session` (tipo `Session` do Supabase) vira
  `authStore.user` (tipo `User` do `firebase/auth`). Como o formato muda de
  qualquer forma (`session.user.id` → `user.uid`), a renomeação aproveita os
  mesmos pontos de edição em ~9 arquivos (TodayScreen, DashboardScreen,
  SettingsScreen, BookFormModal, useBooks, useStats, useTodayLog, authStore,
  App.tsx) — troca mecânica, sem lógica nova.
- **`authStore.init()`** simplifica: uma única inscrição em
  `onAuthStateChanged` substitui o par `getSession()` + `onAuthStateChange`
  de hoje (o listener do Firebase já dispara com o estado atual). A função de
  cancelamento retornada passa a ser guardada, corrigindo o listener que hoje
  nunca é encerrado (auditoria, item 14).
- Botão "Continuar com Google" em `AuthScreen.tsx`, visível só quando
  `!isMockMode` (não existe um jeito real de simular OAuth do Google em modo
  local).

## Camada de serviços

| Arquivo | Mudança |
|---|---|
| `firebaseClient.ts` (novo, substitui `supabaseClient.ts`) | inicializa o app do Firebase; exporta `auth`, `db`, `isMockMode` (mesma lógica de hoje) |
| `authService.ts` | reescrito sobre `firebase/auth` + leitura/escrita de `users/{uid}` |
| `booksService.ts` | `listBooks`/`createBook` mantêm assinatura; `updateBook`/`deleteBook` ganham parâmetro `userId` (o Firestore exige o caminho completo, diferente do RLS de hoje) |
| `logsService.ts` | `upsertTodayLog` vira `setDoc` com `increment()` + leitura de volta (ver acima) |
| `statsService.ts` | `getStats`/`saveStats` leem/gravam `users/{uid}`; `awardBadge` vira escrita idempotente |
| `mockDb.ts` / `mockSupabase.ts` | substituídos por um `mockFirebase` equivalente (mesmo espírito: localStorage, zero setup, cobre só o que o app usa) |

`updateBook`/`deleteBook` ganhando `userId` encosta em 3 pontos de chamada:
`BookDetailModal` (ganha uma linha nova pra ler o usuário logado — hoje não
precisa disso), `BookFormModal` e `useTodayLog` (já têm o usuário em escopo, é
só repassar).

## Corte de migração

- `package.json`: sai `@supabase/supabase-js`, entra `firebase`.
- `.env` / `.env.example`: variáveis viram `VITE_FIREBASE_API_KEY`,
  `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
  `VITE_FIREBASE_APP_ID` (mantém `VITE_USE_MOCK`).
- `supabase_schema.sql` é removido; `firestore.rules` entra na raiz.
- `README.md`: nova seção "Usando Firebase de verdade" — criar projeto no
  Firebase Console, ativar os provedores de login (E-mail/senha + Google — no
  Firebase, ativar o Google é um toggle único, ele mesmo provisiona o client
  OAuth), criar o Firestore (modo produção) e colar as regras de
  `firestore.rules`.
- Deploy na Vercel não muda de fluxo — só as variáveis de ambiente
  configuradas lá trocam de Supabase para Firebase.

## Impacto nos testes

- `logic/*.test.ts` (streak, XP, calculadora, skills): inalterados — funções
  puras, sem dependência de backend.
- `store/booksStore.test.ts`, `statsStore.test.ts`, `logsStore.test.ts`: mesma
  estrutura (já mockam `services/*` no nível de função), só ajustando
  assinaturas onde mudarem (`updateBook`/`deleteBook`).
- `hooks/useTodayLog.test.ts`, `components/settings/SettingsScreen.test.tsx`:
  precisam trocar o mock de `Session`/`supabaseClient` pelo equivalente
  Firebase (`User`/`firebaseClient`).
- Novos testes: `getProfile` auto-curativo (cria o documento na primeira
  leitura), comportamento atômico de `upsertTodayLog` contra o `mockFirebase`,
  e um smoke test do próprio `mockFirebase`.
- Checagem visual manual no navegador (Playwright ad-hoc, como nas rodadas
  anteriores desta sessão): cadastro, login, registrar leitura, streak,
  badges — e, quando o dono do projeto configurar um projeto Firebase real,
  um teste manual do login com Google (não é algo que dá pra automatizar
  sem credenciais reais).

## Riscos e limitações conhecidas

- O login com Google só pode ser testado de ponta a ponta depois que o dono
  do projeto criar um projeto Firebase real e ativar o provedor — não há como
  simular OAuth de verdade em modo mock.
- `signInWithRedirect` faz uma navegação de página inteira; qualquer estado
  de UI não persistido antes do clique se perde (não é um problema aqui, já
  que o clique acontece na tela de login, sem nada em andamento).
- Trocar `updateBook`/`deleteBook` para exigir `userId` é uma mudança de
  assinatura "que quebra" (breaking) dentro do próprio código — mitigada por
  ser um projeto sem consumidores externos do `services/*`.
