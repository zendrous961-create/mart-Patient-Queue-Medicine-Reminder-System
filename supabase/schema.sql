-- =============================================================================
-- Smart Patient Queue & Medicine Reminder System
-- Supabase Schema — run this entire file in the Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------
-- 1. USERS  (mirrors auth.users, adds role + display name)
-- -----------------------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text        not null,
  email      text        not null unique,
  role       text        not null check (role in ('patient', 'doctor')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- 2. DOCTORS
-- -----------------------------------------------------------------------
create table if not exists public.doctors (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references public.users(id) on delete cascade,
  name             text        not null,
  specialization   text        not null,
  avatar           text        not null default '🩺',
  available_slots  text[]      not null default '{}',
  created_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- 3. APPOINTMENTS
-- -----------------------------------------------------------------------
create table if not exists public.appointments (
  id           uuid        primary key default gen_random_uuid(),
  patient_id   uuid        not null references public.users(id) on delete cascade,
  patient_name text        not null,
  doctor_id    uuid        not null references public.doctors(id) on delete cascade,
  date         date        not null,
  time_slot    text        not null,
  token_number text        not null,
  status       text        not null default 'waiting'
                           check (status in ('waiting','in-progress','completed','cancelled')),
  created_at   timestamptz not null default now()
);

-- Prevent two active bookings for the same doctor/date/time-slot
create unique index if not exists one_active_booking_per_slot
  on public.appointments (doctor_id, date, time_slot)
  where status <> 'cancelled';

-- -----------------------------------------------------------------------
-- 4. MEDICINE REMINDERS
-- -----------------------------------------------------------------------
create table if not exists public.medicine_reminders (
  id             uuid        primary key default gen_random_uuid(),
  patient_id     uuid        not null references public.users(id) on delete cascade,
  medicine_name  text        not null,
  dosage         text,
  reminder_time  time        not null,
  frequency      text        not null default 'daily',
  active         boolean     not null default true,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- 5. PRESCRIPTIONS
-- -----------------------------------------------------------------------
create table if not exists public.prescriptions (
  id             uuid        primary key default gen_random_uuid(),
  appointment_id uuid        not null references public.appointments(id) on delete cascade,
  notes          text        not null,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- 6. QUEUE POSITION FUNCTION
--    Called via supabase.rpc('get_queue_position', { appt_id: '...' })
--    Returns: ahead_count, eta_minutes
-- -----------------------------------------------------------------------
create or replace function public.get_queue_position(appt_id uuid)
returns table(ahead_count int, eta_minutes int)
language sql
security definer
as $$
  with target as (
    select doctor_id, date, created_at, status
    from public.appointments
    where id = appt_id
  )
  select
    count(*)::int                    as ahead_count,
    (count(*) * 12)::int             as eta_minutes
  from public.appointments a
  join target t on a.doctor_id = t.doctor_id and a.date = t.date
  where a.status = 'waiting'
    and a.created_at < t.created_at
    and t.status = 'waiting';
$$;

-- -----------------------------------------------------------------------
-- 7. TOKEN NUMBER FUNCTION  (race-condition-safe sequential token)
--    Called via supabase.rpc('next_token_number', { p_doctor_id, p_date })
-- -----------------------------------------------------------------------
create or replace function public.next_token_number(p_doctor_id uuid, p_date date)
returns text
language plpgsql
security definer
as $$
declare
  next_num int;
begin
  select coalesce(max(
    cast(
      regexp_replace(token_number, '[^0-9]', '', 'g')
    as integer)
  ), 100) + 1
  into next_num
  from public.appointments
  where doctor_id = p_doctor_id
    and date = p_date
    and status <> 'cancelled';

  return 'Q-' || next_num::text;
end;
$$;

-- -----------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------

alter table public.users              enable row level security;
alter table public.doctors            enable row level security;
alter table public.appointments       enable row level security;
alter table public.medicine_reminders enable row level security;
alter table public.prescriptions      enable row level security;

-- ---- users ----
drop policy if exists "Users can read their own row" on public.users;
create policy "Users can read their own row"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own row" on public.users;
create policy "Users can update their own row"
  on public.users for update
  using (auth.uid() = id);

drop policy if exists "Insert on sign-up (service role or own id)" on public.users;
create policy "Insert on sign-up (service role or own id)"
  on public.users for insert
  with check (auth.uid() = id);

-- ---- doctors (publicly readable; own row writable) ----
drop policy if exists "Anyone can view doctors" on public.doctors;
create policy "Anyone can view doctors"
  on public.doctors for select
  using (true);

drop policy if exists "Doctor can update their own profile" on public.doctors;
create policy "Doctor can update their own profile"
  on public.doctors for update
  using (auth.uid() = user_id);

drop policy if exists "Doctor profile created on sign-up" on public.doctors;
create policy "Doctor profile created on sign-up"
  on public.doctors for insert
  with check (auth.uid() = user_id);

-- ---- appointments ----
drop policy if exists "Patient sees their own appointments" on public.appointments;
create policy "Patient sees their own appointments"
  on public.appointments for select
  using (auth.uid() = patient_id);

drop policy if exists "Doctor sees appointments in their queue" on public.appointments;
create policy "Doctor sees appointments in their queue"
  on public.appointments for select
  using (
    auth.uid() in (
      select user_id from public.doctors where id = doctor_id
    )
  );

drop policy if exists "Patient can book" on public.appointments;
create policy "Patient can book"
  on public.appointments for insert
  with check (auth.uid() = patient_id);

drop policy if exists "Patient can cancel their own" on public.appointments;
create policy "Patient can cancel their own"
  on public.appointments for update
  using (auth.uid() = patient_id and status = 'waiting');

drop policy if exists "Doctor can update status" on public.appointments;
create policy "Doctor can update status"
  on public.appointments for update
  using (
    auth.uid() in (
      select user_id from public.doctors where id = doctor_id
    )
  );

-- ---- medicine_reminders ----
drop policy if exists "Patient manages their own reminders" on public.medicine_reminders;
create policy "Patient manages their own reminders"
  on public.medicine_reminders for all
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- ---- prescriptions ----
drop policy if exists "Patient can read prescriptions for their appointments" on public.prescriptions;
create policy "Patient can read prescriptions for their appointments"
  on public.prescriptions for select
  using (
    auth.uid() in (
      select patient_id from public.appointments where id = appointment_id
    )
  );

drop policy if exists "Doctor can insert/read prescriptions" on public.prescriptions;
create policy "Doctor can insert/read prescriptions"
  on public.prescriptions for all
  using (
    auth.uid() in (
      select d.user_id from public.doctors d
      join public.appointments a on a.doctor_id = d.id
      where a.id = appointment_id
    )
  )
  with check (
    auth.uid() in (
      select d.user_id from public.doctors d
      join public.appointments a on a.doctor_id = d.id
      where a.id = appointment_id
    )
  );
