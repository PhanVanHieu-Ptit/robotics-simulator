import type { Command } from '../types/Command'
import type { Pose3D, RobotState } from '../types/RobotState'
import type { Robot } from './Robot'
import type { DHParam } from '../kinematics/DHParameters'
import { computeFK, mat4Position, mat3ToQuat } from '../kinematics/ForwardKinematics'
import { solveIK } from '../kinematics/InverseKinematics'

export interface FrankaArmConfig {
  readonly id: string
  readonly dhParams: readonly DHParam[]
  readonly jointLimits: readonly { readonly min: number; readonly max: number }[]
  readonly initialAngles: readonly number[]
}

export class FrankaArm implements Robot {
  readonly id: string
  state: RobotState
  readonly trajectoryBuffer: Pose3D[] = []

  private _angles: number[]
  private _ikTarget: Pose3D | null = null

  constructor(private readonly cfg: FrankaArmConfig) {
    this.id      = cfg.id
    this._angles = [...cfg.initialAngles]
    this.state   = this.buildState()
  }

  private buildState(): RobotState {
    const transforms = computeFK(this.cfg.dhParams, this._angles)
    const eeTransform = transforms[transforms.length - 1]
    const pos = eeTransform ? mat4Position(eeTransform) : ([0, 0, 0] as const)

    return {
      id: this.cfg.id,
      jointStates: this._angles.map((angle) => ({ angle, velocity: 0, torque: 0 })),
      basePose: { x: 0, y: 0, theta: 0 },
      endEffectorPose: { position: pos, quaternion: eeTransform ? mat3ToQuat(eeTransform) : [0, 0, 0, 1] },
      dhTransforms: transforms,
    }
  }

  applyCommand(cmd: Command): void {
    if (cmd.type === 'SET_JOINT' && cmd.robotId === this.cfg.id) {
      const limit = this.cfg.jointLimits[cmd.index]
      if (!limit) return
      this._angles[cmd.index] = Math.max(limit.min, Math.min(limit.max, cmd.angle))
    } else if (cmd.type === 'SET_IK_TARGET' && cmd.robotId === this.cfg.id) {
      this._ikTarget = cmd.target
    }
  }

  step(_dt: number): void {
    // Franka is position-controlled; dynamics are simplified to instant joint tracking.
    // Future: add velocity/torque control with proper 2nd-order integration.
    if (this._ikTarget !== null) {
      const result = solveIK(
        this.cfg.dhParams,
        this._angles,
        this._ikTarget,
        100,
        this.cfg.jointLimits,
      )
      this._angles = [...result.jointAngles]
      this._ikTarget = null
    }
    this.state = this.buildState()
  }

  reset(): void {
    this._angles = [...this.cfg.initialAngles]
    this.trajectoryBuffer.length = 0
    this.state = this.buildState()
  }
}
