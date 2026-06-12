import type { Command } from '../types/Command'
import type { Pose2D, Pose3D, RobotState } from '../types/RobotState'
import type { Robot } from './Robot'

export interface DifferentialDriveConfig {
  readonly id: string
  readonly wheelBase: number     // metres
  readonly wheelRadius: number   // metres
  readonly maxLinearVel: number  // m/s
  readonly maxAngularVel: number // rad/s
}

const ZERO_POSE3D: Pose3D = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] }
const IDENTITY16 = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] as const

export class DifferentialDrive implements Robot {
  state: RobotState
  readonly trajectoryBuffer: Pose3D[] = []

  private _linear = 0
  private _angular = 0

  constructor(private readonly cfg: DifferentialDriveConfig) {
    this.state = this.buildState({ x: 0, y: 0, theta: 0 }, 0, 0)
  }

  private buildState(pose: Pose2D, leftAngle: number, rightAngle: number): RobotState {
    return {
      id: this.cfg.id,
      jointStates: [
        { angle: leftAngle,  velocity: this._linear - this._angular * (this.cfg.wheelBase / 2), torque: 0 },
        { angle: rightAngle, velocity: this._linear + this._angular * (this.cfg.wheelBase / 2), torque: 0 },
      ],
      basePose: pose,
      endEffectorPose: ZERO_POSE3D,
      dhTransforms: [IDENTITY16],
    }
  }

  applyCommand(cmd: Command): void {
    if (cmd.type !== 'DRIVE') return
    this._linear  = Math.max(-this.cfg.maxLinearVel,  Math.min(this.cfg.maxLinearVel,  cmd.linear))
    this._angular = Math.max(-this.cfg.maxAngularVel, Math.min(this.cfg.maxAngularVel, cmd.angular))
  }

  step(dt: number): void {
    const { x, y, theta } = this.state.basePose
    const dtheta = this._angular * dt
    const dx     = this._linear * Math.cos(theta + dtheta / 2) * dt
    const dy     = this._linear * Math.sin(theta + dtheta / 2) * dt

    const wheelAngDelta = (this._linear / this.cfg.wheelRadius) * dt
    const leftAngle  = (this.state.jointStates[0]?.angle ?? 0) + wheelAngDelta
    const rightAngle = (this.state.jointStates[1]?.angle ?? 0) + wheelAngDelta

    this.state = this.buildState(
      { x: x + dx, y: y + dy, theta: theta + dtheta },
      leftAngle,
      rightAngle,
    )
  }

  reset(): void {
    this._linear  = 0
    this._angular = 0
    this.trajectoryBuffer.length = 0
    this.state = this.buildState({ x: 0, y: 0, theta: 0 }, 0, 0)
  }
}
