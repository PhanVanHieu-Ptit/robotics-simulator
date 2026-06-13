import { useFrame } from '@react-three/fiber'
import { getEngine } from '@hooks/useSimulation'

/**
 * Drives the simulation engine from R3F's requestAnimationFrame loop.
 * Ticks every frame unconditionally so manual controls (keyboard, control
 * panel buttons) work regardless of the isRunning flag.
 */
export function useSimulationFrame(): void {
  useFrame((_, delta) => {
    getEngine()?.tick(delta)
  })
}
