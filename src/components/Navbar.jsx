import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const links =
    user?.role === 'doctor'
      ? [{ to: '/doctor', label: 'Queue' }]
      : user?.role === 'patient'
      ? [
          { to: '/patient', label: 'Dashboard' },
          { to: '/patient/book', label: 'Book visit' },
          { to: '/patient/reminders', label: 'Reminders' },
        ]
      : []

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-teal-700">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 text-white">
            +
          </span>
          QueueCare
        </NavLink>

        {user && (
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/doctor' || l.to === '/patient'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-teal-50 text-teal-700' : 'text-ink/60 hover:bg-black/5 hover:text-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-ink/60 sm:inline">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
              <button onClick={handleSignOut} className="btn-ghost !px-3 !py-2 text-sm">
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn-primary !px-4 !py-2 text-sm">
              Sign in
            </NavLink>
          )}
        </div>
      </div>

      {user && (
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-1.5 sm:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/doctor' || l.to === '/patient'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-ink/60'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
