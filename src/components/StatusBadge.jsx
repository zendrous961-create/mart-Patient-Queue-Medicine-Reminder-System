const CONFIG = {
  waiting: { cls: 'badge-waiting', label: 'Waiting', dot: 'bg-amber-400' },
  'in-progress': { cls: 'badge-progress', label: 'In progress', dot: 'bg-teal-500' },
  completed: { cls: 'badge-completed', label: 'Completed', dot: 'bg-sage-400' },
  cancelled: { cls: 'badge-cancelled', label: 'Cancelled', dot: 'bg-coral-400' },
}

export default function StatusBadge({ status }) {
  const c = CONFIG[status] || CONFIG.waiting
  return (
    <span className={c.cls}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  )
}
