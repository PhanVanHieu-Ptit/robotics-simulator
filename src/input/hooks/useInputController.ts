import { useEffect, useRef } from 'react'
import { KeyboardController } from '../KeyboardController'
import { mapInputToCommands }  from '../InputMapper'
import { useRobotCommands }    from '@hooks/useRobotCommands'

/**
 * Mounts keyboard input and pipes it to the simulation command queue
 * on every animation frame.  Must be called once at the app root level.
 *
 * Always active — no isRunning gate — so controls work immediately
 * without requiring the user to click Run first.
 */
export function useInputController(): void {
  const { dispatch } = useRobotCommands()
  const kbRef       = useRef(new KeyboardController())
  const rafRef      = useRef<number | null>(null)
  const wasMovingRef = useRef(false)

  useEffect(() => {
    const kb = kbRef.current
    kb.mount()

    const loop = () => {
      const cmds = mapInputToCommands(kb.input)
      if (cmds.length > 0) {
        cmds.forEach(dispatch)
        wasMovingRef.current = true
      } else if (wasMovingRef.current) {
        // Transition: keys just released — send one explicit stop so the
        // robot doesn't keep drifting at its last velocity.
        dispatch({ type: 'DRIVE', linear: 0, angular: 0 })
        wasMovingRef.current = false
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      kb.unmount()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [dispatch])
}
