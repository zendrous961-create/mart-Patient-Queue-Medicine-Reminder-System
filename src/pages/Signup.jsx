import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Alert from '../components/Alert.jsx'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await signUp(form)
      navigate(user.role === 'doctor' ? '/doctor' : '/patient', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-teal-500 text-xl text-white">+</span>
        <h1 className="font-display text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-ink/55">Choose how you'll use QueueCare.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <Alert type="error">{error}</Alert>

        <div>
          <span className="label">I am a</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'patient', label: 'Patient', icon: '🙋' },
              { value: 'doctor', label: 'Doctor', icon: '🩺' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, role: opt.value })}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                  form.role === opt.value
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-line bg-white text-ink/60 hover:border-teal-300'
                }`}
              >
                <span className="mr-1.5">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input
            id="name"
            required
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

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
            minLength={6}
            autoComplete="new-password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <p className="mt-1 text-xs text-ink/40">At least 6 characters.</p>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-ink/55">
          Already have an account? <Link to="/login" className="font-semibold text-teal-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
