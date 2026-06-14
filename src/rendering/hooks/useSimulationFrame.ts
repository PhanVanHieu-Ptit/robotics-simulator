import { useInputSampler }   from './useInputSampler'
import { useEngineFrame }    from './useEngineFrame'
import { useSimToGLBBridge } from './useSimToGLBBridge'

/**
 * Drives the simulation from R3F's requestAnimationFrame loop.
 *
 * Composes three single-responsibility hooks (each is a separate useFrame call,
 * executed in the order they are registered — guaranteed by R3F):
 *   1. useInputSampler   — sample keyboard/gamepad, enqueue DRIVE commands
 *   2. useEngineFrame    — advance engine.tick(delta)
 *   3. useSimToGLBBridge — propagate joint angles from robotStore → ManipulatorStore
 */
export function useSimulationFrame(): void {
  useInputSampler()
  useEngineFrame()
  useSimToGLBBridge()
}
