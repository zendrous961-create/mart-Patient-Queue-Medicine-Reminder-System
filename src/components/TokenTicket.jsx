import StatusBadge from './StatusBadge.jsx'

/**
 * The queue token rendered as a perforated ticket stub — the one
 * signature visual shared by both the patient token card and the
 * doctor's queue list rows.
 */
export default function TokenTicket({ appointment, doctorLabel, subtitle, right }) {
  return (
    <div className="ticket">
      <div className="flex flex-1 items-center gap-4 px-5 py-4">
        <div className="font-mono text-2xl font-semibold tracking-tight text-teal-700">
          {appointment.token_number}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-ink">
            {doctorLabel || appointment.patient_name}
          </p>
          <p className="truncate text-xs text-ink/50">{subtitle}</p>
        </div>
      </div>
      <div className="ticket-perforation" aria-hidden="true" />
      <div className="flex w-32 flex-col items-center justify-center gap-1.5 px-3 py-4 shrink-0">
        <StatusBadge status={appointment.status} />
        <span className="text-[11px] text-ink/40">{appointment.time_slot}</span>
        {right}
      </div>
    </div>
  )
}
