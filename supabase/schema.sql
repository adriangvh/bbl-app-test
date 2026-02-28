-- Run this in Supabase SQL Editor

create table if not exists public.audit_companies (
  id text primary key,
  name text not null,
  company_group text not null,
  organization_number text not null,
  organization_type text not null,
  responsible_partner text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_tasks (
  id text primary key,
  company_id text not null references public.audit_companies(id) on delete cascade,
  task_number text not null,
  task text not null,
  description text not null,
  robot_processed boolean not null default false,
  status text not null,
  comment text not null default '',
  evidence text not null default '',
  last_updated date not null,
  created_at timestamptz not null default now(),
  unique (company_id, task_number)
);

create index if not exists audit_tasks_company_idx on public.audit_tasks(company_id);
create index if not exists audit_tasks_company_task_no_idx on public.audit_tasks(company_id, task_number);

create table if not exists public.audit_locks (
  company_id text primary key references public.audit_companies(id) on delete cascade,
  actor_id text not null,
  actor_name text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists audit_locks_expires_idx on public.audit_locks(expires_at);

create or replace function public.set_updated_at_audit_locks()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_audit_locks on public.audit_locks;
create trigger trg_set_updated_at_audit_locks
before update on public.audit_locks
for each row
execute function public.set_updated_at_audit_locks();
