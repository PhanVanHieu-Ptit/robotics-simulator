import { useFrame } from '@react-three/fiber'
import { getEngine } from '@hooks/useSimulation'
import { useSimulationStore } from '@store/simulationStore'

/**
 * Advances the simulation engine by the R3F frame delta when the simulation
 * is running and not paused. engine.tick() is synchronous: runs all systems,
 * builds WorldSnapshot, and calls onSnapshot → robotStore.applySnapshot()
 * before returning.
 */
export function useEngineFrame(): void {
  useFrame((_, delta) => {
    const { isRunning, isPaused } = useSimulationStore.getState()
    if (isRunning && !isPaused) {
      getEngine()?.tick(delta)
    }
  })
}
