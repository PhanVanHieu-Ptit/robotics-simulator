import type { Pose3D, RobotState } from './RobotState'

export interface WorldSnapshot {
  readonly simTime: number                              // accumulated simulation seconds
  readonly frameTime: number                            // wall-clock ms for this tick
  readonly robots: Readonly<Record<string, RobotState>>
  readonly trajectories: Readonly<Record<string, readonly Pose3D[]>>
}
