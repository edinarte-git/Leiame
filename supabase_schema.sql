-- Leiame 2.0 — schema do Supabase
-- Execute no SQL Editor do seu projeto Supabase.
-- Todas as tabelas usam RLS real (auth.uid() = user_id), diferente do
-- schema original que usava políticas permissivas (USING (true)).

-- ---------------------------------------------------------------------
-- profiles: um registro por usuário autenticado (auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  default_daily_goal integer not null default 10 check (default_daily_goal > 0),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  sound_enabled boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- books
-- ---------------------------------------------------------------------
create type public.book_status as enum ('want_to_read', 'reading', 'paused', 'completed');

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null default '',
  cover_url text,
  total_pages integer not null check (total_pages > 0),
  pages_read integer not null default 0 check (pages_read >= 0),
  daily_goal integer not null check (daily_goal > 0),
  status public.book_status not null default 'want_to_read',
  start_date date,
  estimated_completion_date date,
  completed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books enable row level security;

create policy "books_select_own" on public.books
  for select using (auth.uid() = user_id);
create policy "books_insert_own" on public.books
  for insert with check (auth.uid() = user_id);
create policy "books_update_own" on public.books
  for update using (auth.uid() = user_id);
create policy "books_delete_own" on public.books
  for delete using (auth.uid() = user_id);

create index if not exists books_user_id_idx on public.books(user_id);
create index if not exists books_status_idx on public.books(status);

-- ---------------------------------------------------------------------
-- reading_logs: um registro por usuário/livro/dia
-- ---------------------------------------------------------------------
create table if not exists public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  date date not null default current_date,
  pages_read integer not null check (pages_read > 0),
  created_at timestamptz not null default now(),
  unique (user_id, book_id, date)
);

alter table public.reading_logs enable row level security;

create policy "reading_logs_select_own" on public.reading_logs
  for select using (auth.uid() = user_id);
create policy "reading_logs_insert_own" on public.reading_logs
  for insert with check (auth.uid() = user_id);
create policy "reading_logs_update_own" on public.reading_logs
  for update using (auth.uid() = user_id);
create policy "reading_logs_delete_own" on public.reading_logs
  for delete using (auth.uid() = user_id);

create index if not exists reading_logs_user_id_idx on public.reading_logs(user_id);
create index if not exists reading_logs_book_id_idx on public.reading_logs(book_id);
create index if not exists reading_logs_date_idx on public.reading_logs(date);

-- ---------------------------------------------------------------------
-- user_stats: streak, XP e nível agregados por usuário
-- ---------------------------------------------------------------------
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_pages_read integer not null default 0,
  xp integer not null default 0,
  level integer not null default 1,
  last_read_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "user_stats_select_own" on public.user_stats
  for select using (auth.uid() = user_id);
create policy "user_stats_insert_own" on public.user_stats
  for insert with check (auth.uid() = user_id);
create policy "user_stats_update_own" on public.user_stats
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- user_badges: conquistas desbloqueadas (definições ficam no código)
-- ---------------------------------------------------------------------
create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_code)
);

alter table public.user_badges enable row level security;

create policy "user_badges_select_own" on public.user_badges
  for select using (auth.uid() = user_id);
create policy "user_badges_insert_own" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Cria profile + user_stats automaticamente ao criar um novo usuário
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.user_stats (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
