/**
 * mockApi.js
 * ------------------------------------------------------------------
 * Prototype data layer. Every function here is shaped the way the
 * real Supabase call will be shaped, so wiring the real backend later
 * means rewriting the INSIDE of these functions, not the callers.
 *
 * Storage: browser localStorage (per-browser, not shared between
 * devices). Replace with `@supabase/supabase-js` queries — see
 * BACKEND_SETUP.md for the exact table/query mapping.
 *
 * "Realtime" is simulated with a tiny pub/sub emitter plus the
 * native `storage` event, so open tabs update within a second or two,
 * similar to how a Supabase realtime channel subscription behaves.
 * ------------------------------------------------------------------
 */

const KEYS = {
  users: 'qc_users',
  doctors: 'qc_doctors',
  appointments: 'qc_appointments',
  reminders: 'qc_reminders',
  prescriptions: 'qc_prescriptions',
  session: 'qc_session',
  seeded: 'qc_seeded_v1',
}

// ---------- low-level storage helpers ----------
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  emitter.dispatchEvent(new CustomEvent('change', { detail: { key } }))
}
function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10)
}

// ---------- pub/sub for "realtime" ----------
const emitter = new EventTarget()
export function subscribeToChanges(handler) {
  const listener = (e) => handler(e.detail)
  emitter.addEventListener('change', listener)
  // Also listen across-tab (native storage event only fires in OTHER tabs)
  const storageListener = (e) => {
    if (e.key && Object.values(KEYS).includes(e.key)) handler({ key: e.key })
  }
  window.addEventListener('storage', storageListener)
  return () => {
    emitter.removeEventListener('change', listener)
    window.removeEventListener('storage', storageListener)
  }
}

// ---------- seed demo data ----------
function seed() {
  if (read(KEYS.seeded, false)) return
  const doctors = [
    { id: 'doc_1', user_id: 'u_doc_1', name: 'Dr. Anita Rao', specialization: 'General Physician', avatar: '🩺', slots: ['09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00'] },
    { id: 'doc_2', user_id: 'u_doc_2', name: 'Dr. Karthik Iyer', specialization: 'Cardiology', avatar: '❤️', slots: ['10:00', '10:30', '11:00', '11:30', '12:00'] },
    { id: 'doc_3', user_id: 'u_doc_3', name: 'Dr. Meera Nair', specialization: 'Pediatrics', avatar: '🧒', slots: ['14:00', '14:20', '14:40', '15:00', '15:20'] },
  ]
  const users = [
    { id: 'u_doc_1', name: 'Dr. Anita Rao', email: 'anita.doctor@queuecare.demo', role: 'doctor', password: 'demo1234' },
    { id: 'u_doc_2', name: 'Dr. Karthik Iyer', email: 'karthik.doctor@queuecare.demo', role: 'doctor', password: 'demo1234' },
    { id: 'u_doc_3', name: 'Dr. Meera Nair', email: 'meera.doctor@queuecare.demo', role: 'doctor', password: 'demo1234' },
    { id: 'u_pat_1', name: 'Ravi Kumar', email: 'ravi.patient@queuecare.demo', role: 'patient', password: 'demo1234' },
  ]
  const today = new Date().toISOString().slice(0, 10)
  const appointments = [
    { id: 'apt_1', patient_id: 'u_pat_1', patient_name: 'Ravi Kumar', doctor_id: 'doc_1', date: today, time_slot: '09:00', token_number: 'Q-101', status: 'waiting', created_at: Date.now() - 1000 * 60 * 30 },
    { id: 'apt_2', patient_id: 'u_pat_demo_2', patient_name: 'Sandhya P.', doctor_id: 'doc_1', date: today, time_slot: '09:20', token_number: 'Q-102', status: 'waiting', created_at: Date.now() - 1000 * 60 * 20 },
    { id: 'apt_3', patient_id: 'u_pat_demo_3', patient_name: 'Imran Sheikh', doctor_id: 'doc_1', date: today, time_slot: '09:40', token_number: 'Q-103', status: 'waiting', created_at: Date.now() - 1000 * 60 * 10 },
  ]
  const reminders = [
    { id: 'rem_1', patient_id: 'u_pat_1', medicine_name: 'Metformin', dosage: '500mg', reminder_time: '08:00', frequency: 'daily', active: true, created_at: Date.now() },
    { id: 'rem_2', patient_id: 'u_pat_1', medicine_name: 'Amlodipine', dosage: '5mg', reminder_time: '21:00', frequency: 'daily', active: true, created_at: Date.now() },
  ]
  write(KEYS.users, users)
  write(KEYS.doctors, doctors)
  write(KEYS.appointments, appointments)
  write(KEYS.reminders, reminders)
  write(KEYS.prescriptions, [])
  localStorage.setItem(KEYS.seeded, JSON.stringify(true))
}
seed()

// ==================================================================
// AUTH  — replace internals with supabase.auth.signUp / signInWithPassword
// ==================================================================
export const auth = {
  async signUp({ name, email, password, role }) {
    const users = read(KEYS.users, [])
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.')
    }
    if (!name || !email || !password) throw new Error('All fields are required.')
    if (password.length < 6) throw new Error('Password must be at least 6 characters.')
    const user = { id: uid('u_'), name, email, role, password }
    users.push(user)
    write(KEYS.users, users)
    if (role === 'doctor') {
      const doctors = read(KEYS.doctors, [])
      doctors.push({
        id: uid('doc_'),
        user_id: user.id,
        name,
        specialization: 'General Physician',
        avatar: '🩺',
        slots: ['09:00', '09:30', '10:00', '10:30', '11:00'],
      })
      write(KEYS.doctors, doctors)
    }
    const session = { userId: user.id }
    localStorage.setItem(KEYS.session, JSON.stringify(session))
    return safeUser(user)
  },

  async signIn({ email, password }) {
    const users = read(KEYS.users, [])
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.')
    }
    localStorage.setItem(KEYS.session, JSON.stringify({ userId: user.id }))
    return safeUser(user)
  },

  async signOut() {
    localStorage.removeItem(KEYS.session)
  },

  async getSession() {
    const session = read(KEYS.session, null)
    if (!session) return null
    const users = read(KEYS.users, [])
    const user = users.find((u) => u.id === session.userId)
    return user ? safeUser(user) : null
  },
}
function safeUser(u) {
  const { password, ...rest } = u
  return rest
}

