import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Landing() {
  const { user } = useAuth()
  const homeLink = user ? (user.role === 'doctor' ? '/doctor' : '/patient') : '/signup'

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span className="badge-waiting mb-4">Live token Q-104 · 3 ahead of you</span>
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Skip the waiting room. <span className="text-teal-600">Not your turn.</span>
          </h1>
          <p className="mt-4 max-w-md text-ink/60">
            QueueCare turns a clinic's paper queue into a live digital token, and
            keeps patients on schedule with their medicines in between visits.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={homeLink} className="btn-primary !px-5 !py-3">
              {user ? 'Go to my dashboard' : 'Get started'}
            </Link>
            {!user && (
              <Link to="/login" className="btn-secondary !px-5 !py-3">
                I already have an account
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="ticket">
            <div className="flex flex-1 items-center gap-4 px-5 py-4">
              <div className="font-mono text-2xl font-semibold text-teal-700">Q-104</div>
              <div>
                <p className="font-display text-sm font-semibold">Dr. Anita Rao</p>
                <p className="text-xs text-ink/50">General Physician · 10:00</p>
              </div>
            </div>
            <div className="ticket-perforation" aria-hidden="true" />
            <div className="flex w-32 flex-col items-center justify-center gap-1.5 px-3 py-4">
              <span className="badge-waiting">Waiting</span>
              <span className="text-[11px] text-ink/40">~36 min</span>
            </div>
          </div>
          <div className="card flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-display text-sm font-semibold">Metformin · 500mg</p>
              <p className="text-xs text-ink/50">Daily · 8:00 AM</p>
            </div>
            <span className="badge-progress">Active</span>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          { icon: '🎟️', title: 'Digital tokens', desc: 'Book a slot and get an auto-generated queue number, no paper needed.' },
          { icon: '📡', title: 'Live wait times', desc: 'See exactly how many patients are ahead, updated as the queue moves.' },
          { icon: '💊', title: 'Medicine reminders', desc: 'Schedule doses by time and frequency, with in-app and browser alerts.' },
        ].map((f) => (
          <div key={f.title} className="card p-5">
            <span className="text-2xl" aria-hidden="true">{f.icon}</span>
            <h3 className="mt-2 font-display text-sm font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-ink/55">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
