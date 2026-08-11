import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useLiveTick } from '../context/DataContext.jsx'
import { appointments as appointmentsApi, doctors as doctorsApi, prescriptions as prescriptionsApi } from '../services/mockApi.js'
import StatusBadge from '../components/StatusBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Alert from '../components/Alert.jsx'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function DoctorDashboard() {
  const { user } = useAuth()
  const tick = useLiveTick()
  const [myDoctorProfile, setMyDoctorProfile] = useState(null)
  const [date, setDate] = useState(todayStr())
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [noteDraftFor, setNoteDraftFor] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [noteError, setNoteError] = useState('')
  const [savedNotes, setSavedNotes] = useState({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      const docs = await doctorsApi.list()
      const mine = docs.find((d) => d.user_id === user.id) || docs[0]
      if (cancelled) return
      setMyDoctorProfile(mine)
      if (mine) {
        const apts = await appointmentsApi.listForDoctor(mine.id, date)
        if (!cancelled) setQueue(apts.filter((a) => a.status !== 'cancelled'))
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user.id, date, tick])

  const waiting = queue.filter((a) => a.status === 'waiting')
  const inProgress = queue.find((a) => a.status === 'in-progress')
  const completed = queue.filter((a) => a.status === 'completed')

  async function startNext() {
    const next = waiting[0]
    if (!next) return
    await appointmentsApi.updateStatus(next.id, 'in-progress')
  }

  async function completeCurrent(id) {
    await appointmentsApi.updateStatus(id, 'completed')
  }

  function openNotes(appointmentId) {
    setNoteDraftFor(appointmentId)
    setNoteText('')
    setNoteError('')
  }

  async function saveNotes() {
    setNoteError('')
    try {
      await prescriptionsApi.create({ appointmentId: noteDraftFor, notes: noteText })
      setSavedNotes((prev) => ({ ...prev, [noteDraftFor]: noteText }))
      setNoteDraftFor(null)
    } catch (err) {
      setNoteError(err.message)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-ink/40">Loading queue…</div>
  }

  if (!myDoctorProfile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState icon="🩺" title="No doctor profile found" description="Your account isn't linked to a doctor profile yet." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {myDoctorProfile.avatar} {myDoctorProfile.name}
          </h1>
          <p className="text-sm text-ink/55">{myDoctorProfile.specialization} · today's queue</p>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input max-w-[160px]" />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Waiting</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-600">{waiting.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">In progress</p>
          <p className="mt-1 font-display text-2xl font-semibold text-teal-600">{inProgress ? 1 : 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Completed</p>
          <p className="mt-1 font-display text-2xl font-semibold text-sage-600">{completed.length}</p>
        </div>
      </div>

      {inProgress ? (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">Now consulting</h2>
          <div className="ticket">
            <div className="flex flex-1 items-center gap-4 px-5 py-4">
              <div className="font-mono text-2xl font-semibold text-teal-700">{inProgress.token_number}</div>
              <div>
                <p className="font-display text-sm font-semibold">{inProgress.patient_name}</p>
                <p className="text-xs text-ink/50">Slot {inProgress.time_slot}</p>
              </div>
            </div>
            <div className="ticket-perforation" aria-hidden="true" />
            <div className="flex w-44 flex-col items-center justify-center gap-2 px-3 py-4">
              <button onClick={() => openNotes(inProgress.id)} className="btn-secondary w-full !py-1.5 text-xs">
                Add notes
              </button>
              <button onClick={() => completeCurrent(inProgress.id)} className="btn-primary w-full !py-1.5 text-xs">
                Mark completed
              </button>
            </div>
          </div>
        </section>
      ) : (
        waiting.length > 0 && (
          <div className="mb-8">
            <button onClick={startNext} className="btn-primary">
              ▶ Call next patient — {waiting[0].token_number}
            </button>
          </div>
        )
      )}

      {noteDraftFor && (
        <div className="mb-8 card space-y-3 p-5">
          <h3 className="font-display text-sm font-semibold">Prescription notes</h3>
          <textarea
            className="input min-h-[100px]"
            placeholder="e.g. Continue Metformin 500mg, review in 2 weeks…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Alert type="error">{noteError}</Alert>
          <div className="flex gap-2">
            <button onClick={saveNotes} className="btn-primary !px-4 !py-2 text-sm">Save notes</button>
            <button onClick={() => setNoteDraftFor(null)} className="btn-ghost !px-4 !py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Waiting ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <EmptyState icon="✅" title="Queue is empty" description="No patients waiting for this date." />
        ) : (
          <div className="space-y-2">
            {waiting.map((a, i) => (
              <div key={a.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-teal-700">{a.token_number}</span>
                  <div>
                    <p className="font-display text-sm font-semibold">{a.patient_name}</p>
                    <p className="text-xs text-ink/50">Slot {a.time_slot}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="text-[11px] font-semibold text-amber-600">Next</span>}
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((a) => (
              <div key={a.id} className="card flex items-center justify-between gap-3 p-4 opacity-70">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-teal-700">{a.token_number}</span>
                  <p className="font-display text-sm font-semibold">{a.patient_name}</p>
                  {savedNotes[a.id] && <span className="text-xs text-ink/40">· notes added</span>}
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
