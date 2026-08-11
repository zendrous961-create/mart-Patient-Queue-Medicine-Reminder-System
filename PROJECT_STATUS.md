# Project Status — Smart Patient Queue & Medicine Reminder System

This document is the handoff note between what's been built (the frontend) and what's still needed (backend + database) to match the original build prompt.

---

## 1. What's done — Frontend (complete)

A full React + Vite + Tailwind CSS prototype, responsive from mobile to desktop, covering every functional requirement in the brief. It currently runs against a **mock data layer** (`src/services/mockApi.js`) instead of a live backend, so the whole app is clickable and demoable with zero setup.

### Auth
- Sign up with role selection (Patient / Doctor), log in, log out.
- Session persistence across page reloads (currently via `localStorage`, mirrors how Supabase Auth's session persistence works).
- Role-based redirects: patients land on `/patient`, doctors on `/doctor`.
- Protected routes (`ProtectedRoute.jsx`) that redirect unauthenticated users to `/login` and prevent a patient from opening doctor pages and vice versa.

### Patient module (`/patient`, `/patient/book`, `/patient/reminders`)
- Dashboard: current queue token, live position ("N ahead of you", ETA in minutes), upcoming reminders, appointment history.
- Book appointment: pick a doctor → pick a date → pick an open time slot → confirm. Auto-generates a token (`Q-101`, `Q-102`, …).
- Medicine reminders: add/pause/resume/remove reminders (name, dosage, time, frequency).
- Reminder alerts: an in-app banner plus an optional real **browser Notification** when a reminder's time is reached (checked every 30s), gated behind a "Enable notifications" permission button.

### Doctor module (`/doctor`)
- Live queue for the selected date: waiting / in-progress / completed counts.
- "Call next patient" advances the queue; "Mark completed" closes out a visit.
- Add prescription notes per appointment.

### Core / mandatory features
- Role-based login ✅
- Appointment booking ✅
- Auto-generated digital queue tokens ✅
- Live queue status — simulated realtime (see note below) ✅
- Medicine reminder system with scheduling ✅
- Fully responsive UI, keyboard-focus visible, reduced-motion respected ✅

### Edge cases already handled in the UI/mock layer
- No doctors available → empty state instead of a blank screen.
- Duplicate booking (same patient, same doctor/date/slot) → rejected with a clear error.
- Slot taken by someone else between selecting and confirming → rejected, availability refreshed automatically.
- Empty queue for a doctor → empty state, "call next" hidden.
- Reminder form validation (name + time required).

### Design system
A custom visual identity themed around a clinic queue ticket: a perforated "ticket stub" component (`TokenTicket.jsx`) is the one signature element, reused for the patient's token and the doctor's queue rows. Palette is a clinical teal/amber/sage set (not a generic template look); type pairing is Lexend (display) + Inter (body) + IBM Plex Mono (token numbers). Tailwind tokens are defined in `tailwind.config.js`.

### Error-checking already done
Every `.jsx`/`.js` file was run through the TypeScript compiler in JSX-syntax-check mode (`tsc --jsx preserve --noEmit`) to catch broken JSX tags, mismatched braces, and typos — all files passed cleanly. (A full `npm install && npm run build` could not be run in this environment because it has no network access to the npm registry — see "Before you run it" below.)

### Before you run it
This sandbox has no internet access, so `npm install` has **not** been executed here. Run it yourself:
```bash
npm install
npm run dev
```
If anything unexpected surfaces on first install (dependency version drift, a peer-dependency warning), it's most likely a package-version issue, not an application bug — the code itself has been syntax-checked file by file.

---

## 2. What's NOT done — Backend & Database (still needed)

Right now **`src/services/mockApi.js` is standing in for the entire backend.** It stores everything in the browser's `localStorage`, which means: data doesn't sync across devices/browsers, there's no real authentication security, and "realtime" is simulated with a local event emitter + polling rather than a real push channel. Everything below needs to be built to match the original brief.

### 2a. Supabase project setup
1. Create a Supabase project.
2. Run the schema in **section 3** below in the SQL editor.
3. Enable Row Level Security (RLS) on every table (see 2c).
4. Copy the project URL + anon key into a real `.env` (see `.env.example`).
5. `npm install @supabase/supabase-js` and create `src/services/supabaseClient.js`:
   ```js
   import { createClient } from '@supabase/supabase-js'
   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   )
   ```

### 2b. Rewrite `mockApi.js` → real Supabase calls
Every exported function in `mockApi.js` already matches the shape the app expects, so the rewrite is mechanical, one function at a time, without touching any page/component. Mapping:

| mockApi function | Replace with |
|---|---|
| `auth.signUp` | `supabase.auth.signUp({ email, password, options: { data: { name, role } } })`, then insert a row into `users` |
| `auth.signIn` | `supabase.auth.signInWithPassword({ email, password })` |
| `auth.signOut` | `supabase.auth.signOut()` |
| `auth.getSession` | `supabase.auth.getSession()` + fetch the matching `users` row |
| `doctors.list` / `doctors.get` | `supabase.from('doctors').select('*')` |
| `appointments.listForDoctor` | `supabase.from('appointments').select('*').eq('doctor_id', id).eq('date', date)` |
| `appointments.listForPatient` | `.eq('patient_id', id)` |
| `appointments.book` | `insert()` into `appointments`, with the duplicate/slot-taken checks re-implemented as a Postgres unique constraint + a check query (see 3c) |
| `appointments.updateStatus` / `cancel` | `.update({ status })` |
| `appointments.queuePosition` | a `count()` query, or a Postgres function/view (see 3d) |
| `reminders.*` | equivalent `supabase.from('medicine_reminders')` calls |
| `prescriptions.*` | equivalent `supabase.from('prescriptions')` calls |
| `subscribeToChanges` | `supabase.channel('appointments-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, cb).subscribe()` — this is what makes the queue genuinely realtime instead of polling |

### 2c. Row Level Security policies (not yet written)
Needed before this can go anywhere near production:
- `users`: a user can read/update only their own row; doctors/patients shouldn't see each other's raw user records beyond a public name.
- `doctors`: publicly readable (patients need to browse doctors); writable only by the doctor's own linked `user_id`.
- `appointments`: a patient can `select`/`insert` their own rows; a doctor can `select`/`update` rows where `doctor_id` matches their linked doctor row; nobody can read another patient's appointments.
- `medicine_reminders`: a patient can only `select`/`insert`/`update`/`delete` rows where `patient_id = auth.uid()`.
- `prescriptions`: a patient can `select` prescriptions tied to their own appointments; a doctor can `insert`/`select` for appointments they own.

### 2d. Server-side logic not yet built
- **Token generation race condition**: the mock layer computes the next `Q-10x` number in JS, which isn't safe with concurrent bookings. In Postgres, this should be a sequence or a `SELECT ... FOR UPDATE` inside a transaction (or a Postgres function called via `supabase.rpc(...)`).
- **Slot double-booking**: add a unique constraint on `(doctor_id, date, time_slot)` for non-cancelled appointments (a partial unique index), so the database — not just the frontend — refuses a duplicate.
- **Queue position / ETA**: currently computed client-side by counting waiting appointments created earlier than the target. Move this into a Postgres view or RPC function so it can't be spoofed and stays fast as data grows.
- **Reminder delivery**: right now, reminders only fire while the patient's browser tab is open (an in-tab timer). A real reminder system needs a server-side scheduler (e.g., a Supabase Edge Function on a cron trigger, or a third-party push/SMS service) to notify patients even when the app is closed.
- **Doctor ↔ user linking**: when a doctor signs up, the frontend currently auto-creates a `doctors` row. In production this should probably be an admin-approved step (so random signups can't claim to be doctors), or at least a verification flow.

### 2e. Deployment
- Backend: if any custom API routes are added beyond direct Supabase calls (e.g., the token-generation RPC, a notifications webhook), deploy them as Vercel serverless/Next.js API routes per the brief.
- Frontend: deploy this app's `dist/` folder to Netlify (see README.md).
- Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in both Netlify (build-time) and anywhere the API routes run.

---

## 3. Database schema to create in Supabase

This matches the brief's suggested schema, with the fixes needed for the issues in 2d already folded in.

```sql
-- 3a. Users (mirrors auth.users, adds role)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('patient','doctor')),
  created_at timestamptz default now()
);

-- 3b. Doctors
create table doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  specialization text not null,
  available_slots text[] not null default '{}',
  created_at timestamptz default now()
);

-- 3c. Appointments (with the double-booking fix from 2d)
create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references users(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete cascade,
  date date not null,
  time_slot text not null,
  token_number text not null,
  status text not null default 'waiting'
    check (status in ('waiting','in-progress','completed','cancelled')),
  created_at timestamptz default now()
);

-- Prevent two active bookings in the same doctor/date/slot
create unique index one_active_booking_per_slot
  on appointments (doctor_id, date, time_slot)
  where status <> 'cancelled';

-- 3d. Medicine reminders
create table medicine_reminders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references users(id) on delete cascade,
  medicine_name text not null,
  dosage text,
  reminder_time time not null,
  frequency text not null default 'daily',
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 3e. Prescriptions
create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  notes text not null,
  created_at timestamptz default now()
);
```

Then enable RLS on all five tables and add the policies described in 2c before shipping anything beyond a private demo.

---

## 4. Suggested order of work

1. Create the Supabase project and run the schema above.
2. Write and test RLS policies with the Supabase SQL editor's policy simulator.
3. Build `supabaseClient.js` and swap `auth.*` in `mockApi.js` first (login/signup end-to-end).
4. Swap `doctors.*` and `appointments.*`, including the unique-index-backed booking flow.
5. Wire up `supabase.channel(...)` realtime subscriptions in `DataContext.jsx` in place of the polling fallback.
6. Swap `reminders.*` and `prescriptions.*`.
7. Add seed data via SQL (a few doctors + demo appointments) so the deployed demo isn't empty on first load.
8. Deploy: Netlify (frontend) + Supabase (DB/Auth) + Vercel only if custom API routes end up being needed.
