import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { doctors as doctorsApi, appointments as appointmentsApi } from '../services/mockApi.js'
import Alert from '../components/Alert.jsx'
import EmptyState from '../components/EmptyState.jsx'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function BookAppointment() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [date, setDate] = useState(todayStr())
  const [takenSlots, setTakenSlots] = useState([])
  const [slot, setSlot] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    doctorsApi.list().then((docs) => {
      setDoctors(docs)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setSlot(null)
    setError('')
    if (!selectedDoctor) {
      setTakenSlots([])
      return
    }
    appointmentsApi.listForDoctor(selectedDoctor.id, date).then((apts) => {
      setTakenSlots(apts.filter((a) => a.status !== 'cancelled').map((a) => a.time_slot))
    })
  }, [selectedDoctor, date])

  async function handleBook() {
    setError('')
    setSuccess('')
    if (!selectedDoctor || !slot) {
      setError('Choose a doctor and a time slot first.')
      return
    }
    setSubmitting(true)
    try {
      const appt = await appointmentsApi.book({
        patientId: user.id,
        patientName: user.name,
        doctorId: selectedDoctor.id,
        date,
        timeSlot: slot,
      })
      setSuccess(`Booked! Your token is ${appt.token_number}.`)
      setTimeout(() => navigate('/patient'), 900)
    } catch (err) {
      setError(err.message)
      // Slot may have just been taken by someone else — refresh availability.
      const apts = await appointmentsApi.listForDoctor(selectedDoctor.id, date)
      setTakenSlots(apts.filter((a) => a.status !== 'cancelled').map((a) => a.time_slot))
      setSlot(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold">Book an appointment</h1>
      <p className="mt-1 text-sm text-ink/55">Pick a doctor, date, and time — you'll get a digital token instantly.</p>

      <div className="mt-6 space-y-6">
        <div>
          <h2 className="label">1. Choose a doctor</h2>
          {loading ? (
            <p className="text-sm text-ink/40">Loading doctors…</p>
          ) : doctors.length === 0 ? (
            <EmptyState icon="🩺" title="No doctors available" description="Please check back later." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {doctors.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoctor(doc)}
                  className={`card p-4 text-left transition ${
                    selectedDoctor?.id === doc.id ? '!border-teal-500 ring-1 ring-teal-500' : 'hover:border-teal-300'
                  }`}
                >
                  <span className="text-xl">{doc.avatar}</span>
                  <p className="mt-1 font-display text-sm font-semibold">{doc.name}</p>
                  <p className="text-xs text-ink/50">{doc.specialization}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="date">2. Choose a date</label>
          <input
            id="date"
            type="date"
            min={todayStr()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input max-w-xs"
          />
        </div>

        {selectedDoctor && (
          <div>
            <h2 className="label">3. Choose a time slot</h2>
            <div className="flex flex-wrap gap-2">
              {selectedDoctor.slots.map((s) => {
                const taken = takenSlots.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={taken}
                    onClick={() => setSlot(s)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
                      slot === s ? 'border-teal-500 bg-teal-500 text-white' : 'border-line bg-white hover:border-teal-300'
                    }`}
                  >
                    {s}
                    {taken && <span className="ml-1 text-xs">· full</span>}
                  </button>
                )
              })}
            </div>
            {selectedDoctor.slots.every((s) => takenSlots.includes(s)) && (
              <p className="mt-2 text-sm text-coral-600">All slots for this date are booked — try another date.</p>
            )}
          </div>
        )}

        <Alert type="error">{error}</Alert>
        <Alert type="success">{success}</Alert>

        <button
          onClick={handleBook}
          disabled={submitting || !selectedDoctor || !slot}
          className="btn-primary w-full sm:w-auto"
        >
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </div>
  )
}
