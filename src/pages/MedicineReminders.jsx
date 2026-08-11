import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useLiveTick } from '../context/DataContext.jsx'
import { reminders as remindersApi } from '../services/mockApi.js'
import Alert from '../components/Alert.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { requestNotificationPermission } from '../hooks/useReminderAlerts.js'

const EMPTY_FORM = { medicineName: '', dosage: '', reminderTime: '', frequency: 'daily' }

export default function MedicineReminders() {
  const { user } = useAuth()
  const tick = useLiveTick()
  const [list, setList] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    remindersApi.listForPatient(user.id).then(setList)
  }, [user.id, tick])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await remindersApi.create({ patientId: user.id, ...form })
      requestNotificationPermission()
      setForm(EMPTY_FORM)
      setList(await remindersApi.listForPatient(user.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id) {
    await remindersApi.toggleActive(id)
    setList(await remindersApi.listForPatient(user.id))
  }

  async function handleRemove(id) {
    await remindersApi.remove(id)
    setList(await remindersApi.listForPatient(user.id))
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold">Medicine reminders</h1>
      <p className="mt-1 text-sm text-ink/55">Set a time and frequency — QueueCare will alert you here in-app, and via a browser notification if enabled.</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="medicineName">Medicine name</label>
            <input
              id="medicineName"
              required
              className="input"
              placeholder="e.g. Metformin"
              value={form.medicineName}
              onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="dosage">Dosage</label>
            <input
              id="dosage"
              className="input"
              placeholder="e.g. 500mg"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="reminderTime">Time</label>
            <input
              id="reminderTime"
              type="time"
              required
              className="input"
              value={form.reminderTime}
              onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="frequency">Frequency</label>
            <select
              id="frequency"
              className="input"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="twice-daily">Twice daily</option>
              <option value="weekly">Weekly</option>
              <option value="as-needed">As needed</option>
            </select>
          </div>
        </div>

        <Alert type="error">{error}</Alert>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Adding…' : '+ Add reminder'}
        </button>
      </form>

      <div className="mt-8">
        {list.length === 0 ? (
          <EmptyState icon="💊" title="No reminders yet" description="Add your first medicine reminder above." />
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <div key={r.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold">{r.medicine_name}</p>
                  <p className="text-xs text-ink/50">
                    {r.dosage} · {r.reminder_time} · {r.frequency.replace('-', ' ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleToggle(r.id)}
                    className={r.active ? 'badge-progress' : 'badge bg-black/5 text-ink/40'}
                  >
                    {r.active ? 'Active' : 'Paused'}
                  </button>
                  <button onClick={() => handleRemove(r.id)} className="btn-danger !px-2.5 !py-1.5 text-xs">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
