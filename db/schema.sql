-- Interiors by JanLee — CRM database (Neon Postgres)
-- Applied with:  npm run db:migrate   (needs DATABASE_URL)
-- Safe to re-run: only creates what is missing.
-- Access model: the database is only reachable from the Vercel API functions (api/*), which
-- require JanLee's signed session for everything except saving a website enquiry.

create table if not exists clients (
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

create table if not exists leads (
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
  client_id uuid references clients(id) on delete set null
);
create index if not exists leads_stage_idx on leads (stage);
create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_email_idx on leads (lower(email));

do $$ begin
  alter table clients add constraint clients_lead_fk foreign key (lead_id) references leads(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  status text not null default 'planning' check (status in ('planning','design','in_progress','on_hold','completed')),
  budget numeric(12,2) check (budget is null or budget >= 0),
  start_date date,
  target_date date,
  completed_date date,
  notes text check (notes is null or char_length(notes) <= 5000)
);
create index if not exists projects_client_idx on projects (client_id);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'note' check (kind in ('note','call','email','meeting','stage')),
  body text not null check (char_length(body) between 1 and 5000),
  lead_id uuid references leads(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade
);
create index if not exists activities_lead_idx on activities (lead_id, created_at desc);
create index if not exists activities_client_idx on activities (client_id, created_at desc);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 200),
  due_date date,
  done boolean not null default false,
  completed_at timestamptz,
  lead_id uuid references leads(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade
);
create index if not exists tasks_due_idx on tasks (done, due_date);

-- uploaded files (stored in Vercel Blob; this row is the index)
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 200),
  content_type text not null check (char_length(content_type) <= 100),
  size integer not null check (size > 0),
  blob_url text not null,
  blob_pathname text not null,
  access text not null default 'private' check (access in ('private','public')),
  lead_id uuid references leads(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade
);
create index if not exists files_client_idx on files (client_id, created_at desc);
create index if not exists files_lead_idx on files (lead_id, created_at desc);

-- key/value settings: password hash, session version, profile
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- failed sign-in log for rate limiting
create table if not exists login_attempts (
  id bigserial primary key,
  at timestamptz not null default now(),
  ip text not null,
  ok boolean not null default false
);
create index if not exists login_attempts_ip_idx on login_attempts (ip, at desc);

-- keep updated_at fresh
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['leads','clients','projects'] loop
    execute format('drop trigger if exists touch_%1$s on %1$s', t);
    execute format('create trigger touch_%1$s before update on %1$s for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- notifications: website enquiries stay "unread" until opened in the CRM
alter table leads add column if not exists seen_at timestamptz;
create index if not exists leads_unseen_idx on leads (created_at desc) where seen_at is null;
