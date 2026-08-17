-- ============================================================
-- Leviathan: all-in-one doctor platform schema
-- 10 pain-point modules, every table RLS-protected per user
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Module: Core / profiles
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  specialty text default '',
  practice_name text default '',
  region text default '',
  role text not null default 'doctor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ------------------------------------------------------------
-- Module 1: Wellbeing (Burnout & mental health)
-- ------------------------------------------------------------
create table public.wellbeing_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood integer not null check (mood between 1 and 5),
  energy integer not null check (energy between 1 and 5),
  stress integer not null check (stress between 1 and 5),
  sleep_hours numeric check (sleep_hours >= 0 and sleep_hours <= 24),
  notes text default '',
  burnout_risk text default 'low', -- low | medium | high
  checkin_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.wellbeing_checkins enable row level security;

create policy "wellbeing_select_own" on public.wellbeing_checkins
  for select using (auth.uid() = user_id);
create policy "wellbeing_insert_own" on public.wellbeing_checkins
  for insert with check (auth.uid() = user_id);
create policy "wellbeing_update_own" on public.wellbeing_checkins
  for update using (auth.uid() = user_id);
create policy "wellbeing_delete_own" on public.wellbeing_checkins
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 2: Billing & Claims (Insurance & billing)
-- ------------------------------------------------------------
create type public.claim_status as enum ('draft', 'submitted', 'approved', 'denied', 'appealing', 'paid');

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_name text default '',
  service_date date default current_date,
  amount numeric not null default 0 check (amount >= 0),
  insurer text default '',
  code text default '', -- e.g. ICD-10 / CPT
  status public.claim_status not null default 'draft',
  denial_reason text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.claims enable row level security;

create policy "claims_select_own" on public.claims
  for select using (auth.uid() = user_id);
create policy "claims_insert_own" on public.claims
  for insert with check (auth.uid() = user_id);
create policy "claims_update_own" on public.claims
  for update using (auth.uid() = user_id);
create policy "claims_delete_own" on public.claims
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 3: Finance (Compensation & loans)
-- ------------------------------------------------------------
create type public.txn_type as enum ('income', 'expense', 'loan_payment');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  txn_type public.txn_type not null default 'expense',
  amount numeric not null default 0,
  category text default '',
  description text default '',
  txn_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lender text default '',
  loan_type text default '', -- student | mortgage | practice | other
  principal numeric not null default 0 check (principal >= 0),
  interest_rate numeric default 0,
  balance numeric not null default 0 check (balance >= 0),
  monthly_payment numeric default 0,
  status text not null default 'active', -- active | paid_off
  created_at timestamptz not null default now()
);

alter table public.loans enable row level security;

create policy "loans_select_own" on public.loans
  for select using (auth.uid() = user_id);
create policy "loans_insert_own" on public.loans
  for insert with check (auth.uid() = user_id);
create policy "loans_update_own" on public.loans
  for update using (auth.uid() = user_id);
create policy "loans_delete_own" on public.loans
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 4: Telemedicine
-- ------------------------------------------------------------
create type public.consult_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_name text default '',
  scheduled_at timestamptz not null default now(),
  duration_min integer not null default 15 check (duration_min > 0),
  status public.consult_status not null default 'scheduled',
  room_url text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.consultations enable row level security;

create policy "consultations_select_own" on public.consultations
  for select using (auth.uid() = user_id);
create policy "consultations_insert_own" on public.consultations
  for insert with check (auth.uid() = user_id);
create policy "consultations_update_own" on public.consultations
  for update using (auth.uid() = user_id);
create policy "consultations_delete_own" on public.consultations
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 5: Charting / EHR (patients, visits, SOAP notes)
-- ------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  dob date,
  sex text default '',
  allergies text default '',
  conditions text default '',
  medications text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;

create policy "patients_select_own" on public.patients
  for select using (auth.uid() = user_id);
create policy "patients_insert_own" on public.patients
  for insert with check (auth.uid() = user_id);
create policy "patients_update_own" on public.patients
  for update using (auth.uid() = user_id);
create policy "patients_delete_own" on public.patients
  for delete using (auth.uid() = user_id);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid references public.patients (id) on delete cascade,
  visit_date date not null default current_date,
  chief_complaint text default '',
  subjective text default '',
  objective text default '',
  assessment text default '',
  plan text default '',
  created_at timestamptz not null default now()
);

alter table public.visits enable row level security;

create policy "visits_select_own" on public.visits
  for select using (auth.uid() = user_id);
create policy "visits_insert_own" on public.visits
  for insert with check (auth.uid() = user_id);
