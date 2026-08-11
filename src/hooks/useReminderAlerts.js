import { useEffect, useRef, useState } from 'react'

/**
 * Watches a list of active reminders and fires an in-app + (if
 * permitted) browser notification when the current time matches a
 * reminder's scheduled time. Checks once a minute.
 */
export function useReminderAlerts(remindersList) {
  const [dueReminder, setDueReminder] = useState(null)
  const firedToday = useRef(new Set())

  useEffect(() => {
    function check() {
      const now = new Date()
      const hhmm = now.toTimeString().slice(0, 5)
      const dayKey = now.toISOString().slice(0, 10)

      for (const r of remindersList || []) {
        if (!r.active) continue
        const fireKey = `${r.id}-${dayKey}-${hhmm}`
        if (r.reminder_time === hhmm && !firedToday.current.has(fireKey)) {
          firedToday.current.add(fireKey)
          setDueReminder(r)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Time for your medicine', {
              body: `${r.medicine_name} — ${r.dosage}`,
              icon: undefined,
            })
          }
        }
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [remindersList])

  return { dueReminder, clearDueReminder: () => setDueReminder(null) }
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'default') {
    return Notification.requestPermission()
  }
  return Notification.permission
}
