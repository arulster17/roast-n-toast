-- Roast & Toast: database setup. Paste into Supabase > SQL Editor > New query > Run.

-- 1. One table holds every document: config, game state, questions, answers, guests, moderation.
create table if not exists public.docs (
  col        text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);

-- 2. Who counts as a host. Add emails here after creating their login (see README).
create table if not exists public.hosts (
  email text primary key
);

alter table public.docs  enable row level security;
alter table public.hosts enable row level security;

create or replace function public.is_host()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hosts h
    where lower(h.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 3. Rules.
drop policy if exists docs_read    on public.docs;
drop policy if exists guest_insert on public.docs;
drop policy if exists guest_update on public.docs;
drop policy if exists host_all     on public.docs;
drop policy if exists hosts_self   on public.hosts;

-- Everyone (guests, TV, host) can read the game.
create policy docs_read on public.docs for select using (true);

-- Guests can add or change only answers and their own join record, and only small ones.
create policy guest_insert on public.docs for insert
  with check (col in ('answers', 'guests') and length(id) <= 200 and pg_column_size(data) < 2048);
create policy guest_update on public.docs for update
  using (col in ('answers', 'guests'))
  with check (col in ('answers', 'guests') and pg_column_size(data) < 2048);

-- Hosts can do everything: questions, theme, game state, moderation, deleting answers.
create policy host_all on public.docs for all
  using (public.is_host()) with check (public.is_host());

-- A signed-in person can see whether their own email is on the host list.
create policy hosts_self on public.hosts for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 4. Live updates.
do $$
begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;

-- 5. Photo storage: public to view, hosts only to upload or remove.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_read   on storage.objects;
drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_delete on storage.objects;
create policy photos_read   on storage.objects for select using (bucket_id = 'photos');
create policy photos_insert on storage.objects for insert with check (bucket_id = 'photos' and public.is_host());
create policy photos_delete on storage.objects for delete using (bucket_id = 'photos' and public.is_host());
