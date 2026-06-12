import type { Pose3D } from './RobotState'

export interface DriveCommand {
  readonly type: 'DRIVE'
  readonly linear: number  // m/s
  readonly angular: number // rad/s
}

export interface JointCommand {
  readonly type: 'SET_JOINT'
  readonly robotId: string
  readonly index: number
  readonly angle: number // radians
}

export interface IKCommand {
  readonly type: 'SET_IK_TARGET'
  readonly robotId: string
  readonly target: Pose3D
}

export interface ResetCommand {
  readonly type: 'RESET'
}

export type Command = DriveCommand | JointCommand | IKCommand | ResetCommand
