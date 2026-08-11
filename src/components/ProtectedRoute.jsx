import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-ink/50">Loading…</div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'doctor' ? '/doctor' : '/patient'} replace />
  }
  return children
}
