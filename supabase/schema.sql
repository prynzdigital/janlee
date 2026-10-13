-- Interiors by JanLee — CRM database
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it only creates what's missing.
--
-- Security model: Row Level Security is ON for every table and the ONLY account allowed
-- to read or write is the admin email in public.crm_admins. Website enquiries are inserted
-- by the server function (api/lead.js) using the service-role key, which bypasses RLS.

create extension if not exists "pgcrypto";

-- ---------- admin allow-list ----------
create table if not exists public.crm_admins (
  email text primary key
);
insert into public.crm_admins (email) values ('interiorsbyjanlee@gmail.com')
  on conflict do nothing;

create or replace function public.is_crm_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crm_admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- ---------- tables ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  address text check (address is null or char_length(address) <= 300),
  notes text check (notes is null or char_length(notes) <= 5000),
  lead_id uuid
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  zip text check (zip is null or char_length(zip) <= 10),
  project_type text check (project_type is null or char_length(project_type) <= 80),
  message text check (message is null or char_length(message) <= 5000),
  source text not null default 'website' check (source in ('website','referral','phone','email','social','repeat','other')),
  stage text not null default 'new' check (stage in ('new','contacted','consultation','proposal','won','lost')),
  value numeric(12,2) check (value is null or value >= 0),
  lost_reason text check (lost_reason is null or char_length(lost_reason) <= 300),
  next_follow_up date,
  client_id uuid references public.clients(id) on delete set null
);
create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (lower(email));

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  status text not null default 'planning' check (status in ('planning','design','in_progress','on_hold','completed')),
  budget numeric(12,2) check (budget is null or budget >= 0),
  start_date date,
  target_date date,
  completed_date date,
  notes text check (notes is null or char_length(notes) <= 5000)
);
create index if not exists projects_client_idx on public.projects (client_id);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'note' check (kind in ('note','call','email','meeting','stage')),
  body text not null check (char_length(body) between 1 and 5000),
  lead_id uuid references public.leads(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade
);
create index if not exists activities_lead_idx on public.activities (lead_id, created_at desc);
create index if not exists activities_client_idx on public.activities (client_id, created_at desc);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 200),
  due_date date,
  done boolean not null default false,
  completed_at timestamptz,
  lead_id uuid references public.leads(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade
);
create index if not exists tasks_due_idx on public.tasks (done, due_date);

-- clients.lead_id FK (added after leads exists)
do $$ begin
  alter table public.clients add constraint clients_lead_fk foreign key (lead_id) references public.leads(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['leads','clients','projects'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- Row Level Security: admin only ----------
do $$ declare t text; begin
  foreach t in array array['leads','clients','projects','activities','tasks','crm_admins'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_all on public.%I', t);
  end loop;
  foreach t in array array['leads','clients','projects','activities','tasks'] loop
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin())', t);
  end loop;
end $$;
-- crm_admins has RLS on and no policies: nobody can read/change it from the browser.

-- No access at all for anonymous visitors (the website form goes through api/lead.js).
revoke all on public.leads, public.clients, public.projects, public.activities, public.tasks, public.crm_admins from anon;
