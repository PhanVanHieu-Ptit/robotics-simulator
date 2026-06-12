import type { DHParam } from './DHParameters'
import type { Pose3D } from '../types/RobotState'

export interface IKResult {
  readonly jointAngles: readonly number[]
  readonly converged: boolean
  readonly iterations: number
}

/**
 * Stub — IK solver not yet implemented.
 *
 * Future: FABRIK or Jacobian pseudo-inverse running in workers/ik.worker.ts
 * via Comlink so it never blocks the main thread.
 */
export function solveIK(
  _dhParams: readonly DHParam[],
  _currentAngles: readonly number[],
  _target: Pose3D,
  _maxIterations = 100,
): IKResult {
  throw new Error('IK solver not yet implemented — see src/workers/ik.worker.ts')
}
