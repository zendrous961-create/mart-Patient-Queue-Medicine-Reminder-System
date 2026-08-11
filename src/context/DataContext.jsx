import { createContext, useContext, useEffect, useState } from 'react'
import { subscribeToChanges } from '../services/api.js'

const DataContext = createContext({ tick: 0 })

/**
 * Increments `tick` whenever Supabase fires a postgres_changes event on
 * the appointments or medicine_reminders tables.
 * Pages watch `tick` in a useEffect to refetch — this is the real
 * Supabase Realtime channel subscription (replaces the mock's polling).
 */
export function DataProvider({ children }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => setTick((t) => t + 1))
    return unsubscribe
  }, [])

  return <DataContext.Provider value={{ tick }}>{children}</DataContext.Provider>
}

export function useLiveTick() {
  return useContext(DataContext).tick
}