create policy "visits_update_own" on public.visits
  for update using (auth.uid() = user_id);
create policy "visits_delete_own" on public.visits
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 6: Roster / Staffing
-- ------------------------------------------------------------
create type public.shift_status as enum ('draft', 'confirmed', 'cancelled', 'covered', 'needs_cover');

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text default '',
  status public.shift_status not null default 'draft',
  is_locum boolean not null default false,
  notes text default '',
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

alter table public.shifts enable row level security;

create policy "shifts_select_own" on public.shifts
  for select using (auth.uid() = user_id);
create policy "shifts_insert_own" on public.shifts
  for insert with check (auth.uid() = user_id);
create policy "shifts_update_own" on public.shifts
  for update using (auth.uid() = user_id);
create policy "shifts_delete_own" on public.shifts
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 7: Risk & Cases (Malpractice & litigation)
-- ------------------------------------------------------------
create type public.case_status as enum ('open', 'preparing', 'active_litigation', 'closed', 'resolved');

create table public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  case_type text default '', -- malpractice | complaint | regulatory | insurance_dispute
  status public.case_status not null default 'open',
  insurer text default '',
  attorney text default '',
  key_dates text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_cases enable row level security;

create policy "cases_select_own" on public.legal_cases
  for select using (auth.uid() = user_id);
create policy "cases_insert_own" on public.legal_cases
  for insert with check (auth.uid() = user_id);
create policy "cases_update_own" on public.legal_cases
  for update using (auth.uid() = user_id);
create policy "cases_delete_own" on public.legal_cases
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 8: Practice Ops (appointments + KPIs)
-- ------------------------------------------------------------
create type public.appt_status as enum ('booked', 'confirmed', 'completed', 'cancelled', 'no_show');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_name text default '',
  appt_at timestamptz not null,
  duration_min integer not null default 15 check (duration_min > 0),
  reason text default '',
  status public.appt_status not null default 'booked',
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "appointments_select_own" on public.appointments
  for select using (auth.uid() = user_id);
create policy "appointments_insert_own" on public.appointments
  for insert with check (auth.uid() = user_id);
create policy "appointments_update_own" on public.appointments
  for update using (auth.uid() = user_id);
create policy "appointments_delete_own" on public.appointments
  for delete using (auth.uid() = user_id);

create table public.practice_kpis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null default date_trunc('month', current_date),
  patient_count integer not null default 0,
  revenue numeric not null default 0,
  expense numeric not null default 0,
  no_show_rate numeric default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.practice_kpis enable row level security;

create policy "kpis_select_own" on public.practice_kpis
  for select using (auth.uid() = user_id);
create policy "kpis_insert_own" on public.practice_kpis
  for insert with check (auth.uid() = user_id);
create policy "kpis_update_own" on public.practice_kpis
  for update using (auth.uid() = user_id);
create policy "kpis_delete_own" on public.practice_kpis
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 9: AI Scribe (audio -> SOAP note)
-- ------------------------------------------------------------
create type public.scribe_status as enum ('queued', 'transcribing', 'generating', 'ready', 'failed');

create table public.scribe_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.scribe_status not null default 'queued',
  audio_path text default '',
  transcript text default '',
  note text default '',
  duration_min integer default 0,
  error text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scribe_jobs enable row level security;

create policy "scribe_select_own" on public.scribe_jobs
  for select using (auth.uid() = user_id);
create policy "scribe_insert_own" on public.scribe_jobs
  for insert with check (auth.uid() = user_id);
create policy "scribe_update_own" on public.scribe_jobs
  for update using (auth.uid() = user_id);
create policy "scribe_delete_own" on public.scribe_jobs
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Module 10: Overflow / Referrals (public system strain)
-- ------------------------------------------------------------
create type public.referral_status as enum ('new', 'matched', 'accepted', 'completed', 'expired');

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_name text default '',
  source text default '', -- public waitlist | gp | emergency | other
  urgency text default 'routine', -- routine | soon | urgent
  required_specialty text default '',
  capacity_match text default '',
  status public.referral_status not null default 'new',
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.referrals enable row level security;

create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = user_id);
create policy "referrals_insert_own" on public.referrals
  for insert with check (auth.uid() = user_id);
create policy "referrals_update_own" on public.referrals
  for update using (auth.uid() = user_id);
create policy "referrals_delete_own" on public.referrals
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Secure helper: id of the first user (used by seed)
-- ------------------------------------------------------------
create or replace function public.first_user_id() returns uuid
language sql stable as $$
  select id from auth.users order by created_at limit 1;
$$;
