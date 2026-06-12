/**
 * IK Worker — offloads inverse kinematics from the main thread.
 *
 * Future: expose via Comlink so SimulationEngine can call solveIK()
 * asynchronously without blocking the render loop.
 *
 * Example usage (main thread):
 *   import * as Comlink from 'comlink'
 *   const worker = new Worker(new URL('./ik.worker.ts', import.meta.url), { type: 'module' })
 *   const api = Comlink.wrap<typeof import('./ik.worker.ts')>(worker)
 *   const result = await api.solve(dhParams, currentAngles, target)
 */

import type { DHParam }  from '@simulation/kinematics/DHParameters'
import type { Pose3D }   from '@simulation/types/RobotState'
import type { IKResult } from '@simulation/kinematics/InverseKinematics'

export function solve(
  _dhParams: readonly DHParam[],
  _currentAngles: readonly number[],
  _target: Pose3D,
): IKResult {
  // TODO: implement FABRIK / Jacobian pseudo-inverse
  throw new Error('IK worker not yet implemented')
}
