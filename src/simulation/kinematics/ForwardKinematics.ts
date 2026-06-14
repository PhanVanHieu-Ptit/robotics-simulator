import type { Mat4 } from '../types/RobotState'
import type { DHParam } from './DHParameters'

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** Mutable 4×4 matrix for pre-allocated internal scratch buffers. */
export type MutableMat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
]

/** Allocate a zeroed mutable 4×4 matrix. */
export function newMutableMat4(): MutableMat4 {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

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

/** Write a * b into out. Aliasing (out === a or out === b) is not allowed. */
export function mat4MultiplyInto(
  a: Mat4 | MutableMat4,
  b: Mat4 | MutableMat4,
  out: MutableMat4,
): void {
  out[0]  = a[0]!*b[0]!  + a[1]!*b[4]!  + a[2]!*b[8]!  + a[3]!*b[12]!
  out[1]  = a[0]!*b[1]!  + a[1]!*b[5]!  + a[2]!*b[9]!  + a[3]!*b[13]!
  out[2]  = a[0]!*b[2]!  + a[1]!*b[6]!  + a[2]!*b[10]! + a[3]!*b[14]!
  out[3]  = a[0]!*b[3]!  + a[1]!*b[7]!  + a[2]!*b[11]! + a[3]!*b[15]!
  out[4]  = a[4]!*b[0]!  + a[5]!*b[4]!  + a[6]!*b[8]!  + a[7]!*b[12]!
  out[5]  = a[4]!*b[1]!  + a[5]!*b[5]!  + a[6]!*b[9]!  + a[7]!*b[13]!
  out[6]  = a[4]!*b[2]!  + a[5]!*b[6]!  + a[6]!*b[10]! + a[7]!*b[14]!
  out[7]  = a[4]!*b[3]!  + a[5]!*b[7]!  + a[6]!*b[11]! + a[7]!*b[15]!
  out[8]  = a[8]!*b[0]!  + a[9]!*b[4]!  + a[10]!*b[8]! + a[11]!*b[12]!
  out[9]  = a[8]!*b[1]!  + a[9]!*b[5]!  + a[10]!*b[9]! + a[11]!*b[13]!
  out[10] = a[8]!*b[2]!  + a[9]!*b[6]!  + a[10]!*b[10]!+ a[11]!*b[14]!
  out[11] = a[8]!*b[3]!  + a[9]!*b[7]!  + a[10]!*b[11]!+ a[11]!*b[15]!
  out[12] = a[12]!*b[0]! + a[13]!*b[4]! + a[14]!*b[8]! + a[15]!*b[12]!
  out[13] = a[12]!*b[1]! + a[13]!*b[5]! + a[14]!*b[9]! + a[15]!*b[13]!
  out[14] = a[12]!*b[2]! + a[13]!*b[6]! + a[14]!*b[10]!+ a[15]!*b[14]!
  out[15] = a[12]!*b[3]! + a[13]!*b[7]! + a[14]!*b[11]!+ a[15]!*b[15]!
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

/** Write the standard DH transform for one joint into an existing buffer. */
export function dhTransformInto(param: DHParam, theta: number, out: MutableMat4): void {
  const q = theta + param.thetaOffset
  const ct = Math.cos(q), st = Math.sin(q)
  const ca = Math.cos(param.alpha), sa = Math.sin(param.alpha)
  const { a, d } = param
  out[0]  = ct;   out[1]  = -st * ca; out[2]  = st * sa;  out[3]  = a * ct
  out[4]  = st;   out[5]  =  ct * ca; out[6]  = -ct * sa; out[7]  = a * st
  out[8]  = 0;    out[9]  = sa;       out[10] = ca;        out[11] = d
  out[12] = 0;    out[13] = 0;        out[14] = 0;         out[15] = 1
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

/**
 * Compute cumulative FK transforms in-place — zero heap allocations.
 * outTransforms[i] receives the cumulative pose of frame i in the base frame.
 * accBuf and localBuf are caller-owned scratch buffers; their values after the
 * call are undefined.
 *
 * Constraint: outTransforms, accBuf, and localBuf must not alias each other.
 */
export function computeFKInto(
  dhParams: readonly DHParam[],
  jointAngles: readonly number[],
  outTransforms: MutableMat4[],
  accBuf: MutableMat4,
  localBuf: MutableMat4,
): void {
  // Initialise accumulator to identity
  accBuf[0] = 1; accBuf[1] = 0; accBuf[2]  = 0; accBuf[3]  = 0
  accBuf[4] = 0; accBuf[5] = 1; accBuf[6]  = 0; accBuf[7]  = 0
  accBuf[8] = 0; accBuf[9] = 0; accBuf[10] = 1; accBuf[11] = 0
  accBuf[12]= 0; accBuf[13]= 0; accBuf[14] = 0; accBuf[15] = 1

  for (let i = 0; i < dhParams.length; i++) {
    dhTransformInto(dhParams[i]!, jointAngles[i] ?? 0, localBuf)
    mat4MultiplyInto(accBuf, localBuf, outTransforms[i]!)
    // Copy result into accumulator for the next iteration
    const t = outTransforms[i]!
    accBuf[0] = t[0]; accBuf[1] = t[1]; accBuf[2]  = t[2];  accBuf[3]  = t[3]
    accBuf[4] = t[4]; accBuf[5] = t[5]; accBuf[6]  = t[6];  accBuf[7]  = t[7]
    accBuf[8] = t[8]; accBuf[9] = t[9]; accBuf[10] = t[10]; accBuf[11] = t[11]
    accBuf[12]= t[12];accBuf[13]= t[13];accBuf[14] = t[14]; accBuf[15] = t[15]
  }
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
