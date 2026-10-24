-- Roast & Toast: database setup. Paste into Supabase > SQL Editor > New query > Run.
-- Safe to re-run: it replaces the rules and keeps your data.

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

-- Let the browser reach the tables. The rules in step 3 still decide which rows it can touch.
grant select, insert, update, delete on public.docs to anon, authenticated;
grant select on public.hosts to authenticated;

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

-- A guest may write an answer only to the live question, only while it is collecting and not
-- closed, and only under the id "<question>__<guest>" (or "<question>__<guest>__1" to "__5").
create or replace function public.guest_can_answer(doc_id text, d jsonb)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select s.data ->> 'qid' = d ->> 'q'
        and s.data ->> 'phase' = 'collect'
        and coalesce(s.data ->> 'locked', 'false') <> 'true'
     from public.docs s
     where s.col = 'game' and s.id = 'state')
    and d ->> 'g' ~ '^g[A-Za-z0-9]{1,40}$'
    and doc_id in (
      (d ->> 'q') || '__' || (d ->> 'g'),
      (d ->> 'q') || '__' || (d ->> 'g') || '__1',
      (d ->> 'q') || '__' || (d ->> 'g') || '__2',
      (d ->> 'q') || '__' || (d ->> 'g') || '__3',
      (d ->> 'q') || '__' || (d ->> 'g') || '__4',
      (d ->> 'q') || '__' || (d ->> 'g') || '__5'
    ),
    false);
$$;

grant execute on function public.is_host() to anon, authenticated;
grant execute on function public.guest_can_answer(text, jsonb) to anon, authenticated;

-- 3. Rules.
drop policy if exists docs_read    on public.docs;
drop policy if exists guest_insert on public.docs;
drop policy if exists guest_update on public.docs;
drop policy if exists host_all     on public.docs;
drop policy if exists hosts_self   on public.hosts;

-- Everyone (guests, TV, host) can read the game.
create policy docs_read on public.docs for select using (true);

-- Guests can write only their own answers to the live question and their own join record.
-- Guests cannot delete anything.
create policy guest_insert on public.docs for insert
  with check (
    (col = 'answers' and pg_column_size(data) < 2048 and public.guest_can_answer(id, data))
    or (col = 'guests' and id ~ '^g[A-Za-z0-9]{1,40}$' and pg_column_size(data) < 256)
  );
create policy guest_update on public.docs for update
  using (
    (col = 'answers' and public.guest_can_answer(id, data))
    or (col = 'guests' and id ~ '^g[A-Za-z0-9]{1,40}$')
  )
  with check (
    (col = 'answers' and pg_column_size(data) < 2048 and public.guest_can_answer(id, data))
    or (col = 'guests' and id ~ '^g[A-Za-z0-9]{1,40}$' and pg_column_size(data) < 256)
  );

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

-- 5. Photo storage: public to view, hosts only to upload or remove. Images up to 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists photos_read   on storage.objects;
drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_delete on storage.objects;
create policy photos_read   on storage.objects for select using (bucket_id = 'photos');
create policy photos_insert on storage.objects for insert with check (bucket_id = 'photos' and public.is_host());
create policy photos_delete on storage.objects for delete using (bucket_id = 'photos' and public.is_host());
