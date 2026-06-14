import type { Command } from '../types/Command'
import type { Mat4, Pose3D, RobotState } from '../types/RobotState'
import type { Robot } from './Robot'
import type { DHParam } from '../kinematics/DHParameters'
import {
  computeFKInto,
  mat4Position,
  mat3ToQuat,
  newMutableMat4,
  type MutableMat4,
} from '../kinematics/ForwardKinematics'
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
  // Pre-allocated to avoid 8 object creations (1 array + 7 objects) per tick.
  private readonly _jointStatesCache: { angle: number; velocity: number; torque: number }[]
  // Pre-allocated FK buffers — eliminates all Mat4 allocations during buildState().
  private readonly _fkTransformsCache: MutableMat4[]
  private readonly _fkAccBuf: MutableMat4
  private readonly _fkLocalBuf: MutableMat4

  constructor(private readonly cfg: FrankaArmConfig) {
    this.id      = cfg.id
    this._angles = [...cfg.initialAngles]
    this._jointStatesCache = cfg.initialAngles.map((angle) => ({ angle, velocity: 0, torque: 0 }))
    this._fkTransformsCache = cfg.dhParams.map(() => newMutableMat4())
    this._fkAccBuf   = newMutableMat4()
    this._fkLocalBuf = newMutableMat4()
    this.state   = this.buildState()
  }

  private buildState(): RobotState {
    for (let i = 0; i < this._angles.length; i++) {
      this._jointStatesCache[i]!.angle = this._angles[i]!
    }

    computeFKInto(this.cfg.dhParams, this._angles, this._fkTransformsCache, this._fkAccBuf, this._fkLocalBuf)
    const eeTransform = this._fkTransformsCache[this._fkTransformsCache.length - 1]
    const pos = eeTransform ? mat4Position(eeTransform) : ([0, 0, 0] as const)

    return {
      id: this.cfg.id,
      jointStates: this._jointStatesCache,
      basePose: { x: 0, y: 0, theta: 0 },
      endEffectorPose: { position: pos, quaternion: eeTransform ? mat3ToQuat(eeTransform) : [0, 0, 0, 1] },
      // Expose as readonly Mat4[]; store consumers must slice() before storing
      // if they need a stable reference across ticks.
      dhTransforms: this._fkTransformsCache as unknown as readonly Mat4[],
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
