import { useCallback } from 'react'
import type { Command } from '@simulation/types'
import { getEngine } from './useSimulation'

// Does NOT call useSimulation() — no store subscription, no re-renders.
// dispatch is a stable function reference (empty useCallback deps).
export function useRobotCommands() {
  const dispatch = useCallback((cmd: Command) => {
    getEngine()?.world.enqueueCommand(cmd)
  }, [])

  return { dispatch }
}
