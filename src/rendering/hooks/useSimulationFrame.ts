import { useFrame } from '@react-three/fiber'
import { getEngine } from '@hooks/useSimulation'
import { useRobotStore } from '@store/robotStore'
import { useManipulatorStore } from '@simulation/systems/ManipulatorSystem'
import { useSimulationStore } from '@store/simulationStore'

/**
 * Drives the simulation engine from R3F's requestAnimationFrame loop.
 * The engine only ticks when the simulation is running and not paused,
 * so Play/Pause actually control the simulation.
 *
 * After each tick the sim's Franka joint angles are pushed to ManipulatorStore
 * so the GLB arm always reflects the simulation state (IK results, SET_JOINT
 * commands from sliders, resets, etc.).
 */
export function useSimulationFrame(): void {
  useFrame((_, delta) => {
    const { isRunning, isPaused } = useSimulationStore.getState()
    if (isRunning && !isPaused) {
      // engine.tick() is synchronous: it runs all systems, builds a WorldSnapshot,
      // and calls onSnapshot → useRobotStore.applySnapshot() before returning.
      getEngine()?.tick(delta)
    }

    // Bridge: propagate sim joint angles to ManipulatorStore for GLB rendering.
    // armJoints are Franka joints sorted by DH index (populated in SceneRoot
    // handleLoad after the GLB is loaded).
    const simAngles = useRobotStore.getState().jointAngles
    const armJoints = useManipulatorStore.getState().armJoints
    if (simAngles.length > 0 && armJoints.length > 0) {
      const angles: Record<string, number> = {}
      const len = Math.min(simAngles.length, armJoints.length)
      for (let i = 0; i < len; i++) {
        angles[armJoints[i]!.uuid] = simAngles[i]!
      }
      useManipulatorStore.getState().setAngles(angles)
    }
  })
}
