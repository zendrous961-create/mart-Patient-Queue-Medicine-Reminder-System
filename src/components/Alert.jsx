const STYLES = {
  error: 'bg-coral-50 text-coral-600 border-coral-400/30',
  success: 'bg-sage-50 text-sage-600 border-sage-400/30',
  info: 'bg-teal-50 text-teal-700 border-teal-500/20',
}

export default function Alert({ type = 'info', children }) {
  if (!children) return null
  return (
    <div role="alert" className={`rounded-lg border px-3.5 py-2.5 text-sm ${STYLES[type]}`}>
      {children}
    </div>
  )
}
