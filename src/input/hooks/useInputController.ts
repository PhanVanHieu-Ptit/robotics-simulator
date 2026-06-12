import { useEffect, useRef } from 'react'
import { KeyboardController } from '../KeyboardController'
import { mapInputToCommands }  from '../InputMapper'
import { useRobotCommands }    from '@hooks/useRobotCommands'
import { useSimulationStore }  from '@store/simulationStore'

/**
 * Mounts keyboard input and pipes it to the simulation command queue
 * on every animation frame.  Must be called once at the app root level.
 *
 * Mirrors isRunning/isPaused into a plain ref via Zustand's vanilla subscribe
 * so InputGate is NEVER re-rendered by store changes (same pattern as
 * useSimulationFrame).
 */
export function useInputController(): void {
  const { dispatch } = useRobotCommands()
  const kbRef    = useRef(new KeyboardController())
  const rafRef   = useRef<number | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    const { isRunning, isPaused } = useSimulationStore.getState()
    activeRef.current = isRunning && !isPaused

    const unsub = useSimulationStore.subscribe((s) => {
      activeRef.current = s.isRunning && !s.isPaused
    })

    const kb = kbRef.current
    kb.mount()

    const loop = () => {
      if (activeRef.current) {
        const cmds = mapInputToCommands(kb.input)
        cmds.forEach(dispatch)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      unsub()
      kb.unmount()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [dispatch])
}
