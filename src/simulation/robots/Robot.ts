import type { Command } from '../types/Command'
import type { Pose3D, RobotState } from '../types/RobotState'

export interface Robot {
  readonly id: string
  state: RobotState
  /** Mutable ring-buffer for the end-effector trajectory; managed by TrajectorySystem */
  readonly trajectoryBuffer: Pose3D[]
  applyCommand(cmd: Command): void
  /** Advance kinematics / dynamics by dt seconds */
  step(dt: number): void
  reset(): void
}
