/**
 * api.js
 * ------------------------------------------------------------------
 * Real Supabase data layer — drop-in replacement for mockApi.js.
 * Every exported function keeps the SAME signature as the mock so
 * no page or component needs to change.
 *
 * Import path change required in context files:
 *   - AuthContext.jsx  → import from '../services/api.js'
 *   - DataContext.jsx  → import from '../services/api.js'
 * ------------------------------------------------------------------
 */

import { supabase } from './supabaseClient.js'

// ==================================================================
// AUTH
// ==================================================================
export const auth = {
  /**
   * Sign up a new user with role selection.
   * Creates an auth.users entry + a public.users row + (if doctor)
   * a public.doctors row.
   */
  async signUp({ name, email, password, role }) {
    if (!name || !email || !password) throw new Error('All fields are required.')
    if (password.length < 6) throw new Error('Password must be at least 6 characters.')

    // 1. Create the Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })
    if (authError) throw new Error(authError.message)

    const userId = authData.user?.id
    if (!userId) throw new Error('Sign-up succeeded but no user ID was returned.')

    // 2. Insert into public.users
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      name,
      email,
      role,
    })
    if (userError) throw new Error(userError.message)

    // 3. If doctor, create a doctors row
    if (role === 'doctor') {
      const { error: docError } = await supabase.from('doctors').insert({
        user_id: userId,
        name,
        specialization: 'General Physician',
        avatar: '🩺',
        available_slots: ['09:00', '09:30', '10:00', '10:30', '11:00'],
      })
      if (docError) throw new Error(docError.message)
    }

    return _publicUser(authData.user, { name, email, role })
  },

  /**
   * Sign in with email + password.
   */
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data?.user) throw new Error('Invalid email or password.')

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    if (userRow) return userRow

    // Fallback if public.users row was created in seed or auth metadata
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || 'User',
      role: data.user.user_metadata?.role || 'patient',
    }
  },

  /**
   * Sign out the current user.
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  /**
   * Restore session on page load.
   * Returns the public.users row (with role) or null.
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    if (userRow) return userRow

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || 'User',
      role: session.user.user_metadata?.role || 'patient',
    }
  },

  /**
   * Subscribe to auth state changes (login / logout / token refresh).
   * Returns an unsubscribe function.
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          callback(null)
          return
        }
        const { data: userRow } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        callback(
          userRow || {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || 'User',
            role: session.user.user_metadata?.role || 'patient',
          }
        )
      }
    )
    return () => subscription.unsubscribe()
  },
}

/** Strip auth internals, keep public fields */
function _publicUser(authUser, extra = {}) {
  return {
    id: authUser.id,
    email: authUser.email,
    name: extra.name || authUser.user_metadata?.name,
    role: extra.role || authUser.user_metadata?.role,
  }
}

// ==================================================================
// DOCTORS
// ==================================================================
export const doctors = {
  async list() {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('name')
    if (error) throw new Error(error.message)
    return data
  },

  async get(id) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },
}

// ==================================================================
// APPOINTMENTS
// ==================================================================
export const appointments = {
  async listForDoctor(doctorId, date) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .order('created_at')
    if (error) throw new Error(error.message)
    return data
  },

  async listForPatient(patientId) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  },

  async book({ patientId, patientName, doctorId, date, timeSlot }) {
    // Generate a race-condition-safe token number via Postgres RPC
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'next_token_number',
      { p_doctor_id: doctorId, p_date: date }
    )
    if (tokenError) throw new Error(tokenError.message)

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id:   patientId,
        patient_name: patientName,
        doctor_id:    doctorId,
        date,
        time_slot:    timeSlot,
        token_number: tokenData,
        status:       'waiting',
      })
      .select()
      .single()

    if (error) {
      // PostgreSQL unique violation (23505) → slot was taken
      if (error.code === '23505') {
        throw new Error('That time slot was just taken. Please pick another.')
      }
      throw new Error(error.message)
    }
    return data
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async cancel(id) {
    return appointments.updateStatus(id, 'cancelled')
  },

  /**
   * Returns { aheadCount, etaMinutes } via Postgres RPC.
   * Matches the shape returned by the mock layer.
   */
  async queuePosition(appointmentId) {
    const { data, error } = await supabase.rpc('get_queue_position', {
      appt_id: appointmentId,
    })
    if (error || !data || data.length === 0) return { aheadCount: 0, etaMinutes: 0 }
    const row = data[0]
    return {
      aheadCount: row.ahead_count,
      etaMinutes: row.eta_minutes,
    }
  },
}

// ==================================================================
// MEDICINE REMINDERS
// ==================================================================
export const reminders = {
  async listForPatient(patientId) {
    const { data, error } = await supabase
      .from('medicine_reminders')
      .select('*')
      .eq('patient_id', patientId)
      .order('reminder_time')
    if (error) throw new Error(error.message)
    // Normalise field names to match mock API (reminder_time stays as-is)
    return data.map(_normaliseReminder)
  },

  async create({ patientId, medicineName, dosage, reminderTime, frequency }) {
    if (!medicineName || !reminderTime) {
      throw new Error('Medicine name and time are required.')
    }
    const { data, error } = await supabase
      .from('medicine_reminders')
      .insert({
        patient_id:    patientId,
        medicine_name: medicineName,
        dosage:        dosage || '—',
        reminder_time: reminderTime,
        frequency:     frequency || 'daily',
        active:        true,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return _normaliseReminder(data)
  },

  async toggleActive(id) {
    // Read current value, then flip it
    const { data: current, error: readErr } = await supabase
      .from('medicine_reminders')
      .select('active')
      .eq('id', id)
      .single()
    if (readErr) throw new Error(readErr.message)

    const { data, error } = await supabase
      .from('medicine_reminders')
      .update({ active: !current.active })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return _normaliseReminder(data)
  },

  async remove(id) {
    const { error } = await supabase
      .from('medicine_reminders')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}

/** Map DB column names to the field names the components expect */
function _normaliseReminder(r) {
  return {
    ...r,
    medicine_name: r.medicine_name,  // same
    reminder_time: r.reminder_time,  // same
  }
}

// ==================================================================
// PRESCRIPTIONS
// ==================================================================
export const prescriptions = {
  async listForAppointment(appointmentId) {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at')
    if (error) throw new Error(error.message)
    return data
  },

  async create({ appointmentId, notes }) {
    if (!notes || !notes.trim()) throw new Error('Notes cannot be empty.')
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({ appointment_id: appointmentId, notes: notes.trim() })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ==================================================================
// REALTIME SUBSCRIPTIONS
// ==================================================================
/**
 * Subscribe to any change on the appointments table.
 * Replaces the mock's localStorage event emitter + polling.
 *
 * @param {Function} handler  Called with { table, eventType, new, old }
 * @returns {Function}        Unsubscribe function
 */
export function subscribeToChanges(handler) {
  const channel = supabase
    .channel('realtime-appointments')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments' },
      (payload) => handler({ key: 'appointments', payload })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'medicine_reminders' },
      (payload) => handler({ key: 'medicine_reminders', payload })
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
