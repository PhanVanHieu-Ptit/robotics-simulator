import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { JointDescriptor } from '@rendering/utils/nodeRegistry'

// Re-export so existing consumers of ManipulatorSystem keep working.
export type { JointDescriptor }

interface ManipulatorState {
  joints: JointDescriptor[]
  angles: Record<string, number>
  /** Franka arm joints sorted by DH index (joint1 → index 0, …, joint7 → index 6). */
  armJoints: JointDescriptor[]
  /** UUID → DH joint index, for dispatching SET_JOINT from sliders. */
  armJointIndexByUuid: Map<string, number>
}

interface ManipulatorActions {
  setJoints: (joints: JointDescriptor[]) => void
  setAngle: (uuid: string, angle: number) => void
  /** Bulk-write multiple angles in one Zustand update (used by the sim bridge). */
  setAngles: (angles: Record<string, number>) => void
  setArmJoints: (joints: JointDescriptor[]) => void
  resetAngles: () => void
}

export const useManipulatorStore = create<ManipulatorState & ManipulatorActions>()(
  subscribeWithSelector((set) => ({
    joints: [],
    angles: {},
    armJoints: [],
    armJointIndexByUuid: new Map(),

    setJoints: (joints) =>
      set({
        joints,
        angles: Object.fromEntries(joints.map((j) => [j.uuid, 0])),
      }),

    setAngle: (uuid, angle) =>
      set((s) => ({ angles: { ...s.angles, [uuid]: angle } })),

    setAngles: (angles) =>
      set((s) => ({ angles: { ...s.angles, ...angles } })),

    setArmJoints: (joints) =>
      set({
        armJoints: joints,
        armJointIndexByUuid: new Map(joints.map((j, i) => [j.uuid, i])),
      }),

    resetAngles: () =>
      set((s) => ({
        angles: Object.fromEntries(s.joints.map((j) => [j.uuid, 0])),
      })),
  })),
)
