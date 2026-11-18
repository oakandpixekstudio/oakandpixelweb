-- =============================================================================
-- Oak & Pixel CRM workspace: one-time backend schema (Supabase / PostgreSQL)
-- =============================================================================
-- Built from a page-by-page scan of the CRM in /app (Overview, Clients, Client
-- workspace, Projects, Project board, Project workspace, Pipeline, Tasks, Task
-- workspace, Emails, Templates, Invoices, Invoice workspace, Reports, Website
-- Audit, Notifications, My profile, Settings (13 tabs), sign-in) plus the
-- planning docs in /app/docs.
--
-- NOT RUN YET. Paste into the Supabase SQL editor and run once, when ready.
--
-- WHERE IT LIVES
--   Everything is created in a dedicated schema called "crm". The existing
--   public schema already has tables named clients, projects, invoices,
--   services, messages and website_audits (migrations 001-026) with different
--   shapes, and the public website depends on some of them. A separate schema
--   avoids any clash. To use the "public" schema instead, search-and-replace
--   "crm." with "public." and drop the "create schema" line (only safe on a
--   fresh project).
--
-- AFTER RUNNING (manual steps, see the checklist at the bottom of this file)
--   1. Expose the crm schema to the API: Project Settings > API > Exposed schemas.
--   2. Create the first Owner member (SQL provided at the bottom).
--
-- RE-RUNNABLE: tables use IF NOT EXISTS, functions use CREATE OR REPLACE, and
-- triggers and policies are dropped and recreated. Seed rows use ON CONFLICT DO
-- NOTHING, so re-running never overwrites data you have changed.
-- =============================================================================

begin;

create schema if not exists crm;

-- -----------------------------------------------------------------------------
-- 0. Helpers
-- -----------------------------------------------------------------------------

create or replace function crm.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- "Trellis Capital" -> "TC" (same rule as the app: first letters of up to 2 words)
create or replace function crm.initials_of(value text) returns text
language sql immutable as $$
  select coalesce(
    (select upper(string_agg(left(w, 1), '' order by n))
       from regexp_split_to_table(trim(coalesce(value, '')), '\s+') with ordinality as t(w, n)
      where n <= 2 and w <> ''),
    '');
$$;

-- -----------------------------------------------------------------------------
-- 1. People, roles and permissions   (Settings > People & Access, Roles & Permissions)
-- -----------------------------------------------------------------------------

create table if not exists crm.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  description text not null default '',
  is_system   boolean not null default false,          -- Owner, Admin, Manager, Member, Viewer
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists roles_name_key on crm.roles (lower(name));

-- The permission matrix: one row per role per module (the Roles & Permissions grid).
create table if not exists crm.role_permissions (
  role_id    uuid not null references crm.roles(id) on delete cascade,
  module     text not null check (module in
               ('Clients','Projects','Pipeline','Tasks','Emails','Templates','Invoices','Reports','Website Audit','Settings')),
  can_view   boolean not null default false,
  can_create boolean not null default false,
  can_edit   boolean not null default false,
  can_delete boolean not null default false,
  primary key (role_id, module),
  -- the app switches "view" on automatically when create/edit/delete is ticked
  check (can_view or not (can_create or can_edit or can_delete))
);

