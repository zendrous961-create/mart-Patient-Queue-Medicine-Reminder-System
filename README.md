# Smart Patient Queue & Medicine Reminder System

A full-stack web application for managing patient queues and medicine reminders at clinics.

**Stack**: React 18 + Vite + Tailwind CSS + Supabase (Auth, Postgres, Realtime)  
**Deployed on**: Netlify (frontend CDN) · Vercel (frontend mirror) · Supabase (backend)

---

## Demo Credentials

| Role    | Email                              | Password   |
|---------|------------------------------------|------------|
| Patient | `ravi.patient@queuecare.demo`      | `demo1234` |
| Doctor  | `anita.doctor@queuecare.demo`      | `demo1234` |
| Doctor  | `karthik.doctor@queuecare.demo`    | `demo1234` |
| Doctor  | `meera.doctor@queuecare.demo`      | `demo1234` |

> These accounts are created by `supabase/seed.sql`. See **Supabase Setup** below.

---

## Local Development Quick-Start

```bash
# 1. Install dependencies
npm install

# 2. Add your Supabase credentials (see Supabase Setup below)
cp .env.example .env
#  → edit .env and fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
# App runs at http://localhost:5173
```

---

## Supabase Setup

### Step 1 — Create a project
1. Go to [https://supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to your users

### Step 2 — Run the schema
1. In the Supabase dashboard, open **SQL Editor**
2. Paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
   - Creates all tables, RLS policies, indexes, and helper functions

### Step 3 — Seed demo data
1. In SQL Editor, paste and run [`supabase/seed.sql`](./supabase/seed.sql)
   - Inserts demo doctors + demo patient appointment

### Step 4 — Get your credentials
1. Go to **Project Settings → API**
2. Copy **Project URL** and **anon / public** key
3. Paste them into your `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

### Step 5 — Enable Realtime
1. In Supabase dashboard → **Database → Replication**
2. Enable Realtime for the `appointments` and `medicine_reminders` tables

---

## Deploying to Netlify

### Option A — Git-based CI/CD (recommended)
1. Push your project to GitHub / GitLab
2. Go to [https://app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
3. Connect your repo
4. Build settings are auto-detected from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. In **Site settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy site** — every push to `main` triggers a redeploy

### Option B — Drag & Drop
```bash
npm run build
# Drag the dist/ folder onto https://app.netlify.com/drop
```
Then add the env vars in Site settings.

---

## Deploying to Vercel

### Option A — Git-based CI/CD (recommended)
1. Go to [https://vercel.com](https://vercel.com) → **Add New → Project**
2. Import the same GitHub repo
3. Framework preset: **Vite** (auto-detected from `vercel.json`)
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy** — auto-deploys on every push

### Option B — Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
# Follow the prompts; set env vars when asked
```

---

## Project Structure

```
├── supabase/
│   ├── schema.sql          # Tables, RLS policies, Postgres functions
│   └── seed.sql            # Demo data
├── src/
│   ├── services/
│   │   ├── supabaseClient.js   # Supabase singleton
│   │   ├── api.js              # All data access (auth, appointments, etc.)
│   │   └── mockApi.js          # Old mock layer (kept for reference)
│   ├── context/
│   │   ├── AuthContext.jsx     # User session state + Supabase auth events
│   │   └── DataContext.jsx     # Realtime tick (Supabase postgres_changes)
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── PatientDashboard.jsx
│   │   ├── BookAppointment.jsx
│   │   ├── MedicineReminders.jsx
│   │   └── DoctorDashboard.jsx
│   ├── components/
│   └── App.jsx
├── netlify.toml            # Netlify build + SPA redirect rule
├── vercel.json             # Vercel build + SPA rewrite rule
└── vite.config.js
```

---

## Features

- **Role-based auth** — Patients and Doctors have separate dashboards
- **Appointment booking** — Pick doctor → date → time slot → get a queue token
- **Live queue** — Powered by Supabase Realtime (postgres_changes events)
- **Medicine reminders** — Add/pause/resume/remove reminders with browser notifications
- **Doctor queue management** — Call next patient, mark completed, add prescriptions
- **Double-booking protection** — Unique partial index in Postgres (not just frontend)
- **Race-condition-safe tokens** — Token numbers generated via a Postgres function

---

## Environment Variables

| Variable               | Required | Description                          |
|------------------------|----------|--------------------------------------|
| `VITE_SUPABASE_URL`    | ✅        | Your Supabase project URL            |
| `VITE_SUPABASE_ANON_KEY` | ✅      | Supabase anon / public API key       |

Add these to:
- Local dev: `.env` (gitignored)
- Netlify: Site Settings → Environment Variables
- Vercel: Project Settings → Environment Variables
