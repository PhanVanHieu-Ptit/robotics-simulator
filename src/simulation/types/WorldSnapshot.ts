import type { Pose3D, RobotState } from './RobotState'

export interface WorldSnapshot {
  readonly simTime: number                              // accumulated simulation seconds
  readonly frameTime: number                            // wall-clock ms spent inside tick()
  readonly wallDeltaSec: number                         // real wall-clock seconds between frames
  readonly robots: Readonly<Record<string, RobotState>>
  readonly trajectories: Readonly<Record<string, readonly Pose3D[]>>
}
