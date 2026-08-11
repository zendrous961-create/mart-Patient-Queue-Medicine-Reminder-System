import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Alert from '../components/Alert.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await signIn(form)
      const dest = location.state?.from || (user.role === 'doctor' ? '/doctor' : '/patient')
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemo(role) {
    if (role === 'patient') setForm({ email: 'ravi.patient@queuecare.demo', password: 'demo1234' })
    else setForm({ email: 'anita.doctor@queuecare.demo', password: 'demo1234' })
  }

  return (
    <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-teal-500 text-xl text-white">+</span>
        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/55">Sign in to your queue and reminders.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <Alert type="error">{error}</Alert>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-ink/55">
          New here? <Link to="/signup" className="font-semibold text-teal-600 hover:underline">Create an account</Link>
        </p>
      </form>

      <div className="mt-5 card p-4 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Try a demo account</p>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => fillDemo('patient')} className="btn-secondary !px-3 !py-1.5 text-xs">
            Fill patient login
          </button>
          <button type="button" onClick={() => fillDemo('doctor')} className="btn-secondary !px-3 !py-1.5 text-xs">
            Fill doctor login
          </button>
        </div>
      </div>
    </div>
  )
}
