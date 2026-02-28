-- Run this in Supabase SQL Editor

create table if not exists public.audit_companies (
  id text primary key,
  name text not null,
  company_group text not null,
  organization_number text not null,
  organization_type text not null,
  responsible_partner text not null,
  audit_stage text not null default 'First time auditing',
  signing_document text,
  created_at timestamptz not null default now()
);

alter table public.audit_companies
add column if not exists audit_stage text not null default 'First time auditing';

alter table public.audit_companies
add column if not exists overall_risk_assessed boolean,
add column if not exists fraud_risk_documented boolean,
add column if not exists controls_tested boolean,
add column if not exists partner_review_ready boolean,
add column if not exists task_due_date date,
add column if not exists signing_document text;

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

create table if not exists public.audit_activity_events (
  id bigint generated always as identity primary key,
  company_id text not null references public.audit_companies(id) on delete cascade,
  actor_id text not null,
  actor_name text not null,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_activity_events_company_created_idx
on public.audit_activity_events(company_id, created_at desc);

create table if not exists public.audit_presence (
  company_id text not null references public.audit_companies(id) on delete cascade,
  actor_id text not null,
  actor_name text not null,
  actor_role text not null,
  active_tab text not null,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, actor_id)
);

create index if not exists audit_presence_company_seen_idx
on public.audit_presence(company_id, last_seen_at desc);

create table if not exists public.audit_task_discussions (
  id bigint generated always as identity primary key,
  company_id text not null references public.audit_companies(id) on delete cascade,
  task_id text not null references public.audit_tasks(id) on delete cascade,
  author_actor_id text not null,
  author_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_task_discussions_company_task_created_idx
on public.audit_task_discussions(company_id, task_id, created_at asc);

create table if not exists public.audit_notifications (
  id bigint generated always as identity primary key,
  company_id text not null references public.audit_companies(id) on delete cascade,
  task_id text references public.audit_tasks(id) on delete cascade,
  recipient_name text not null,
  recipient_name_key text not null,
  sender_name text not null,
  notification_type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists audit_notifications_company_recipient_idx
on public.audit_notifications(company_id, recipient_name_key, is_read, created_at desc);

create table if not exists public.audit_users (
  actor_id text primary key,
  display_name text not null,
  name_key text not null unique,
  role text not null default 'auditor',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audit_users_name_key_idx
on public.audit_users(name_key);

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

create or replace function public.set_updated_at_audit_users()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_audit_users on public.audit_users;
create trigger trg_set_updated_at_audit_users
before update on public.audit_users
for each row
execute function public.set_updated_at_audit_users();
