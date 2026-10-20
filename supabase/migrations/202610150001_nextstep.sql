-- Fresh Supabase project. Run the entire file in the SQL editor; safe to re-run.
begin;
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', first_name text not null default '',
  last_name text not null default '', phone text not null default '',
  location text not null default '', skills text[] not null default '{}',
  photo_path text, skills_embedding extensions.vector(1536), embedding_model text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique, original_name text not null,
  mime_type text not null default 'application/pdf', size_bytes bigint not null check(size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);
create index if not exists resumes_owner_date_idx on public.resumes(user_id, created_at desc);
create table if not exists public.jobs (
  id text primary key, title text not null, company_name text not null default '',
  job_url text, search_text text not null default '', data jsonb not null default '{}',
  embedding extensions.vector(1536), embedding_model text,
  updated_at timestamptz not null default now()
);
create index if not exists jobs_search_idx on public.jobs using gin(to_tsvector('english', search_text));
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id text not null references public.jobs(id), job_snapshot jsonb not null,
  status text not null default 'Saved' check(status in ('Saved', 'Withdrawn')),
  notes text not null default '', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(user_id, job_id)
);
create index if not exists applications_owner_date_idx on public.applications(user_id, created_at desc);
create table if not exists public.rejected_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id text not null references public.jobs(id), job_snapshot jsonb not null,
  created_at timestamptz not null default now(), unique(user_id, job_id)
);
create table if not exists public.rag_documents (
  collection text not null, id text not null, content text not null,
  metadata jsonb not null default '{}', embedding extensions.vector(768) not null,
  embedding_model text not null, primary key(collection, id)
);
create table if not exists public.rag_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id text not null, feedback text not null check(feedback in ('positive','negative')),
  query text not null, comment text, created_at timestamptz not null default now()
);

create or replace function public.create_nextstep_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, phone)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')) on conflict(id) do nothing;
  return new;
end; $$;
revoke all on function public.create_nextstep_profile() from public, anon, authenticated;
drop trigger if exists nextstep_auth_profile on auth.users;
create trigger nextstep_auth_profile after insert on auth.users
for each row execute function public.create_nextstep_profile();
insert into public.profiles(id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '') from auth.users
on conflict(id) do nothing;

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.rejected_jobs enable row level security;
alter table public.rag_documents enable row level security;
alter table public.rag_feedback enable row level security;
drop policy if exists profile_owner on public.profiles;
create policy profile_owner on public.profiles for all to authenticated
using(id = (select auth.uid())) with check(id = (select auth.uid()));
drop policy if exists resumes_owner on public.resumes;
create policy resumes_owner on public.resumes for all to authenticated
using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()) and storage_path like (select auth.uid())::text || '/%');
drop policy if exists applications_owner on public.applications;
create policy applications_owner on public.applications for all to authenticated
using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
drop policy if exists rejected_owner on public.rejected_jobs;
create policy rejected_owner on public.rejected_jobs for all to authenticated
using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
drop policy if exists feedback_owner on public.rag_feedback;
create policy feedback_owner on public.rag_feedback for all to authenticated
using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
drop policy if exists jobs_public_read on public.jobs;
create policy jobs_public_read on public.jobs for select to anon, authenticated using(true);
-- Documentation is public help content; ingestion is server-only.
drop policy if exists docs_public_read on public.rag_documents;
create policy docs_public_read on public.rag_documents for select to anon, authenticated using(true);
revoke all on public.profiles, public.resumes, public.applications, public.rejected_jobs, public.rag_feedback, public.jobs, public.rag_documents from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.resumes, public.applications, public.rejected_jobs, public.rag_feedback to authenticated;
-- Keep the original job snapshot immutable even through direct Data API calls.
revoke update on public.applications from authenticated;
grant update(status, notes, updated_at) on public.applications to authenticated;
grant select on public.jobs, public.rag_documents to anon, authenticated;
grant all on public.profiles, public.resumes, public.applications, public.rejected_jobs, public.rag_feedback, public.jobs, public.rag_documents to service_role;

create or replace function public.match_jobs(query_embedding extensions.vector(1536), model text, match_count int default 30)
returns table(id text, title text, company_name text, job_url text, data jsonb, score double precision)
language sql stable security invoker set search_path = '' as $$
  select j.id, j.title, j.company_name, j.job_url, j.data,
    1 - (j.embedding operator(extensions.<=>) query_embedding) as score
  from public.jobs j where j.embedding_model = model and j.embedding is not null
  order by j.embedding operator(extensions.<=>) query_embedding limit greatest(1, least(match_count, 100));
$$;
create or replace function public.match_documents(query_embedding extensions.vector(768), model text, collection_name text, match_count int default 5)
returns table(id text, content text, metadata jsonb, distance double precision, score double precision)
language sql stable security invoker set search_path = '' as $$
  select d.id, d.content, d.metadata, d.embedding operator(extensions.<=>) query_embedding,
    1 - (d.embedding operator(extensions.<=>) query_embedding)
  from public.rag_documents d where d.embedding_model = model and d.collection = collection_name
  order by d.embedding operator(extensions.<=>) query_embedding limit greatest(1, least(match_count, 100));
$$;
revoke all on function public.match_jobs(extensions.vector, text, int) from public;
revoke all on function public.match_documents(extensions.vector, text, text, int) from public;
grant execute on function public.match_jobs(extensions.vector, text, int) to anon, authenticated, service_role;
grant execute on function public.match_documents(extensions.vector, text, text, int) to anon, authenticated, service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('resumes', 'resumes', false, 10485760, array['application/pdf']),
      ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists nextstep_files_owner on storage.objects;
create policy nextstep_files_owner on storage.objects for all to authenticated
using(bucket_id in ('resumes','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text)
with check(bucket_id in ('resumes','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
