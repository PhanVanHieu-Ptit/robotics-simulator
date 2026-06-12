import type { Mat4 } from '../types/RobotState'
import type { DHParam } from './DHParameters'

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const r: number[] = new Array(16).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let k = 0; k < 4; k++) {
        r[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col]
      }
    }
  }
  return r as unknown as Mat4
}

/**
 * Standard DH transform for one joint:
 *   T = Rz(θ+offset) · Tz(d) · Tx(a) · Rx(α)
 */
export function dhTransform(param: DHParam, theta: number): Mat4 {
  const q = theta + param.thetaOffset
  const ct = Math.cos(q),  st = Math.sin(q)
  const ca = Math.cos(param.alpha), sa = Math.sin(param.alpha)
  const { a, d } = param

  return [
    ct, -st * ca,  st * sa, a * ct,
    st,  ct * ca, -ct * sa, a * st,
     0,       sa,       ca,      d,
     0,        0,        0,      1,
  ]
}

/**
 * Returns cumulative FK transforms — one per joint.
 * transforms[i] is the pose of frame i expressed in the base frame.
 */
export function computeFK(dhParams: readonly DHParam[], jointAngles: readonly number[]): Mat4[] {
  const transforms: Mat4[] = []
  let acc: Mat4 = IDENTITY

  for (let i = 0; i < dhParams.length; i++) {
    const local = dhTransform(dhParams[i]!, jointAngles[i] ?? 0)
    acc = mat4Multiply(acc, local)
    transforms.push(acc)
  }

  return transforms
}

/** Extract translation vector from a row-major Mat4. */
export function mat4Position(m: Mat4): readonly [number, number, number] {
  return [m[3], m[7], m[11]]
}