-- Staff accounts. auth_user_id links to Supabase Auth once the person accepts the invite.
create table if not exists crm.members (
  id             uuid primary key default gen_random_uuid(),
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  full_name      text not null check (length(trim(full_name)) > 0),
  email          text not null,
  initials       text not null default '',              -- "LM", used as assignee / owner badge
  job_title      text,
  phone          text,
  avatar_path    text,                                  -- storage path in crm-branding
  role_id        uuid not null references crm.roles(id) on delete restrict,
  task_capacity  integer not null default 4 check (task_capacity > 0),   -- open tasks each, for Reports > Utilisation
  status         text not null default 'Invited' check (status in ('Active','Invited','Disabled')),
  invited_at     timestamptz not null default now(),
  joined_at      timestamptz,
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists members_email_key on crm.members (lower(email));
create index if not exists members_role_idx on crm.members (role_id);

create or replace function crm.members_before_write() returns trigger
language plpgsql as $$
begin
  if coalesce(new.initials, '') = '' then new.initials := crm.initials_of(new.full_name); end if;
  new.email := trim(new.email);
  return new;
end $$;

-- System roles cannot be renamed or deleted (the UI hides those buttons).
create or replace function crm.protect_system_roles() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.is_system then
    raise exception 'The % role is built in and cannot be deleted.', old.name;
  end if;
  if tg_op = 'UPDATE' and old.is_system and (new.name <> old.name or new.is_system <> old.is_system) then
    raise exception 'The % role is built in and cannot be renamed.', old.name;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Personal settings: My profile (theme, timezone, language), collapsed menus
-- (localStorage keys op-sidebar, op-settings-nav, op-mailbox) and Settings > Notifications.
create table if not exists crm.user_preferences (
  member_id           uuid primary key references crm.members(id) on delete cascade,
  theme               text not null default 'system' check (theme in ('light','dark','system')),
  timezone            text not null default 'Africa/Johannesburg',
  language            text not null default 'en-ZA',
  sidebar_collapsed        boolean not null default false,
  settings_nav_collapsed   boolean not null default false,
  mailbox_nav_collapsed    boolean not null default false,
  notify_pause_all    boolean not null default false,
  notify_digest       text not null default 'Off' check (notify_digest in ('Off','Daily','Weekly')),
  notify_quiet_hours  boolean not null default false,
  notify_quiet_from   time not null default '18:00',
  notify_quiet_to     time not null default '07:00',
  -- { "<event>": { "app": bool, "email": bool } } for: client, proposal, paid, overdue, assigned, due, project, email
  notify_events       jsonb not null default '{
    "client":   {"app": true, "email": false},
    "proposal": {"app": true, "email": false},
    "paid":     {"app": true, "email": true},
    "overdue":  {"app": true, "email": true},
    "assigned": {"app": true, "email": true},
    "due":      {"app": true, "email": false},
    "project":  {"app": true, "email": false},
    "email":    {"app": true, "email": false}
  }'::jsonb,
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Workspace settings (single-row tables)
-- -----------------------------------------------------------------------------

-- Settings > Organisation Profile
create table if not exists crm.organisation (
  id                  boolean primary key default true check (id),     -- exactly one row
  name                text not null default 'Oak & Pixel Studio',
  registration_number text,
  vat_number          text,
  industry            text not null default 'Website Design & Technology',
  timezone            text not null default 'Africa/Johannesburg',
  contact_email       text not null default 'info@oakandpixel.co.za',
  contact_phone       text not null default '+27 (75) 089 0614',
  physical_address    text not null default 'Randburg, Gauteng, South Africa',
  logo_path           text,
  brand_colours       jsonb not null default
    '{"primary":"#00B26B","secondary":"#0B1E2B","neutral":"#94A3B8","background":"#F6F8FA"}'::jsonb,
  updated_at          timestamptz not null default now()
);

-- Settings > Project Settings
create table if not exists crm.project_settings (
  id                    boolean primary key default true check (id),
  id_prefix             text not null default 'PRJ' check (id_prefix ~ '^[A-Za-z0-9]{1,6}$'),
  next_number           integer not null default 1 check (next_number >= 1),
  default_due_days      integer not null default 30 check (default_due_days between 1 and 365),
  default_stage         text not null default 'Backlog' check (default_stage in ('Backlog','To Do','In Progress')),
  default_task_priority text not null default 'Medium' check (default_task_priority in ('Low','Medium','High')),
  require_client_approval boolean not null default true,
  track_time            boolean not null default false,
  client_portal         boolean not null default false,
  auto_archive          boolean not null default true,
  archive_after_days    integer not null default 60 check (archive_after_days between 1 and 365),
  updated_at            timestamptz not null default now()
);

-- Settings > Invoicing & Payments. Holds bank details: readable only with invoice access.
create table if not exists crm.invoice_settings (
  id                  boolean primary key default true check (id),
  invoice_prefix      text not null default 'INV' check (invoice_prefix ~ '^[A-Za-z0-9-]{1,8}$'),
  next_number         integer not null default 1 check (next_number >= 1),
  vat_rate            numeric(5,2) not null default 15 check (vat_rate between 0 and 100),
  currency            text not null default 'ZAR' check (currency = 'ZAR'),
  payment_terms_days  integer not null default 14 check (payment_terms_days in (0,7,14,30,60)),
  late_fee_percent    numeric(5,2) not null default 0 check (late_fee_percent between 0 and 100),
  bank_name           text not null default '',
  account_holder      text not null default 'Oak & Pixel Studio',
  account_number      text not null default '' check (account_number = '' or account_number ~ '^[0-9]{6,16}$'),
  branch_code         text not null default '',
  account_type        text not null default 'Business cheque'
                        check (account_type in ('Business cheque','Business savings','Current','Savings')),
  payment_reference   text not null default 'Invoice number'
                        check (payment_reference in ('Invoice number','Client name','Project name')),
  accept_eft          boolean not null default true,
  accept_card         boolean not null default false,
  remind_before_due   boolean not null default true,
  chase_overdue       boolean not null default true,
  footer_text         text not null default 'Payment is due within the stated terms. Thank you for your business.',
  updated_at          timestamptz not null default now()
);

-- Settings > Email (sender + behaviour). Signature is per person (crm.email_signatures).
create table if not exists crm.email_settings (
  id                 boolean primary key default true check (id),
  from_name          text not null default 'Oak & Pixel Studio' check (length(trim(from_name)) > 0),
  from_email         text not null default 'info@oakandpixel.co.za',
  reply_to           text not null default 'info@oakandpixel.co.za',
  bcc_self           boolean not null default false,
  undo_send_seconds  integer not null default 10 check (undo_send_seconds in (0,5,10,30)),
  track_opens        boolean not null default false,
  updated_at         timestamptz not null default now()
);

-- Email signature + banner image (the "Edit signature" dialog). One per person.
create table if not exists crm.email_signatures (
  member_id   uuid primary key references crm.members(id) on delete cascade,
  html        text not null default '',                  -- sanitised HTML only
  banner_path text,                                      -- storage path in crm-branding
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- Settings > Services & Offerings
create table if not exists crm.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  description text not null default '',
  setup_fee   numeric(14,2) not null default 0 check (setup_fee >= 0),
  monthly_fee numeric(14,2) not null default 0 check (monthly_fee >= 0),
  active      boolean not null default true,              -- "Offer this service"
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists services_name_key on crm.services (lower(name));

-- Settings > Pipeline & Stages
create table if not exists crm.pipeline_stages (
  name        text primary key check (length(trim(name)) > 0),
  probability integer not null default 50 check (probability between 0 and 100),
  color       text not null default '#8e9a9c' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order  integer not null default 0,
  kind        text not null default 'open' check (kind in ('open','won','lost')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Project board columns (fixed in the app today; kept as data so they can be edited later).
create table if not exists crm.project_stages (
  name       text primary key check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  is_done    boolean not null default false
);

-- Settings > Project Settings > Task statuses
create table if not exists crm.task_statuses (
  name       text primary key check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  is_done    boolean not null default false              -- completing a task sets progress to 100
);

-- Settings > Automation
create table if not exists crm.automation_rules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  trigger_event text not null,                           -- e.g. "A new client is added"
  action        text not null,                           -- e.g. "Send a welcome email"
  delay_days    integer not null default 0 check (delay_days between 0 and 90),
  enabled       boolean not null default true,
  last_run_at   timestamptz,
  created_by    uuid references crm.members(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Settings > Integrations. The catalogue (Google, Microsoft, PayFast, ...) lives in code;
-- this table records which are connected. Never store secrets here: use Supabase Vault
-- and keep only the reference in secret_ref.
create table if not exists crm.integration_connections (
  integration_key text primary key,                      -- google, microsoft, gcal, whatsapp, slack, payfast, xero, supabase, vercel, zapier
  connected_at    timestamptz not null default now(),
  connected_by    uuid references crm.members(id) on delete set null,
  config          jsonb not null default '{}'::jsonb,
  secret_ref      text
);

-- Settings > Data & Import (client CSV import history)
create table if not exists crm.import_runs (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'clients',
  file_name     text not null,
  rows_read     integer not null default 0,
  rows_imported integer not null default 0,
  rows_skipped  integer not null default 0,
  problems      jsonb not null default '[]'::jsonb,      -- [{ "line": 4, "error": "Already exists" }]
  run_by        uuid references crm.members(id) on delete set null,
  run_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Clients and contacts   (Clients, Client workspace, Overview)
-- -----------------------------------------------------------------------------

create table if not exists crm.clients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) > 0),
  initials       text not null default '',
  service        text not null default '',                -- label kept even if the service is later deleted
  service_id     uuid references crm.services(id) on delete set null,
  status         text not null default 'Active' check (status in ('Active','Proposal','Discovery','On Hold')),
  industry       text not null default '',
  -- Mirror of the primary contact (the app shows these on every client row).
  -- crm.client_contacts is the source of truth; triggers keep these in step.
  contact_name   text not null default '',
  contact_email  text not null default '',
  contact_phone  text not null default '',
  pipeline_value numeric(14,2) not null default 0 check (pipeline_value >= 0),   -- "Pipeline value (R)" field
  billed_total   numeric(14,2) not null default 0 check (billed_total >= 0),     -- "Total billed (R)" field
  client_since   date not null default current_date,
  website        text,
  notes          text,
  logo_path      text,                                    -- storage path in crm-branding
  owner_id       uuid references crm.members(id) on delete set null,
  archived_at    timestamptz,
  created_by     uuid references crm.members(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists clients_status_idx   on crm.clients (status, updated_at desc);
create index if not exists clients_name_idx     on crm.clients (lower(name));
-- The CSV import skips a client whose email already exists, so email is unique among live clients.
create unique index if not exists clients_email_key
  on crm.clients (lower(contact_email)) where contact_email <> '' and archived_at is null;

create table if not exists crm.client_contacts (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references crm.clients(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  role       text not null default '',
  email      text not null check (length(trim(email)) > 0),
  phone      text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_contacts_client_idx on crm.client_contacts (client_id);
create unique index if not exists client_contacts_one_primary on crm.client_contacts (client_id) where is_primary;

create or replace function crm.clients_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name or coalesce(new.initials, '') = '' then
    new.initials := crm.initials_of(new.name);
  end if;
  return new;
end $$;

-- A client created with contact fields gets its first (primary) contact automatically;
-- editing the mirrored contact fields on the client edits the primary contact.
create or replace function crm.clients_sync_contact() returns trigger
language plpgsql as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if new.contact_email <> '' then
    update crm.client_contacts
       set name = coalesce(nullif(new.contact_name, ''), name),
           email = new.contact_email,
           phone = new.contact_phone
     where client_id = new.id and is_primary;
    if not found then
      insert into crm.client_contacts (client_id, name, role, email, phone, is_primary)
      values (new.id, coalesce(nullif(new.contact_name, ''), new.name), 'Primary contact',
              new.contact_email, new.contact_phone, true);
    end if;
  end if;
  return null;
end $$;

-- Making a contact primary first demotes the previous primary (the unique index
-- would otherwise reject the second primary).
create or replace function crm.contacts_unset_others() returns trigger
language plpgsql as $$
begin
  if new.is_primary then
    update crm.client_contacts set is_primary = false
     where client_id = new.client_id and id <> new.id and is_primary;
  end if;
  return new;
end $$;

-- Keep exactly one primary contact per client and mirror it onto the client row.
create or replace function crm.contacts_sync_primary() returns trigger
language plpgsql as $$
declare
  cid uuid := coalesce(new.client_id, old.client_id);
  pid uuid;
begin
  select id into pid from crm.client_contacts where client_id = cid and is_primary;
  if pid is null then
    update crm.client_contacts set is_primary = true
     where id = (select id from crm.client_contacts where client_id = cid order by created_at limit 1);
  end if;
  update crm.clients c
     set contact_name = p.name, contact_email = p.email, contact_phone = p.phone
    from crm.client_contacts p
   where c.id = cid and p.client_id = cid and p.is_primary
     and (c.contact_name, c.contact_email, c.contact_phone) is distinct from (p.name, p.email, p.phone);
  return null;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Opportunities (Pipeline), projects, tasks
-- -----------------------------------------------------------------------------

create table if not exists crm.opportunities (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references crm.clients(id) on delete cascade,
  name           text not null check (length(trim(name)) > 0),
  service        text not null default '',
  service_id     uuid references crm.services(id) on delete set null,
  stage          text not null default 'Lead' references crm.pipeline_stages(name) on update cascade,
  value          numeric(14,2) not null default 0 check (value >= 0),
  currency       text not null default 'ZAR',
  owner_id       uuid references crm.members(id) on delete set null,
  owner_initials text not null default '',                -- "KM" badge shown on cards
  expected_close date,
  source         text,
  lost_reason    text,
  closed_at      timestamptz,
  created_by     uuid references crm.members(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists opportunities_stage_idx  on crm.opportunities (stage, expected_close);
create index if not exists opportunities_client_idx on crm.opportunities (client_id);
create index if not exists opportunities_owner_idx  on crm.opportunities (owner_id);

-- Append-only history of drag-and-drop moves between stages.
create table if not exists crm.opportunity_stage_events (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references crm.opportunities(id) on delete cascade,
  from_stage     text,
  to_stage       text not null,
  changed_by     uuid references crm.members(id) on delete set null,
  changed_at     timestamptz not null default now(),
  reason         text
);
create index if not exists opportunity_events_idx on crm.opportunity_stage_events (opportunity_id, changed_at desc);

create table if not exists crm.projects (
  id             uuid primary key default gen_random_uuid(),
  code           text unique,                              -- PRJ-0001, built from Project Settings
  name           text not null check (length(trim(name)) > 0),
  client_id      uuid not null references crm.clients(id) on delete cascade,
  opportunity_id uuid references crm.opportunities(id) on delete set null,
  service        text not null default '',
  service_id     uuid references crm.services(id) on delete set null,
  stage          text not null default 'Backlog' references crm.project_stages(name) on update cascade,
  progress       smallint not null default 0 check (progress between 0 and 100),
  start_date     date,
  due_date       date,
  manager        text not null default '',                 -- display name as typed in the form
  manager_id     uuid references crm.members(id) on delete set null,
  description    text not null default '',
  sort_rank      numeric not null default 0,               -- order within a board column
  archived_at    timestamptz,
  created_by     uuid references crm.members(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists projects_client_stage_idx on crm.projects (client_id, stage);
create index if not exists projects_due_idx          on crm.projects (due_date);
create index if not exists projects_stage_idx        on crm.projects (stage, sort_rank);

-- "Project Team" avatars and the board's team-member filter
create table if not exists crm.project_members (
  project_id   uuid not null references crm.projects(id) on delete cascade,
  member_id    uuid not null references crm.members(id) on delete cascade,
  project_role text not null default 'Contributor',
  added_at     timestamptz not null default now(),
  primary key (project_id, member_id)
);
create index if not exists project_members_member_idx on crm.project_members (member_id);

create table if not exists crm.tasks (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references crm.projects(id) on delete cascade,
  title             text not null check (length(trim(title)) > 0),
  description       text not null default '',
  assignee_id       uuid references crm.members(id) on delete set null,
  assignee_initials text not null default '',              -- "LM", as typed in the form
  priority          text not null default 'Medium' check (priority in ('Low','Medium','High')),
  status            text not null default 'To Do' references crm.task_statuses(name) on update cascade,
  due_date          date,
  progress          smallint not null default 0 check (progress between 0 and 100),
  completed_at      timestamptz,
  sort_rank         numeric not null default 0,
  created_by        uuid references crm.members(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists tasks_project_idx  on crm.tasks (project_id, status, sort_rank);
create index if not exists tasks_assignee_idx on crm.tasks (assignee_id, due_date);
create index if not exists tasks_due_idx      on crm.tasks (due_date) where completed_at is null;

-- Task workspace tabs: Subtasks, Comments
create table if not exists crm.task_subtasks (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references crm.tasks(id) on delete cascade,
  label        text not null check (length(trim(label)) > 0),
  position     integer not null default 0,
  completed_at timestamptz,
  completed_by uuid references crm.members(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists task_subtasks_idx on crm.task_subtasks (task_id, position);

create table if not exists crm.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references crm.tasks(id) on delete cascade,
  author_id  uuid references crm.members(id) on delete set null,
  body       text not null check (length(trim(body)) > 0),
  edited_at  timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists task_comments_idx on crm.task_comments (task_id, created_at);

-- Settings > Project Settings > "Track time on tasks" (adds a time log to every task)
create table if not exists crm.task_time_entries (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references crm.tasks(id) on delete cascade,
  member_id uuid references crm.members(id) on delete set null,
  minutes   integer not null check (minutes > 0),
  logged_on date not null default current_date,
  note      text,
  created_at timestamptz not null default now()
);
create index if not exists task_time_entries_idx on crm.task_time_entries (task_id, logged_on);
create index if not exists task_time_entries_member_idx on crm.task_time_entries (member_id, logged_on);

-- -----------------------------------------------------------------------------
-- 5. Invoices   (Invoices, Invoice workspace, Reports > Financials)
-- -----------------------------------------------------------------------------

create table if not exists crm.invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null unique,                    -- INV-00428, generated when left empty
  client_id       uuid not null references crm.clients(id) on delete restrict,   -- invoices are never silently deleted with a client
  project_id      uuid references crm.projects(id) on delete set null,
  status          text not null default 'Draft' check (status in ('Draft','Sent','Paid','Overdue')),
  issue_date      date not null default current_date,
  due_date        date not null,
  currency        text not null default 'ZAR',
  tax_rate        numeric(5,2) not null default 15 check (tax_rate between 0 and 100),   -- VAT %
  subtotal        numeric(14,2) not null default 0,         -- calculated from invoice_items
  tax_total       numeric(14,2) not null default 0,
  grand_total     numeric(14,2) not null default 0,
  amount_paid     numeric(14,2) not null default 0 check (amount_paid >= 0),            -- "Amount paid (R)"
  notes           text,
  issued_revision integer not null default 0,
  created_by      uuid references crm.members(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists invoices_client_idx on crm.invoices (client_id, issue_date desc);
create index if not exists invoices_status_idx on crm.invoices (status, due_date);
create index if not exists invoices_project_idx on crm.invoices (project_id);

create table if not exists crm.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references crm.invoices(id) on delete cascade,
  position    integer not null default 1,
  description text not null check (length(trim(description)) > 0),
  quantity    numeric(12,3) not null default 1 check (quantity > 0),
  unit_price  numeric(14,2) not null default 0 check (unit_price >= 0),
  line_total  numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  unique (invoice_id, position)
);

-- Payment History tab. When payments exist they drive invoices.amount_paid.
create table if not exists crm.invoice_payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references crm.invoices(id) on delete restrict,
  amount      numeric(14,2) not null check (amount > 0),
  received_at timestamptz not null default now(),
  method      text not null default 'EFT',
  reference   text,
  recorded_by uuid references crm.members(id) on delete set null,
  voided_at   timestamptz,                                  -- reverse rather than delete
  void_reason text,
  created_at  timestamptz not null default now()
);
create index if not exists invoice_payments_idx on crm.invoice_payments (invoice_id, received_at);

-- Activity tab (created, sent, payment recorded, status changed)
create table if not exists crm.invoice_events (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices(id) on delete cascade,
  event_type text not null,
  details    text,
  actor_id   uuid references crm.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists invoice_events_idx on crm.invoice_events (invoice_id, created_at);

-- -----------------------------------------------------------------------------
-- 6. Email   (Emails, Compose, Settings > Email)
-- -----------------------------------------------------------------------------

-- Connected mailbox (GoDaddy Titan). Only a reference to the secret is stored.
create table if not exists crm.mailboxes (
  id                  uuid primary key default gen_random_uuid(),
  address             text not null,
  display_name        text,
  provider            text not null default 'godaddy_titan',
  credential_secret_ref text,
  state               text not null default 'pending' check (state in ('pending','active','error','disabled')),
  last_sync_at        timestamptz,
  last_error_code     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists mailboxes_address_key on crm.mailboxes (lower(address));

create table if not exists crm.mailbox_grants (
  mailbox_id uuid not null references crm.mailboxes(id) on delete cascade,
  member_id  uuid not null references crm.members(id) on delete cascade,
  permission text not null default 'read' check (permission in ('read','compose','manage')),
  primary key (mailbox_id, member_id)
);

create table if not exists crm.email_threads (
  id                 uuid primary key default gen_random_uuid(),
  normalized_subject text,
  last_message_at    timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists email_threads_idx on crm.email_threads (last_message_at desc);

create table if not exists crm.email_messages (
  id              uuid primary key default gen_random_uuid(),
  mailbox_id      uuid references crm.mailboxes(id) on delete set null,
  thread_id       uuid references crm.email_threads(id) on delete set null,
  -- "Starred" in the sidebar is a filter on starred = true, not a folder.
  folder          text not null default 'Inbox'
                    check (folder in ('Inbox','Sent','Drafts','Scheduled','Archive','Junk','Trash')),
  direction       text not null default 'inbound' check (direction in ('inbound','outbound')),
  from_name       text not null default '',
  from_address    text not null default '',
  to_addresses    text[] not null default '{}',
  cc_addresses    text[] not null default '{}',
  bcc_addresses   text[] not null default '{}',
  subject         text not null default '(no subject)',
  preview         text not null default '',                -- first ~90 characters of the body
  body_text       text not null default '',
  body_html       text,                                    -- sanitised before saving
  unread          boolean not null default false,
  starred         boolean not null default false,
  -- Client / project link (Emails tabs "Client", "Project", "Internal"). Internal = both null.
  client_id       uuid references crm.clients(id) on delete set null,
  project_id      uuid references crm.projects(id) on delete set null,
  link_source     text check (link_source in ('auto','manual')),
  link_confirmed_by uuid references crm.members(id) on delete set null,
  scheduled_for   timestamptz,
  received_at     timestamptz,
  sent_at         timestamptz,
  -- Provider cursor data (Titan IMAP) for sync
  message_id_header text,
  in_reply_to     text,
  references_header text,
  provider_uid    bigint,
  uid_validity    bigint,
  sync_state      text,
  created_by      uuid references crm.members(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (folder <> 'Scheduled' or scheduled_for is not null)
);
create index if not exists email_messages_folder_idx  on crm.email_messages (folder, (coalesce(received_at, sent_at, created_at)) desc);
create index if not exists email_messages_client_idx  on crm.email_messages (client_id);
create index if not exists email_messages_project_idx on crm.email_messages (project_id);
create index if not exists email_messages_thread_idx  on crm.email_messages (thread_id);
create index if not exists email_messages_unread_idx  on crm.email_messages (unread) where unread;
create unique index if not exists email_messages_provider_key
  on crm.email_messages (mailbox_id, folder, uid_validity, provider_uid) where provider_uid is not null;

create table if not exists crm.email_attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references crm.email_messages(id) on delete cascade,
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 26214400),   -- 25 MB total per message in the composer
  storage_path text,                                       -- crm-files bucket
  scan_state  text not null default 'pending' check (scan_state in ('pending','clean','infected','skipped')),
  created_at  timestamptz not null default now()
);
create index if not exists email_attachments_idx on crm.email_attachments (message_id);

-- Send / schedule queue: "Send", "Schedule send" and the undo-send window.
create table if not exists crm.mail_send_jobs (
  id                 uuid primary key default gen_random_uuid(),
  message_id         uuid references crm.email_messages(id) on delete cascade,
  mailbox_id         uuid references crm.mailboxes(id) on delete set null,
  client_message_key text not null unique,                 -- idempotency key from the browser
  status             text not null default 'queued'
                       check (status in ('queued','sending','sent','failed','unknown')),
  attempts           integer not null default 0,
  last_error         text,
  scheduled_at       timestamptz,
  smtp_accepted_at   timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists mail_send_jobs_idx on crm.mail_send_jobs (status, scheduled_at);

create table if not exists crm.mail_sync_jobs (
  id          uuid primary key default gen_random_uuid(),
  mailbox_id  uuid not null references crm.mailboxes(id) on delete cascade,
  folder      text,
  cursor      text,
  status      text not null default 'running' check (status in ('running','ok','failed')),
  error_class text,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index if not exists mail_sync_jobs_idx on crm.mail_sync_jobs (mailbox_id, started_at desc);

-- -----------------------------------------------------------------------------
-- 7. Templates   (Templates)
-- -----------------------------------------------------------------------------

create table if not exists crm.templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  type       text not null default 'Email' check (type in ('Email','Proposal','Quote','Contract','Report','Other')),
  service    text not null default 'All Services',
  body       text not null default '',                     -- uses {{Client Name}}, {{Project Name}} ... placeholders
  active     boolean not null default true,                -- archive instead of deleting
  created_by uuid references crm.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists templates_type_idx on crm.templates (type, service);

-- Every saved body is kept so a sent document can be reproduced exactly.
create table if not exists crm.template_versions (
  id         uuid primary key default gen_random_uuid(),
  template_id uuid not null references crm.templates(id) on delete cascade,
  version_no integer not null,
  body       text not null,
  created_by uuid references crm.members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version_no)
);

-- -----------------------------------------------------------------------------
-- 8. Notes, files, activity   (the Notes / Files / Activity tabs on clients, projects, tasks, invoices)
-- -----------------------------------------------------------------------------

create table if not exists crm.notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references crm.clients(id) on delete cascade,
  project_id uuid references crm.projects(id) on delete cascade,
  invoice_id uuid references crm.invoices(id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  author_id  uuid references crm.members(id) on delete set null,
  edited_at  timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(client_id, project_id, invoice_id) = 1)
);
create index if not exists notes_client_idx  on crm.notes (client_id, created_at desc);
create index if not exists notes_project_idx on crm.notes (project_id, created_at desc);
create index if not exists notes_invoice_idx on crm.notes (invoice_id, created_at desc);

create table if not exists crm.files (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references crm.clients(id) on delete cascade,
  project_id    uuid references crm.projects(id) on delete cascade,
  task_id       uuid references crm.tasks(id) on delete cascade,
  invoice_id    uuid references crm.invoices(id) on delete cascade,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint not null default 0 check (size_bytes >= 0),
  storage_bucket text not null default 'crm-files',
  storage_path  text not null,
  scan_state    text not null default 'pending' check (scan_state in ('pending','clean','infected','skipped')),
  uploaded_by   uuid references crm.members(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (num_nonnulls(client_id, project_id, task_id, invoice_id) = 1)
);
create index if not exists files_client_idx  on crm.files (client_id);
create index if not exists files_project_idx on crm.files (project_id);
create index if not exists files_task_idx    on crm.files (task_id);
create index if not exists files_invoice_idx on crm.files (invoice_id);

-- Timelines on the Overview ("Recent Activity") and the Activity tabs.
create table if not exists crm.activity_events (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('client','project','task','opportunity','invoice','email','template')),
  entity_id   uuid not null,
  event_type  text not null,
  summary     text not null,
  actor_id    uuid references crm.members(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists activity_entity_idx on crm.activity_events (entity_type, entity_id, created_at desc);
create index if not exists activity_recent_idx on crm.activity_events (created_at desc);

-- -----------------------------------------------------------------------------
-- 9. Notifications and audit log
-- -----------------------------------------------------------------------------

-- The bell menu and the Notifications page.
create table if not exists crm.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references crm.members(id) on delete cascade,
  type         text not null check (type in ('email','invoice','task','project','client','pipeline')),
  title        text not null,
  body         text not null default '',
  href         text not null default '/overview',           -- where the row links to
  entity_type  text,
  entity_id    uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_inbox_idx on crm.notifications (recipient_id, read_at, created_at desc);

-- Settings > Audit Log. Append-only: updates and deletes are blocked by trigger.
create table if not exists crm.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,                                         -- no foreign key: the log is append-only and outlives people
  actor_name  text not null default '',                     -- kept even if the person is removed
  area        text not null,                                -- Clients, Projects, Settings, People & Access ...
  action      text not null,                                -- "Updated organisation profile"
  entity_type text,
  entity_id   uuid,
  request_id  text,
  metadata    jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_time_idx on crm.audit_log (occurred_at desc);
create index if not exists audit_log_area_idx on crm.audit_log (area, occurred_at desc);

create or replace function crm.audit_log_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'The audit log is append-only.';
end $$;

-- -----------------------------------------------------------------------------
-- 10. Website Audit   (Website Audit, PDF report)
-- -----------------------------------------------------------------------------

create table if not exists crm.website_audits (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,                              -- as typed
  final_url     text not null,                              -- after redirects
  prepared_for  text,                                       -- "Prepared for (optional)"
  client_id     uuid references crm.clients(id) on delete set null,
  audited_at    timestamptz not null default now(),
  source        text not null check (source in ('lighthouse','quick')),
  notice        text,
  overall       smallint not null check (overall between 0 and 100),
  passed        integer not null default 0,
  total         integer not null default 0,
  response_ms   integer,
  html_bytes    integer,
  strengths     text[] not null default '{}',
  metrics       jsonb not null default '[]'::jsonb,         -- [{ "label": "LCP", "value": "2.1 s", "rating": "good" }]
  brand_review  jsonb,                                      -- { summary, strengths[], ratings[{label,score}] }
  screenshot_path text,                                     -- phone screenshot in crm-files
  created_by    uuid references crm.members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists website_audits_idx        on crm.website_audits (audited_at desc);
create index if not exists website_audits_client_idx on crm.website_audits (client_id);

create table if not exists crm.website_audit_scores (
  audit_id uuid not null references crm.website_audits(id) on delete cascade,
  category text not null check (category in
             ('Performance','SEO','Security','Accessibility','Best Practices','Brand & Design','Content & Conversion')),
  score    smallint not null check (score between 0 and 100),
  primary key (audit_id, category)
);

create table if not exists crm.website_audit_findings (
  id        uuid primary key default gen_random_uuid(),
  audit_id  uuid not null references crm.website_audits(id) on delete cascade,
  position  integer not null default 0,
  category  text not null check (category in
              ('Performance','SEO','Security','Accessibility','Best Practices','Brand & Design','Content & Conversion')),
  severity  text not null check (severity in ('High','Medium','Low')),
  message   text not null,
  fix       text,
  verify    text
);
create index if not exists website_audit_findings_idx on crm.website_audit_findings (audit_id, position);

-- =============================================================================
-- 11. Triggers and business rules
-- =============================================================================

-- updated_at on every table that has the column
do $$
declare t record;
begin
  for t in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
     where c.table_schema = 'crm' and c.column_name = 'updated_at' and tb.table_type = 'BASE TABLE'
  loop
    execute format('drop trigger if exists trg_touch_updated_at on crm.%I', t.table_name);
    execute format('create trigger trg_touch_updated_at before update on crm.%I for each row execute function crm.touch_updated_at()', t.table_name);
  end loop;
end $$;

drop trigger if exists trg_members_before_write on crm.members;
create trigger trg_members_before_write before insert or update on crm.members
  for each row execute function crm.members_before_write();

drop trigger if exists trg_protect_system_roles on crm.roles;
create trigger trg_protect_system_roles before update or delete on crm.roles
  for each row execute function crm.protect_system_roles();

drop trigger if exists trg_clients_before_write on crm.clients;
create trigger trg_clients_before_write before insert or update on crm.clients
  for each row execute function crm.clients_before_write();

drop trigger if exists trg_clients_sync_contact on crm.clients;
create trigger trg_clients_sync_contact after insert or update of contact_name, contact_email, contact_phone on crm.clients
  for each row execute function crm.clients_sync_contact();

drop trigger if exists trg_contacts_unset_others on crm.client_contacts;
create trigger trg_contacts_unset_others before insert or update of is_primary on crm.client_contacts
  for each row execute function crm.contacts_unset_others();

drop trigger if exists trg_contacts_sync_primary on crm.client_contacts;
create trigger trg_contacts_sync_primary after insert or update or delete on crm.client_contacts
  for each row when (pg_trigger_depth() = 0) execute function crm.contacts_sync_primary();

drop trigger if exists trg_audit_log_no_change on crm.audit_log;
create trigger trg_audit_log_no_change before update or delete on crm.audit_log
  for each row execute function crm.audit_log_append_only();

-- Project code: PRJ-0001 (prefix and counter come from Project Settings)
create or replace function crm.next_project_code() returns text
language plpgsql as $$
declare s crm.project_settings%rowtype;
begin
  update crm.project_settings set next_number = next_number + 1 where id returning * into s;
  return s.id_prefix || '-' || lpad((s.next_number - 1)::text, 4, '0');
end $$;

create or replace function crm.projects_before_write() returns trigger
language plpgsql as $$
declare done boolean;
begin
  if tg_op = 'INSERT' and new.code is null then new.code := crm.next_project_code(); end if;
  select is_done into done from crm.project_stages where name = new.stage;
  if coalesce(done, false) then new.progress := 100; end if;   -- a completed project is 100% done
  return new;
end $$;
drop trigger if exists trg_projects_before_write on crm.projects;
create trigger trg_projects_before_write before insert or update on crm.projects
  for each row execute function crm.projects_before_write();

-- Completing a task sets progress to 100 and stamps completed_at (and clears it again if reopened)
create or replace function crm.tasks_before_write() returns trigger
language plpgsql as $$
declare done boolean;
begin
  select is_done into done from crm.task_statuses where name = new.status;
  if coalesce(done, false) then
    new.progress := 100;
    if new.completed_at is null then new.completed_at := now(); end if;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_tasks_before_write on crm.tasks;
create trigger trg_tasks_before_write before insert or update on crm.tasks
  for each row execute function crm.tasks_before_write();

-- Pipeline: record every stage move and stamp closed_at for won/lost stages
create or replace function crm.opportunities_before_write() returns trigger
language plpgsql as $$
declare k text;
begin
  select kind into k from crm.pipeline_stages where name = new.stage;
  new.closed_at := case when k in ('won','lost') then coalesce(new.closed_at, now()) else null end;
  return new;
end $$;
drop trigger if exists trg_opportunities_before_write on crm.opportunities;
create trigger trg_opportunities_before_write before insert or update of stage on crm.opportunities
  for each row execute function crm.opportunities_before_write();

create or replace function crm.opportunities_stage_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into crm.opportunity_stage_events (opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, new.created_by);
  elsif new.stage is distinct from old.stage then
    insert into crm.opportunity_stage_events (opportunity_id, from_stage, to_stage)
    values (new.id, old.stage, new.stage);
  end if;
  return null;
end $$;
drop trigger if exists trg_opportunities_stage_change on crm.opportunities;
create trigger trg_opportunities_stage_change after insert or update of stage on crm.opportunities
  for each row execute function crm.opportunities_stage_change();

-- Template versions: snapshot the body on create and whenever it changes
create or replace function crm.templates_snapshot() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.body is distinct from old.body then
    insert into crm.template_versions (template_id, version_no, body, created_by)
    values (new.id, coalesce((select max(version_no) from crm.template_versions where template_id = new.id), 0) + 1, new.body, new.created_by);
  end if;
  return null;
end $$;
drop trigger if exists trg_templates_snapshot on crm.templates;
create trigger trg_templates_snapshot after insert or update of body on crm.templates
  for each row execute function crm.templates_snapshot();

-- Invoice numbers: prefix and counter come from Invoicing & Payments settings.
-- Padded to 5 digits to match existing numbers such as INV-00428.
create or replace function crm.next_invoice_number() returns text
language plpgsql as $$
declare s crm.invoice_settings%rowtype;
begin
  update crm.invoice_settings set next_number = next_number + 1 where id returning * into s;
  return s.invoice_prefix || '-' || lpad((s.next_number - 1)::text, 5, '0');
end $$;

create or replace function crm.invoices_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' and coalesce(new.invoice_number, '') = '' then
    new.invoice_number := crm.next_invoice_number();
  end if;
  -- totals follow the current tax rate and line items
  new.tax_total   := round(new.subtotal * new.tax_rate / 100, 2);
  new.grand_total := new.subtotal + new.tax_total;
  return new;
end $$;
drop trigger if exists trg_invoices_before_write on crm.invoices;
create trigger trg_invoices_before_write before insert or update on crm.invoices
  for each row execute function crm.invoices_before_write();

create or replace function crm.invoice_events_on_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into crm.invoice_events (invoice_id, event_type, details) values (new.id, 'created', new.invoice_number || ' created');
  elsif new.status is distinct from old.status then
    insert into crm.invoice_events (invoice_id, event_type, details)
    values (new.id, 'status_changed', 'Status changed from ' || old.status || ' to ' || new.status);
  end if;
  return null;
end $$;
drop trigger if exists trg_invoice_events on crm.invoices;
create trigger trg_invoice_events after insert or update of status on crm.invoices
  for each row execute function crm.invoice_events_on_change();

-- Recalculate subtotal / VAT / total whenever line items change
create or replace function crm.invoice_items_recalc() returns trigger
language plpgsql as $$
declare iid uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update crm.invoices i
     set subtotal = coalesce((select sum(line_total) from crm.invoice_items where invoice_id = iid), 0)
   where i.id = iid;
  return null;
end $$;
drop trigger if exists trg_invoice_items_recalc on crm.invoice_items;
create trigger trg_invoice_items_recalc after insert or update or delete on crm.invoice_items
  for each row execute function crm.invoice_items_recalc();

-- Payments drive amount_paid; a fully paid Sent/Overdue invoice becomes Paid
create or replace function crm.invoice_payments_apply() returns trigger
language plpgsql as $$
declare iid uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update crm.invoices i
     set amount_paid = coalesce((select sum(amount) from crm.invoice_payments where invoice_id = iid and voided_at is null), 0)
   where i.id = iid;
  update crm.invoices i
     set status = 'Paid'
   where i.id = iid and i.status in ('Sent','Overdue') and i.grand_total > 0 and i.amount_paid >= i.grand_total;
  if tg_op = 'INSERT' then
    insert into crm.invoice_events (invoice_id, event_type, details, actor_id)
    values (iid, 'payment_recorded', 'R' || to_char(new.amount, 'FM999G999G999D00') || ' received', new.recorded_by);
  end if;
  return null;
end $$;
drop trigger if exists trg_invoice_payments_apply on crm.invoice_payments;
create trigger trg_invoice_payments_apply after insert or update or delete on crm.invoice_payments
  for each row execute function crm.invoice_payments_apply();

-- Run daily (Supabase Cron / pg_cron) to flip unpaid, past-due invoices to Overdue.
create or replace function crm.mark_overdue_invoices() returns integer
language plpgsql as $$
declare n integer;
begin
  update crm.invoices set status = 'Overdue'
   where status = 'Sent' and due_date < current_date and amount_paid < grand_total;
  get diagnostics n = row_count;
  return n;
end $$;

-- =============================================================================
-- 12. Reporting views (security_invoker: they obey the caller's row-level security)
-- =============================================================================

-- Client list: live counts next to the stored pipeline/billed figures
create or replace view crm.client_summary with (security_invoker = true) as
select c.*,
       (select count(*) from crm.projects p where p.client_id = c.id and p.stage <> 'Completed' and p.archived_at is null) as active_projects,
       (select coalesce(sum(o.value), 0) from crm.opportunities o
          join crm.pipeline_stages s on s.name = o.stage where o.client_id = c.id and s.kind = 'open') as open_pipeline,
       (select coalesce(sum(i.grand_total), 0) from crm.invoices i where i.client_id = c.id and i.status <> 'Draft') as invoiced_total,
       (select coalesce(sum(i.amount_paid), 0) from crm.invoices i where i.client_id = c.id) as paid_total
  from crm.clients c;

-- Project board cards: "2/5" checklist counts
create or replace view crm.project_task_progress with (security_invoker = true) as
select p.id as project_id,
       count(t.id) as tasks_total,
       count(t.id) filter (where t.completed_at is not null) as tasks_done
  from crm.projects p left join crm.tasks t on t.project_id = p.id
 group by p.id;

-- Reports > Overview: revenue trend (money received per month)
create or replace view crm.report_revenue_monthly with (security_invoker = true) as
select date_trunc('month', received_at)::date as month, sum(amount) as revenue
  from crm.invoice_payments where voided_at is null
 group by 1 order by 1;

-- Reports > Overview: invoiced value by service
create or replace view crm.report_revenue_by_service with (security_invoker = true) as
select coalesce(nullif(p.service, ''), 'Other') as service, sum(i.grand_total) as invoiced
  from crm.invoices i left join crm.projects p on p.id = i.project_id
 where i.status <> 'Draft'
 group by 1 order by 2 desc;

-- Pipeline page KPIs: total, weighted value and win rate
create or replace view crm.report_pipeline with (security_invoker = true) as
select count(*) filter (where s.kind = 'open')                              as open_opportunities,
       coalesce(sum(o.value) filter (where s.kind = 'open'), 0)             as open_value,
       coalesce(sum(o.value * s.probability / 100.0), 0)                    as weighted_value,
       round(100.0 * count(*) filter (where s.kind = 'won') / nullif(count(*), 0), 1) as win_rate_percent
  from crm.opportunities o join crm.pipeline_stages s on s.name = o.stage;

-- =============================================================================
-- 13. Reference data (settings defaults the app starts with)
-- =============================================================================

insert into crm.organisation (id) values (true) on conflict do nothing;
insert into crm.project_settings (id) values (true) on conflict do nothing;
insert into crm.invoice_settings (id) values (true) on conflict do nothing;
insert into crm.email_settings (id) values (true) on conflict do nothing;

insert into crm.roles (name, description, is_system) values
  ('Owner',   'Full control, including billing and deleting the workspace.', true),
  ('Admin',   'Manages people and settings. Cannot delete the workspace.', true),
  ('Manager', 'Runs clients, projects and the pipeline day to day.', true),
  ('Member',  'Works on assigned projects and tasks.', true),
  ('Viewer',  'Read-only access to clients, projects and reports.', true)
on conflict (lower(name)) do nothing;

-- Permission matrix: the same rules as DEFAULT_ROLES in the app
insert into crm.role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
select r.id, m.module,
  case r.name
    when 'Owner'   then true
    when 'Admin'   then true
    when 'Manager' then m.module in ('Clients','Projects','Pipeline','Tasks','Emails','Templates','Invoices','Website Audit','Reports')
    when 'Member'  then m.module in ('Tasks','Projects','Clients','Pipeline','Emails')
    when 'Viewer'  then m.module in ('Clients','Projects','Pipeline','Tasks','Reports')
  end,
  case r.name
    when 'Owner'   then true
    when 'Admin'   then true
    when 'Manager' then m.module in ('Clients','Projects','Pipeline','Tasks','Emails','Templates','Invoices','Website Audit')
    when 'Member'  then m.module in ('Tasks','Emails')
    else false
  end,
  case r.name
    when 'Owner'   then true
    when 'Admin'   then true
    when 'Manager' then m.module in ('Clients','Projects','Pipeline','Tasks','Emails','Templates','Invoices','Website Audit')
    when 'Member'  then m.module in ('Tasks','Projects')
    else false
  end,
  case r.name
    when 'Owner'   then true
    when 'Admin'   then m.module <> 'Settings'
    when 'Manager' then m.module = 'Tasks'
    else false
  end
from crm.roles r
cross join (values ('Clients'),('Projects'),('Pipeline'),('Tasks'),('Emails'),('Templates'),
                   ('Invoices'),('Reports'),('Website Audit'),('Settings')) as m(module)
where r.is_system
on conflict (role_id, module) do nothing;

insert into crm.project_stages (name, sort_order, is_done) values
  ('Backlog', 1, false), ('To Do', 2, false), ('In Progress', 3, false), ('In Review', 4, false), ('Completed', 5, true)
on conflict (name) do nothing;

insert into crm.task_statuses (name, sort_order, is_done) values
  ('To Do', 1, false), ('In Progress', 2, false), ('In Review', 3, false), ('Completed', 4, true)
on conflict (name) do nothing;

insert into crm.pipeline_stages (name, probability, color, sort_order, kind) values
  ('Lead',        10, '#8e9a9c', 1, 'open'),
  ('Qualified',   30, '#3b8fdc', 2, 'open'),
  ('Proposal',    50, '#e0a02a', 3, 'open'),
  ('Negotiation', 75, '#f97316', 4, 'open'),
  ('Won',        100, '#08bf68', 5, 'won')
on conflict (name) do nothing;

insert into crm.services (name, description, setup_fee, monthly_fee, active, sort_order) values
  ('Signature Plan', 'Custom website up to 5 pages, mobile responsive, contact forms, basic SEO, hosting and 2 monthly content updates.', 12500, 1800, true, 1),
  ('Growth Plan', 'Up to 10 pages, landing pages, online booking, blog or CMS, integrations, monthly SEO report and priority support.', 25000, 3200, true, 2),
  ('Premium Plan', 'Fully bespoke design, advanced animation, e-commerce or client portal, unlimited updates and a dedicated account lead.', 55000, 6500, true, 3),
  ('Website Scoping Call', 'A free conversation to match the right plan to the business.', 0, 0, true, 4)
on conflict (lower(name)) do nothing;

insert into crm.automation_rules (name, trigger_event, action, delay_days, enabled)
select * from (values
  ('Welcome new clients', 'A new client is added', 'Send a welcome email', 0, true),
  ('Start the project when a proposal is accepted', 'A proposal is accepted', 'Create a project', 0, true),
  ('Chase overdue invoices', 'An invoice becomes overdue', 'Send a payment reminder', 7, true),
  ('Warn assignees about tomorrow''s tasks', 'A task is due tomorrow', 'Notify the assignee', 0, false),
  ('Ask for a review after launch', 'A project is completed', 'Send a review request', 14, false)
) as v(name, trigger_event, action, delay_days, enabled)
where not exists (select 1 from crm.automation_rules);

-- =============================================================================
-- 14. Row-level security
-- =============================================================================
-- Access follows the Roles & Permissions matrix. Staff sign in with Supabase Auth
-- and must have an Active row in crm.members. The service_role key (used only by
-- the server, e.g. the current password-gate API routes) bypasses RLS.

create or replace function crm.current_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from crm.members where auth_user_id = (select auth.uid()) and status = 'Active'
$$;

create or replace function crm.can(p_module text, p_action text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from crm.members m
      join crm.role_permissions p on p.role_id = m.role_id
     where m.auth_user_id = (select auth.uid()) and m.status = 'Active' and p.module = p_module
       and case p_action when 'view' then p.can_view when 'create' then p.can_create
                         when 'edit' then p.can_edit when 'delete' then p.can_delete else false end)
$$;

-- Notes / files belong to exactly one parent; the parent decides who may touch them.
create or replace function crm.can_on_parent(p_client uuid, p_project uuid, p_task uuid, p_invoice uuid, p_action text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (p_client  is not null and crm.can('Clients',  p_action))
      or (p_project is not null and crm.can('Projects', p_action))
      or (p_task    is not null and crm.can('Tasks',    p_action))
      or (p_invoice is not null and crm.can('Invoices', p_action))
$$;

-- Turn RLS on everywhere in the schema
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'crm' loop
    execute format('alter table crm.%I enable row level security', t.tablename);
  end loop;
end $$;

-- One policy per action for a table that belongs to a module.
create or replace function crm.apply_module_policies(p_table text, p_module text) returns void
language plpgsql as $$
declare a text;
begin
  foreach a in array array['select','insert','update','delete'] loop
    execute format('drop policy if exists %I on crm.%I', 'crm_' || a, p_table);
  end loop;
  execute format('create policy crm_select on crm.%I for select to authenticated using (crm.can(%L, ''view''))', p_table, p_module);
  execute format('create policy crm_insert on crm.%I for insert to authenticated with check (crm.can(%L, ''create''))', p_table, p_module);
  execute format('create policy crm_update on crm.%I for update to authenticated using (crm.can(%L, ''edit'')) with check (crm.can(%L, ''edit''))', p_table, p_module, p_module);
  execute format('create policy crm_delete on crm.%I for delete to authenticated using (crm.can(%L, ''delete''))', p_table, p_module);
end $$;

select crm.apply_module_policies(t.tbl, t.module)
from (values
  ('clients','Clients'), ('client_contacts','Clients'),
  ('projects','Projects'), ('project_members','Projects'),
  ('tasks','Tasks'), ('task_subtasks','Tasks'), ('task_comments','Tasks'), ('task_time_entries','Tasks'),
  ('opportunities','Pipeline'), ('opportunity_stage_events','Pipeline'),
  ('email_messages','Emails'), ('email_attachments','Emails'), ('email_threads','Emails'),
  ('mailboxes','Emails'), ('mailbox_grants','Emails'), ('mail_send_jobs','Emails'), ('mail_sync_jobs','Emails'),
  ('templates','Templates'), ('template_versions','Templates'),
  ('invoices','Invoices'), ('invoice_items','Invoices'), ('invoice_payments','Invoices'), ('invoice_events','Invoices'),
  ('website_audits','Website Audit'), ('website_audit_scores','Website Audit'), ('website_audit_findings','Website Audit'),
  ('automation_rules','Settings'), ('integration_connections','Settings'), ('import_runs','Settings')
) as t(tbl, module);

-- Everyone signed in can read the team, roles and lookup lists (needed to show names and pick stages);
-- only people with Settings access change them.
do $$
declare t text;
begin
  foreach t in array array['roles','role_permissions','members','services','pipeline_stages','project_stages','task_statuses'] loop
    execute format('drop policy if exists crm_select on crm.%I', t);
    execute format('drop policy if exists crm_insert on crm.%I', t);
    execute format('drop policy if exists crm_update on crm.%I', t);
    execute format('drop policy if exists crm_delete on crm.%I', t);
    execute format('create policy crm_select on crm.%I for select to authenticated using (crm.current_member_id() is not null)', t);
    execute format('create policy crm_insert on crm.%I for insert to authenticated with check (crm.can(''Settings'',''create''))', t);
    execute format('create policy crm_update on crm.%I for update to authenticated using (crm.can(''Settings'',''edit'')) with check (crm.can(''Settings'',''edit''))', t);
    execute format('create policy crm_delete on crm.%I for delete to authenticated using (crm.can(''Settings'',''delete''))', t);
  end loop;
end $$;

-- Singleton settings. Organisation / project / email settings are readable by any member.
do $$
declare t text;
begin
  foreach t in array array['organisation','project_settings','email_settings'] loop
    execute format('drop policy if exists crm_select on crm.%I', t);
    execute format('drop policy if exists crm_update on crm.%I', t);
    execute format('create policy crm_select on crm.%I for select to authenticated using (crm.current_member_id() is not null)', t);
    execute format('create policy crm_update on crm.%I for update to authenticated using (crm.can(''Settings'',''edit'')) with check (crm.can(''Settings'',''edit''))', t);
  end loop;
end $$;

-- Invoice settings include bank details: only people who can see invoices may read them.
drop policy if exists crm_select on crm.invoice_settings;
drop policy if exists crm_update on crm.invoice_settings;
create policy crm_select on crm.invoice_settings for select to authenticated using (crm.can('Invoices','view') or crm.can('Settings','view'));
create policy crm_update on crm.invoice_settings for update to authenticated using (crm.can('Settings','edit')) with check (crm.can('Settings','edit'));

-- Notes and files follow their parent record
drop policy if exists crm_select on crm.notes;
drop policy if exists crm_insert on crm.notes;
drop policy if exists crm_update on crm.notes;
drop policy if exists crm_delete on crm.notes;
create policy crm_select on crm.notes for select to authenticated using (crm.can_on_parent(client_id, project_id, null, invoice_id, 'view'));
create policy crm_insert on crm.notes for insert to authenticated with check (crm.can_on_parent(client_id, project_id, null, invoice_id, 'create'));
create policy crm_update on crm.notes for update to authenticated using (crm.can_on_parent(client_id, project_id, null, invoice_id, 'edit')) with check (crm.can_on_parent(client_id, project_id, null, invoice_id, 'edit'));
create policy crm_delete on crm.notes for delete to authenticated using (crm.can_on_parent(client_id, project_id, null, invoice_id, 'delete'));

drop policy if exists crm_select on crm.files;
drop policy if exists crm_insert on crm.files;
drop policy if exists crm_update on crm.files;
drop policy if exists crm_delete on crm.files;
create policy crm_select on crm.files for select to authenticated using (crm.can_on_parent(client_id, project_id, task_id, invoice_id, 'view'));
create policy crm_insert on crm.files for insert to authenticated with check (crm.can_on_parent(client_id, project_id, task_id, invoice_id, 'create'));
create policy crm_update on crm.files for update to authenticated using (crm.can_on_parent(client_id, project_id, task_id, invoice_id, 'edit')) with check (crm.can_on_parent(client_id, project_id, task_id, invoice_id, 'edit'));
create policy crm_delete on crm.files for delete to authenticated using (crm.can_on_parent(client_id, project_id, task_id, invoice_id, 'delete'));

-- Timelines: any member reads; any member records
drop policy if exists crm_select on crm.activity_events;
drop policy if exists crm_insert on crm.activity_events;
create policy crm_select on crm.activity_events for select to authenticated using (crm.current_member_id() is not null);
create policy crm_insert on crm.activity_events for insert to authenticated with check (crm.current_member_id() is not null);

-- Audit log: readable with Settings access, anyone signed in can add entries, nobody edits or deletes
drop policy if exists crm_select on crm.audit_log;
drop policy if exists crm_insert on crm.audit_log;
create policy crm_select on crm.audit_log for select to authenticated using (crm.can('Settings','view'));
create policy crm_insert on crm.audit_log for insert to authenticated with check (crm.current_member_id() is not null);

-- Personal rows: only the owner of the row
do $$
declare t record;
begin
  for t in select * from (values ('user_preferences','member_id'), ('email_signatures','member_id'), ('notifications','recipient_id')) as v(tbl, col) loop
    execute format('drop policy if exists crm_own on crm.%I', t.tbl);
    execute format('create policy crm_own on crm.%I for all to authenticated using (%I = crm.current_member_id()) with check (%I = crm.current_member_id())', t.tbl, t.col, t.col);
  end loop;
end $$;

drop function crm.apply_module_policies(text, text);

-- =============================================================================
-- 15. Grants (RLS decides which rows; these grants only open the door)
-- =============================================================================

grant usage on schema crm to authenticated, service_role;
grant select, insert, update, delete on all tables in schema crm to authenticated;
grant all on all tables in schema crm to service_role;
grant usage, select on all sequences in schema crm to authenticated, service_role;
grant execute on all functions in schema crm to authenticated, service_role;
alter default privileges in schema crm grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema crm grant all on tables to service_role;
alter default privileges in schema crm grant usage, select on sequences to authenticated, service_role;
-- the anon (public, signed-out) role gets nothing in this schema

-- =============================================================================
-- 16. File storage
-- =============================================================================
-- crm-files    : private. Client / project / task / invoice files, email attachments,
--                audit screenshots. Always served through signed URLs.
-- crm-branding : public read. Company logo, client logos, avatars and the email banner
--                (emails need a URL that recipients' mail apps can load). Brand assets only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('crm-files', 'crm-files', false, 26214400, null),
  ('crm-branding', 'crm-branding', true, 8388608,
     array['image/png','image/jpeg','image/gif','image/webp','image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "crm-files read" on storage.objects;
drop policy if exists "crm-files write" on storage.objects;
drop policy if exists "crm-files update" on storage.objects;
drop policy if exists "crm-files delete" on storage.objects;
create policy "crm-files read"   on storage.objects for select to authenticated
  using (bucket_id = 'crm-files' and crm.current_member_id() is not null);
create policy "crm-files write"  on storage.objects for insert to authenticated
  with check (bucket_id = 'crm-files' and crm.current_member_id() is not null);
create policy "crm-files update" on storage.objects for update to authenticated
  using (bucket_id = 'crm-files' and crm.current_member_id() is not null)
  with check (bucket_id = 'crm-files' and crm.current_member_id() is not null);
create policy "crm-files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'crm-files' and crm.current_member_id() is not null);

drop policy if exists "crm-branding write" on storage.objects;
drop policy if exists "crm-branding update" on storage.objects;
drop policy if exists "crm-branding delete" on storage.objects;
create policy "crm-branding write"  on storage.objects for insert to authenticated
  with check (bucket_id = 'crm-branding' and crm.current_member_id() is not null);
create policy "crm-branding update" on storage.objects for update to authenticated
  using (bucket_id = 'crm-branding' and crm.current_member_id() is not null)
  with check (bucket_id = 'crm-branding' and crm.current_member_id() is not null);
create policy "crm-branding delete" on storage.objects for delete to authenticated
  using (bucket_id = 'crm-branding' and crm.current_member_id() is not null);

commit;

-- =============================================================================
-- AFTER YOU RUN THIS (do these by hand; they are not part of the transaction)
-- =============================================================================
--
-- 1) Expose the schema to the API
--    Supabase Dashboard > Project Settings > API > "Exposed schemas": add  crm
--    (keep the schemas already listed, e.g. public). Then the app can call
--    supabase.schema('crm').from('clients') ... Without this step the REST API
--    returns "schema must be one of ...".
--
-- 2) Create the first Owner so someone can sign in and manage everyone else.
--    First create the user in Authentication > Users (invite or add user), then run:
--
--    insert into crm.members (auth_user_id, full_name, email, role_id, status, joined_at)
--    select u.id, 'Oak & Pixel Admin', u.email,
--           (select id from crm.roles where name = 'Owner'), 'Active', now()
--      from auth.users u
--     where lower(u.email) = lower('info@oakandpixel.co.za');
--
--    (RLS is bypassed in the SQL editor, so this works before any member exists.)
--
-- 3) Optional: flag overdue invoices every day (Database > Cron, or pg_cron):
--       select cron.schedule('crm-mark-overdue', '5 0 * * *', $$select crm.mark_overdue_invoices()$$);
--
-- 4) Storage paths the app should use, so policies and cleanup stay simple:
--       crm-files/clients/<client_id>/<file>        crm-files/projects/<project_id>/<file>
--       crm-files/tasks/<task_id>/<file>            crm-files/mail/<message_id>/<file>
--       crm-files/audits/<audit_id>/screenshot.jpg
--       crm-branding/logo/<file>   crm-branding/clients/<client_id>/<file>
--       crm-branding/avatars/<member_id>/<file>     crm-branding/email/<member_id>/<file>
--
-- NOT stored in the database (stays in the browser by design):
--    the pagination, search text, filters, selected rows and tab choices on each page.
-- Secrets are never stored here: ADMIN_GATE_USER / ADMIN_GATE_PASSWORD, PAGESPEED_API_KEY
-- and ANTHROPIC_API_KEY stay in Vercel environment variables; mailbox and integration
-- credentials go in Supabase Vault with only a reference kept in secret_ref.
-- =============================================================================
