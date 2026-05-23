-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS (multi-tenant root)
-- ============================================================
create table public.organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  plan        text not null default 'free', -- free | pro | enterprise
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================
create table public.organization_members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member', -- owner | admin | member
  invited_by  uuid references auth.users(id),
  joined_at   timestamptz not null default now(),
  unique(org_id, user_id)
);

-- ============================================================
-- USER PROFILES
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  email       text,
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table public.clients (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  company     text,
  avatar_url  text,
  status      text not null default 'active', -- active | paused | churned
  tags        text[] default '{}',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  description text,
  assignee_id uuid references auth.users(id),
  client_id   uuid references public.clients(id),
  status      text not null default 'todo', -- todo | in_progress | review | done
  priority    text not null default 'medium', -- low | medium | high | urgent
  due_date    date,
  tags        text[] default '{}',
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- PIPELINE
-- ============================================================
create table public.pipeline_stages (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  color       text not null default '#7c3aed',
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.pipeline_deals (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  stage_id    uuid not null references public.pipeline_stages(id),
  client_id   uuid references public.clients(id),
  title       text not null,
  value       numeric(12,2) default 0,
  probability int default 50, -- 0-100
  assignee_id uuid references auth.users(id),
  close_date  date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- MESSAGES / CONVERSATIONS
-- ============================================================
create table public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  client_id   uuid references public.clients(id),
  channel     text not null default 'internal', -- internal | whatsapp | instagram | email
  title       text,
  status      text not null default 'open', -- open | resolved | archived
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references auth.users(id),
  content         text not null,
  attachments     jsonb default '[]',
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================
create table public.calendar_events (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  description text,
  client_id   uuid references public.clients(id),
  assignee_id uuid references auth.users(id),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  all_day     boolean not null default false,
  color       text default '#7c3aed',
  type        text default 'event', -- event | deadline | meeting | post
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations          enable row level security;
alter table public.organization_members   enable row level security;
alter table public.profiles               enable row level security;
alter table public.clients                enable row level security;
alter table public.tasks                  enable row level security;
alter table public.pipeline_stages        enable row level security;
alter table public.pipeline_deals         enable row level security;
alter table public.conversations          enable row level security;
alter table public.messages               enable row level security;
alter table public.calendar_events        enable row level security;

-- Helper function: checks if current user is member of an org
create or replace function public.is_org_member(org_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.organization_members
    where organization_members.org_id = $1
      and organization_members.user_id = auth.uid()
  );
$$;

-- Profiles: users see and edit only their own
create policy "profiles_select" on public.profiles for select using (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());

-- Organizations: members can read
create policy "orgs_select" on public.organizations for select using (is_org_member(id));
create policy "orgs_update" on public.organizations for update using (
  exists (select 1 from public.organization_members
          where org_id = organizations.id and user_id = auth.uid() and role in ('owner','admin'))
);

-- Organization members
create policy "members_select" on public.organization_members for select using (is_org_member(org_id));
create policy "members_insert" on public.organization_members for insert with check (
  exists (select 1 from public.organization_members m
          where m.org_id = org_id and m.user_id = auth.uid() and m.role in ('owner','admin'))
  or user_id = auth.uid() -- allow self-join on invite
);
create policy "members_delete" on public.organization_members for delete using (
  user_id = auth.uid() or
  exists (select 1 from public.organization_members m
          where m.org_id = org_id and m.user_id = auth.uid() and m.role in ('owner','admin'))
);

-- Clients
create policy "clients_all" on public.clients for all using (is_org_member(org_id));

-- Tasks
create policy "tasks_all" on public.tasks for all using (is_org_member(org_id));

-- Pipeline
create policy "pipeline_stages_all" on public.pipeline_stages for all using (is_org_member(org_id));
create policy "pipeline_deals_all" on public.pipeline_deals for all using (is_org_member(org_id));

-- Conversations & Messages
create policy "conversations_all" on public.conversations for all using (is_org_member(org_id));
create policy "messages_select" on public.messages for select using (
  exists (select 1 from public.conversations c
          where c.id = conversation_id and is_org_member(c.org_id))
);
create policy "messages_insert" on public.messages for insert with check (
  exists (select 1 from public.conversations c
          where c.id = conversation_id and is_org_member(c.org_id))
);

-- Calendar
create policy "calendar_all" on public.calendar_events for all using (is_org_member(org_id));

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