// ==================================================================
// DOCTORS — replace with `supabase.from('doctors').select(...)`
// ==================================================================
export const doctors = {
  async list() {
    return read(KEYS.doctors, [])
  },
  async get(id) {
    return read(KEYS.doctors, []).find((d) => d.id === id) || null
  },
}

// ==================================================================
// APPOINTMENTS — replace with `supabase.from('appointments')` queries
// + a `.channel('appointments').on('postgres_changes', ...)` subscription
// ==================================================================
export const appointments = {
  async listForDoctor(doctorId, date) {
    return read(KEYS.appointments, [])
      .filter((a) => a.doctor_id === doctorId && a.date === date)
      .sort((a, b) => a.created_at - b.created_at)
  },
  async listForPatient(patientId) {
    return read(KEYS.appointments, [])
      .filter((a) => a.patient_id === patientId)
      .sort((a, b) => b.created_at - a.created_at)
  },
  async book({ patientId, patientName, doctorId, date, timeSlot }) {
    const all = read(KEYS.appointments, [])
    const duplicate = all.find(
      (a) => a.patient_id === patientId && a.doctor_id === doctorId && a.date === date && a.time_slot === timeSlot && a.status !== 'cancelled'
    )
    if (duplicate) throw new Error('You already have a booking in this slot.')

    const slotTaken = all.find(
      (a) => a.doctor_id === doctorId && a.date === date && a.time_slot === timeSlot && a.status !== 'cancelled'
    )
    if (slotTaken) throw new Error('That time slot was just taken. Please pick another.')

    const sameDay = all.filter((a) => a.doctor_id === doctorId && a.date === date && a.status !== 'cancelled')
    const nextNumber = 101 + sameDay.length
    const appointment = {
      id: uid('apt_'),
      patient_id: patientId,
      patient_name: patientName,
      doctor_id: doctorId,
      date,
      time_slot: timeSlot,
      token_number: `Q-${nextNumber}`,
      status: 'waiting',
      created_at: Date.now(),
    }
    all.push(appointment)
    write(KEYS.appointments, all)
    return appointment
  },
  async updateStatus(id, status) {
    const all = read(KEYS.appointments, [])
    const idx = all.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Appointment not found.')
    all[idx] = { ...all[idx], status }
    write(KEYS.appointments, all)
    return all[idx]
  },
  async cancel(id) {
    return appointments.updateStatus(id, 'cancelled')
  },
  /** Returns { position, aheadCount, etaMinutes } for a waiting patient. */
  async queuePosition(appointmentId) {
    const all = read(KEYS.appointments, [])
    const target = all.find((a) => a.id === appointmentId)
    if (!target) return null
    const sameQueue = all
      .filter((a) => a.doctor_id === target.doctor_id && a.date === target.date && a.status !== 'cancelled')
      .sort((a, b) => a.created_at - b.created_at)
    const ahead = sameQueue.filter((a) => a.status === 'waiting' && a.created_at < target.created_at)
    const avgConsultMinutes = 12
    return {
      aheadCount: target.status === 'waiting' ? ahead.length : 0,
      etaMinutes: target.status === 'waiting' ? ahead.length * avgConsultMinutes : 0,
    }
  },
}

// ==================================================================
// MEDICINE REMINDERS — replace with `supabase.from('medicine_reminders')`
// ==================================================================
export const reminders = {
  async listForPatient(patientId) {
    return read(KEYS.reminders, [])
      .filter((r) => r.patient_id === patientId)
      .sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))
  },
  async create({ patientId, medicineName, dosage, reminderTime, frequency }) {
    if (!medicineName || !reminderTime) throw new Error('Medicine name and time are required.')
    const all = read(KEYS.reminders, [])
    const reminder = {
      id: uid('rem_'),
      patient_id: patientId,
      medicine_name: medicineName,
      dosage: dosage || '—',
      reminder_time: reminderTime,
      frequency: frequency || 'daily',
      active: true,
      created_at: Date.now(),
    }
    all.push(reminder)
    write(KEYS.reminders, all)
    return reminder
  },
  async toggleActive(id) {
    const all = read(KEYS.reminders, [])
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Reminder not found.')
    all[idx] = { ...all[idx], active: !all[idx].active }
    write(KEYS.reminders, all)
    return all[idx]
  },
  async remove(id) {
    const all = read(KEYS.reminders, []).filter((r) => r.id !== id)
    write(KEYS.reminders, all)
  },
}

// ==================================================================
// PRESCRIPTIONS — replace with `supabase.from('prescriptions')`
// ==================================================================
export const prescriptions = {
  async listForAppointment(appointmentId) {
    return read(KEYS.prescriptions, []).filter((p) => p.appointment_id === appointmentId)
  },
  async create({ appointmentId, notes }) {
    if (!notes || !notes.trim()) throw new Error('Notes cannot be empty.')
    const all = read(KEYS.prescriptions, [])
    const record = { id: uid('rx_'), appointment_id: appointmentId, notes: notes.trim(), created_at: Date.now() }
    all.push(record)
    write(KEYS.prescriptions, all)
    return record
  },
}
