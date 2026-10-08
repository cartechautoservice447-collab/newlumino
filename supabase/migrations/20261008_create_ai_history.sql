create table if not exists public.ai_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null check (tool in ('learning_lab','note_polisher','exam_simulator','progressive_exam','flashcards')),
  title text not null,
  subtitle text not null default '',
  action text not null default 'generated',
  context jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_history_user_tool_created_idx on public.ai_history (user_id, tool, created_at desc);
create index if not exists ai_history_user_created_idx on public.ai_history (user_id, created_at desc);
alter table public.ai_history enable row level security;
revoke all on table public.ai_history from anon;
revoke all on table public.ai_history from authenticated;
grant select, insert, update, delete on table public.ai_history to authenticated;

create policy "AI history can be viewed by owner" on public.ai_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "AI history can be created by owner" on public.ai_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "AI history can be updated by owner" on public.ai_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "AI history can be deleted by owner" on public.ai_history for delete to authenticated using ((select auth.uid()) = user_id);