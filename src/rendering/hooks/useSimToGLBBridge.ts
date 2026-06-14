import { useFrame } from '@react-three/fiber'
import { useRobotStore } from '@store/robotStore'
import { useManipulatorStore } from '@simulation/systems/ManipulatorSystem'

/**
 * Each frame, copies the simulation joint angles (from robotStore) into the
 * ManipulatorStore so the GLB arm joints track the physics simulation.
 *
 * Skips the update when either array is empty (simulation not yet started,
 * or GLB not yet loaded) to avoid needless Zustand dispatches.
 */
export function useSimToGLBBridge(): void {
  useFrame(() => {
    const simAngles = useRobotStore.getState().jointAngles
    const armJoints = useManipulatorStore.getState().armJoints
    if (simAngles.length === 0 || armJoints.length === 0) return

    const angles: Record<string, number> = {}
    const len = Math.min(simAngles.length, armJoints.length)
    for (let i = 0; i < len; i++) {
      angles[armJoints[i]!.uuid] = simAngles[i]!
    }
    useManipulatorStore.getState().setAngles(angles)
  })
}
