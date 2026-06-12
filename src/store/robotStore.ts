import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Mat4, Pose2D, Pose3D, RobotState } from '@simulation/types'
import type { WorldSnapshot } from '@simulation/types'

interface RobotState_ {
  // Franka Panda
  jointAngles: number[]
  dhTransforms: Mat4[]
  endEffectorPose: Pose3D | null

  // Mobile base
  basePose: Pose2D

  // Trajectories keyed by robotId
  trajectories: Record<string, readonly Pose3D[]>

  // Raw snapshots for systems that need full state
  robotSnapshots: Record<string, RobotState>
}

interface RobotActions {
  applySnapshot: (snapshot: WorldSnapshot) => void
  resetAll: () => void
}

const INITIAL_BASE_POSE: Pose2D = { x: 0, y: 0, theta: 0 }

export const useRobotStore = create<RobotState_ & RobotActions>()(
  subscribeWithSelector((set) => ({
    jointAngles: [],
    dhTransforms: [],
    endEffectorPose: null,
    basePose: INITIAL_BASE_POSE,
    trajectories: {},
    robotSnapshots: {},

    applySnapshot: (snapshot) => {
      const franka = snapshot.robots['franka_panda']
      const diffDrive = snapshot.robots['diff_drive']

      set({
        robotSnapshots: snapshot.robots,
        trajectories: snapshot.trajectories,
        jointAngles:      franka?.jointStates.map((j) => j.angle) ?? [],
        dhTransforms:     (franka?.dhTransforms ?? []) as Mat4[],
        endEffectorPose:  franka?.endEffectorPose ?? null,
        basePose:         diffDrive?.basePose ?? INITIAL_BASE_POSE,
      })
    },

    resetAll: () =>
      set({
        jointAngles: [],
        dhTransforms: [],
        endEffectorPose: null,
        basePose: INITIAL_BASE_POSE,
        trajectories: {},
        robotSnapshots: {},
      }),
  })),
)
