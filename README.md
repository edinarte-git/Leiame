# Leiame — Leitura Diária

App PWA para cadastrar livros e criar o hábito de ler um pouco todo dia, com streaks, XP, níveis e conquistas para manter o incentivo.

Inspirado no projeto original [`edinarte-git/Leiame`](https://github.com/edinarte-git/Leiame), reconstruído com foco em:

- **Gamificação real**: streak diário, heatmap de leitura (estilo GitHub), XP/níveis e badges por marcos.
- **Segurança correta**: regras de segurança do Firestore amarradas a `request.auth.uid` (cada usuário só acessa a própria árvore de documentos).
- **Arquitetura mais limpa**: estado dividido em stores Zustand (em vez de um `Context` monolítico) e lógica de negócio pura, testada com Vitest.

## Stack

React 19 + TypeScript + Vite · Firebase (Firestore + Auth) · Zustand · Tailwind CSS v4 · vite-plugin-pwa · Vitest

## Rodando localmente

```bash
npm install
npm run dev
```

Por padrão o app roda em **modo de teste local** (`VITE_USE_MOCK=true` no `.env`): nenhuma credencial Firebase é necessária, e todos os dados (usuários, livros, streak, XP, badges) ficam salvos no `localStorage` do próprio navegador. É a forma mais rápida de experimentar o app inteiro antes de decidir usar Firebase de verdade. Um banner amarelo no topo do app confirma quando esse modo está ativo, e em **Ajustes** há um botão para limpar os dados de teste e recomeçar.

### Usando Firebase de verdade

Quando quiser persistência real (múltiplos dispositivos, backup na nuvem, login com Google):

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com).
2. Em **Authentication → Sign-in method**, ative pelo menos o provedor **Google** (é um único toggle — o Firebase provisiona o client OAuth sozinho, não precisa mexer no Google Cloud Console). O provedor de e-mail/senha existe no código, mas a tela de login só mostra o botão do Google fora do modo mock.
3. Em **Firestore Database**, crie o banco (modo produção) e cole o conteúdo de `firestore.rules` na aba **Regras**.
4. Em **Configurações do projeto → Seus apps**, crie um app Web e copie as credenciais.
5. No `.env`, remova/comente `VITE_USE_MOCK=true` e preencha as 6 variáveis `VITE_FIREBASE_*` (veja `.env.example`).
6. Reinicie `npm run dev`.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (type-check + Vite build)
- `npm run test` — testes unitários (Vitest)
- `npm run lint` — lint (oxlint)
- `npm run preview` — pré-visualiza o build de produção

## Deploy

Deploy gratuito na [Vercel](https://vercel.com): conecte o repositório e adicione as 6 variáveis `VITE_FIREBASE_*` nas variáveis de ambiente do projeto.

## Escopo atual (MVP)

Auth, cadastro de livros, registro diário de leitura, recálculo automático de prazo sem penalidade, streak, XP/níveis, badges, heatmap de leitura, PWA instalável.

**Backlog (fora do MVP)**: scanner de capa por OCR, marca-texto/anotações por voz, sincronização offline-first com fila de conflitos, notificações push reais, recomendações de livros, exportação de dados, leaderboard social.
