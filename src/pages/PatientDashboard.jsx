import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLiveTick } from '../context/DataContext.jsx'
import { appointments as appointmentsApi, doctors as doctorsApi, reminders as remindersApi } from '../services/mockApi.js'
import TokenTicket from '../components/TokenTicket.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useReminderAlerts, requestNotificationPermission } from '../hooks/useReminderAlerts.js'

export default function PatientDashboard() {
  const { user } = useAuth()
  const tick = useLiveTick()
  const [myAppointments, setMyAppointments] = useState([])
  const [doctorMap, setDoctorMap] = useState({})
  const [positions, setPositions] = useState({})
  const [myReminders, setMyReminders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [apts, docs, rems] = await Promise.all([
        appointmentsApi.listForPatient(user.id),
        doctorsApi.list(),
        remindersApi.listForPatient(user.id),
      ])
      if (cancelled) return
      setMyAppointments(apts)
      setDoctorMap(Object.fromEntries(docs.map((d) => [d.id, d])))
      setMyReminders(rems)

      const posEntries = await Promise.all(
        apts.filter((a) => a.status === 'waiting').map(async (a) => [a.id, await appointmentsApi.queuePosition(a.id)])
      )
      if (!cancelled) setPositions(Object.fromEntries(posEntries))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user.id, tick])

  const { dueReminder, clearDueReminder } = useReminderAlerts(myReminders)
  const activeAppointment = myAppointments.find((a) => a.status === 'waiting' || a.status === 'in-progress')
  const upcomingReminders = myReminders.filter((r) => r.active).slice(0, 3)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Hi, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-ink/55">Here's where things stand today.</p>
        </div>
        <button
          onClick={() => requestNotificationPermission()}
          className="btn-ghost text-xs"
          title="Allow browser notifications for reminders and queue alerts"
        >
          🔔 Enable notifications
        </button>
      </div>

      {dueReminder && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-600">
          <span>
            💊 It's time for <strong>{dueReminder.medicine_name}</strong> ({dueReminder.dosage})
          </span>
          <button onClick={clearDueReminder} className="btn-ghost !py-1 !px-2 text-xs">Dismiss</button>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Your current queue
        </h2>
        {loading ? (
          <div className="card p-6 text-sm text-ink/40">Loading…</div>
        ) : activeAppointment ? (
          <TokenTicket
            appointment={activeAppointment}
            doctorLabel={doctorMap[activeAppointment.doctor_id]?.name}
            subtitle={doctorMap[activeAppointment.doctor_id]?.specialization}
            right={
              activeAppointment.status === 'waiting' ? (
                <span className="text-center text-[11px] font-semibold text-teal-700">
                  {positions[activeAppointment.id]?.aheadCount ?? 0} ahead · ~
                  {positions[activeAppointment.id]?.etaMinutes ?? 0} min
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-teal-700">You're up!</span>
              )
            }
          />
        ) : (
          <EmptyState
            icon="🎟️"
            title="No active queue token"
            description="Book an appointment to get a digital token and see your live wait time."
            action={
              <Link to="/patient/book" className="btn-primary mt-2 !px-4 !py-2 text-sm">
                Book an appointment
              </Link>
            }
          />
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Upcoming reminders
          </h2>
          <Link to="/patient/reminders" className="text-xs font-semibold text-teal-600 hover:underline">
            Manage all
          </Link>
        </div>
        {upcomingReminders.length === 0 ? (
          <EmptyState
            icon="💊"
            title="No reminders set"
            description="Add your medicines so QueueCare can nudge you when it's time."
            action={
              <Link to="/patient/reminders" className="btn-secondary mt-2 !px-4 !py-2 text-sm">
                Add a reminder
              </Link>
            }
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {upcomingReminders.map((r) => (
              <div key={r.id} className="card p-4">
                <p className="font-display text-sm font-semibold">{r.medicine_name}</p>
                <p className="text-xs text-ink/50">{r.dosage} · {r.reminder_time} · {r.frequency}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Appointment history
        </h2>
        {myAppointments.length === 0 ? (
          <p className="text-sm text-ink/40">No appointments yet.</p>
        ) : (
          <div className="space-y-2">
            {myAppointments.map((a) => (
              <TokenTicket
                key={a.id}
                appointment={a}
                doctorLabel={doctorMap[a.doctor_id]?.name}
                subtitle={`${doctorMap[a.doctor_id]?.specialization || ''} · ${a.date}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
