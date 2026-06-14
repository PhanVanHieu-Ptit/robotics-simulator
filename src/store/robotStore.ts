import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Pose2D, Pose3D, RobotState } from '@simulation/types'
import type { WorldSnapshot } from '@simulation/types'
import { FRANKA_ID, DIFF_DRIVE_ID } from '@config/robotIds'

interface RobotState_ {
  // Franka Panda
  jointAngles: number[]
  endEffectorPose: Pose3D | null

  // Mobile base
  basePose: Pose2D

  // Trajectories keyed by robotId
  trajectories: Record<string, readonly Pose3D[]>

  // Raw snapshots — full state for all robots, keyed by robotId
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
    endEffectorPose: null,
    basePose: INITIAL_BASE_POSE,
    trajectories: {},
    robotSnapshots: {},

    applySnapshot: (snapshot) => {
      const franka   = snapshot.robots[FRANKA_ID]
      const diffDrive = snapshot.robots[DIFF_DRIVE_ID]

      set({
        robotSnapshots:  snapshot.robots,
        trajectories:    snapshot.trajectories,
        jointAngles:     franka?.jointStates.map((j) => j.angle) ?? [],
        endEffectorPose: franka?.endEffectorPose ?? null,
        basePose:        diffDrive?.basePose ?? INITIAL_BASE_POSE,
      })
    },

    resetAll: () =>
      set({
        jointAngles: [],
        endEffectorPose: null,
        basePose: INITIAL_BASE_POSE,
        trajectories: {},
        robotSnapshots: {},
      }),
  })),
)
