-- =============================================================================
-- Seed Data — Complete self-contained seed (run in Supabase SQL Editor)
-- Run AFTER schema.sql
-- This inserts directly into auth.users so the FK constraint is satisfied
-- and demo accounts can actually log in with email/password.
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. Insert auth identities into auth.users
--    (The SQL Editor runs as superuser and can write to auth schema)
-- -----------------------------------------------------------------------
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  -- Dr. Anita Rao  (password: demo1234)
  (
    '11111111-1111-1111-1111-111111111001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'anita.doctor@queuecare.demo',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Dr. Anita Rao","role":"doctor"}',
    now(), now(), '', '', '', ''
  ),
  -- Dr. Karthik Iyer  (password: demo1234)
  (
    '11111111-1111-1111-1111-111111111002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'karthik.doctor@queuecare.demo',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Dr. Karthik Iyer","role":"doctor"}',
    now(), now(), '', '', '', ''
  ),
  -- Dr. Meera Nair  (password: demo1234)
  (
    '11111111-1111-1111-1111-111111111003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'meera.doctor@queuecare.demo',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Dr. Meera Nair","role":"doctor"}',
    now(), now(), '', '', '', ''
  ),
  -- Ravi Kumar (patient)  (password: demo1234)
  (
    '11111111-1111-1111-1111-111111111004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ravi.patient@queuecare.demo',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Ravi Kumar","role":"patient"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

-- Also insert into auth.identities (required for email login to work)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111001',
    '11111111-1111-1111-1111-111111111001',
    'anita.doctor@queuecare.demo',
    '{"sub":"11111111-1111-1111-1111-111111111001","email":"anita.doctor@queuecare.demo"}',
    'email', now(), now(), now()
  ),
  (
    '11111111-1111-1111-1111-111111111002',
    '11111111-1111-1111-1111-111111111002',
    'karthik.doctor@queuecare.demo',
    '{"sub":"11111111-1111-1111-1111-111111111002","email":"karthik.doctor@queuecare.demo"}',
    'email', now(), now(), now()
  ),
  (
    '11111111-1111-1111-1111-111111111003',
    '11111111-1111-1111-1111-111111111003',
    'meera.doctor@queuecare.demo',
    '{"sub":"11111111-1111-1111-1111-111111111003","email":"meera.doctor@queuecare.demo"}',
    'email', now(), now(), now()
  ),
  (
    '11111111-1111-1111-1111-111111111004',
    '11111111-1111-1111-1111-111111111004',
    'ravi.patient@queuecare.demo',
    '{"sub":"11111111-1111-1111-1111-111111111004","email":"ravi.patient@queuecare.demo"}',
    'email', now(), now(), now()
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------
-- 2. public.users  (FK now satisfied — auth.users rows exist above)
-- -----------------------------------------------------------------------
insert into public.users (id, name, email, role) values
  ('11111111-1111-1111-1111-111111111001', 'Dr. Anita Rao',    'anita.doctor@queuecare.demo',   'doctor'),
  ('11111111-1111-1111-1111-111111111002', 'Dr. Karthik Iyer', 'karthik.doctor@queuecare.demo', 'doctor'),
  ('11111111-1111-1111-1111-111111111003', 'Dr. Meera Nair',   'meera.doctor@queuecare.demo',   'doctor'),
  ('11111111-1111-1111-1111-111111111004', 'Ravi Kumar',       'ravi.patient@queuecare.demo',   'patient')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------
-- 3. Doctors
-- -----------------------------------------------------------------------
insert into public.doctors (id, user_id, name, specialization, avatar, available_slots) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111001',
    'Dr. Anita Rao', 'General Physician', '🩺',
    array['09:00','09:20','09:40','10:00','10:20','10:40','11:00']
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111002',
    'Dr. Karthik Iyer', 'Cardiology', '❤️',
    array['10:00','10:30','11:00','11:30','12:00']
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111003',
    'Dr. Meera Nair', 'Pediatrics', '🧒',
    array['14:00','14:20','14:40','15:00','15:20']
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------
-- 4. Demo appointment for today
-- -----------------------------------------------------------------------
insert into public.appointments
  (id, patient_id, patient_name, doctor_id, date, time_slot, token_number, status)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111004',
    'Ravi Kumar',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_date,
    '09:00',
    'Q-101',
    'waiting'
  )
on conflict do nothing;

-- -----------------------------------------------------------------------
-- 5. Demo medicine reminders for Ravi Kumar
-- -----------------------------------------------------------------------
insert into public.medicine_reminders
  (patient_id, medicine_name, dosage, reminder_time, frequency, active)
values
  ('11111111-1111-1111-1111-111111111004', 'Metformin',  '500mg', '08:00', 'daily', true),
  ('11111111-1111-1111-1111-111111111004', 'Amlodipine', '5mg',   '21:00', 'daily', true)
on conflict do nothing;
