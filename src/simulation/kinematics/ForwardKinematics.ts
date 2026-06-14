import type { Mat4 } from '../types/RobotState'
import type { DHParam } from './DHParameters'

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const r: number[] = new Array(16).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let k = 0; k < 4; k++) {
        r[row * 4 + col] = (r[row * 4 + col] ?? 0) + (a[row * 4 + k] ?? 0) * (b[k * 4 + col] ?? 0)
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

/** Extract z-axis (3rd column) from a row-major Mat4 — rotation axis for revolute joints. */
export function mat4ZAxis(m: Mat4): [number, number, number] {
  return [m[2], m[6], m[10]]
}

/**
 * Convert the 3×3 rotation block of a row-major Mat4 to a unit quaternion [x, y, z, w].
 * Uses Shepperd's method to select the numerically stable branch for all rotation angles.
 */
export function mat3ToQuat(m: Mat4): readonly [number, number, number, number] {
  // Row-major layout: R[row][col] = m[row*4 + col]
  const m00 = m[0], m01 = m[1], m02 = m[2]
  const m10 = m[4], m11 = m[5], m12 = m[6]
  const m20 = m[8], m21 = m[9], m22 = m[10]

  const trace = m00 + m11 + m22
  let x: number, y: number, z: number, w: number

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1)
    w = 0.25 / s
    x = (m21 - m12) * s
    y = (m02 - m20) * s
    z = (m10 - m01) * s
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22)
    w = (m21 - m12) / s
    x = 0.25 * s
    y = (m01 + m10) / s
    z = (m02 + m20) / s
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22)
    w = (m02 - m20) / s
    x = (m01 + m10) / s
    y = 0.25 * s
    z = (m12 + m21) / s
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11)
    w = (m10 - m01) / s
    x = (m02 + m20) / s
    y = (m12 + m21) / s
    z = 0.25 * s
  }

  return [x, y, z, w]
}
