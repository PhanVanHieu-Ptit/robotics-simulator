import { useEffect } from 'react'
import { KeyboardController } from '../KeyboardController'
import { GamepadController }  from '../GamepadController'
import { setInputControllers, clearInputControllers } from '../inputControllerSingleton'

/**
 * Mounts keyboard and gamepad controllers and registers them in the module-level
 * singleton so that useSimulationFrame can poll them in the R3F RAF loop.
 * Must be called once at the app root level (outside the Canvas).
 */
export function useInputController(): void {
  useEffect(() => {
    const kb = new KeyboardController()
    const gp = new GamepadController()
    kb.mount()
    gp.mount()
    setInputControllers(kb, gp)

    return () => {
      kb.unmount()
      gp.unmount()
      clearInputControllers()
    }
  }, [])
}
