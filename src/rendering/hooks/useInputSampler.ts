import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getEngine } from '@hooks/useSimulation'
import { getKeyboardController, getGamepadController } from '@input/inputControllerSingleton'
import { mapInputToCommands, mapAnalogToCommands } from '@input/InputMapper'

/**
 * Samples keyboard and gamepad input each R3F frame and enqueues DRIVE commands
 * into the engine command queue. Keyboard takes precedence over gamepad.
 * Sends an explicit stop command on the frame when all inputs are released
 * to prevent drift from stale velocity.
 */
export function useInputSampler(): void {
  const wasMovingRef = useRef(false)

  useFrame(() => {
    const kb = getKeyboardController()
    const gp = getGamepadController()

    const kbCmds = kb ? mapInputToCommands(kb.input) : []
    const gpCmds = gp ? mapAnalogToCommands(gp.analogInput) : []
    const cmds   = kbCmds.length > 0 ? kbCmds : gpCmds

    const engine = getEngine()
    if (cmds.length > 0) {
      cmds.forEach((cmd) => engine?.world.enqueueCommand(cmd))
      wasMovingRef.current = true
    } else if (wasMovingRef.current) {
      engine?.world.enqueueCommand({ type: 'DRIVE', linear: 0, angular: 0 })
      wasMovingRef.current = false
    }
  })
}
