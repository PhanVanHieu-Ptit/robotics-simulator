import type { DHParam } from './DHParameters'
import type { Pose3D } from '../types/RobotState'
import { mat4Position, mat4ZAxis, computeFKInto, newMutableMat4, type MutableMat4 } from './ForwardKinematics'

export interface IKResult {
  readonly jointAngles: readonly number[]
  readonly converged: boolean
  readonly iterations: number
}

export type JointLimit = { readonly min: number; readonly max: number }

// ─── Internal vector helpers ─────────────────────────────────────────────────

type Vec3 = [number, number, number]

function cross(a: Vec3, b: Vec3, out: Vec3): void {
  out[0] = a[1] * b[2] - a[2] * b[1]
  out[1] = a[2] * b[0] - a[0] * b[2]
  out[2] = a[0] * b[1] - a[1] * b[0]
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function norm2(v: Vec3): number {
  return dot3(v, v)
}

// Row-major 3×3 determinant — accepts a fixed 9-element tuple.
type Mat3 = [number,number,number,number,number,number,number,number,number]

function det3(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  )
}

/**
 * Solve A·x = b via Cramer's rule (A is row-major 3×3, b is Vec3).
 * Writes result into `out`. Returns false when the system is singular.
 * A0, A1, A2 are caller-owned scratch Mat3 arrays — mutated and left dirty.
 */
function solve3Into(
  A: Mat3, b: Vec3,
  A0: Mat3, A1: Mat3, A2: Mat3,
  out: Vec3,
): boolean {
  const d = det3(A)
  if (Math.abs(d) < 1e-12) { out[0] = 0; out[1] = 0; out[2] = 0; return false }
  const inv = 1 / d

  // Column-0 replacement
  A0[0]=b[0]; A0[1]=A[1]; A0[2]=A[2]
  A0[3]=b[1]; A0[4]=A[4]; A0[5]=A[5]
  A0[6]=b[2]; A0[7]=A[7]; A0[8]=A[8]

  // Column-1 replacement
  A1[0]=A[0]; A1[1]=b[0]; A1[2]=A[2]
  A1[3]=A[3]; A1[4]=b[1]; A1[5]=A[5]
  A1[6]=A[6]; A1[7]=b[2]; A1[8]=A[8]

  // Column-2 replacement
  A2[0]=A[0]; A2[1]=A[1]; A2[2]=b[0]
  A2[3]=A[3]; A2[4]=A[4]; A2[5]=b[1]
  A2[6]=A[6]; A2[7]=A[7]; A2[8]=b[2]

  out[0] = det3(A0) * inv
  out[1] = det3(A1) * inv
  out[2] = det3(A2) * inv
  return true
}

// ─── IK Solver ──────────────────────────────────────────────────────────────

const LAMBDA2 = 1e-4  // damping factor² for DLS (prevents singular blow-up)
const ALPHA   = 0.5   // step-size scale (tuned for Franka's workspace)
const TOL2    = 1e-8  // convergence: |Δp|² < 1e-8 ≈ 0.1 mm

/**
 * Damped least-squares Jacobian pseudo-inverse IK (position only).
 *
 * Geometric Jacobian column i:
 *   J[:, i] = z_{i-1} × (p_ee − p_{i-1})
 * where z_{i-1} and p_{i-1} are the z-axis and origin of frame i−1 in the
 * base frame, extracted from cumulative FK transforms.
 *
 * DLS update:  Δθ = α · Jᵀ (J Jᵀ + λ²I)⁻¹ Δp
 * J Jᵀ is 3×3 — inverted analytically via Cramer's rule each iteration.
 *
 * All scratch buffers are pre-allocated once before the loop — zero heap
 * allocations per iteration. FK is computed via computeFKInto (also zero alloc).
 *
 * Orientation (quaternion) in `target` is currently ignored.
 *
 * @param jointLimits  Optional per-joint [min, max] (radians). Applied after
 *                     each update step so the solution always respects limits.
 */
export function solveIK(
  dhParams: readonly DHParam[],
  currentAngles: readonly number[],
  target: Pose3D,
  maxIterations = 100,
  jointLimits?: readonly JointLimit[],
): IKResult {
  const n = dhParams.length
  const angles = [...currentAngles]
  const [tx, ty, tz] = target.position

  // ── Pre-allocate all scratch buffers (zero per-iteration allocations) ──────
  const fkOut:   MutableMat4[] = dhParams.map(() => newMutableMat4())
  const fkAcc:   MutableMat4  = newMutableMat4()
  const fkLocal: MutableMat4  = newMutableMat4()

  // Jacobian column scratch: n Vec3s for J cols, plus r, z, v, cross result
  const Jcols: Vec3[] = dhParams.map(() => [0, 0, 0] as Vec3)
  const rBuf:  Vec3 = [0, 0, 0]
  const zBuf:  Vec3 = [0, 0, 0]
  const vBuf:  Vec3 = [0, 0, 0]
  const eBuf:  Vec3 = [0, 0, 0]

  // Cramer scratch — three copies of A with one column replaced
  const A:  Mat3 = [0,0,0,0,0,0,0,0,0]
  const A0: Mat3 = [0,0,0,0,0,0,0,0,0]
  const A1: Mat3 = [0,0,0,0,0,0,0,0,0]
  const A2: Mat3 = [0,0,0,0,0,0,0,0,0]

  let iter = 0
  let converged = false

  for (; iter < maxIterations; iter++) {
    computeFKInto(dhParams, angles, fkOut, fkAcc, fkLocal)
    const last = fkOut[n - 1]!
    const pEE = mat4Position(last)  // readonly tuple — no alloc

    eBuf[0] = tx - pEE[0]; eBuf[1] = ty - pEE[1]; eBuf[2] = tz - pEE[2]
    if (norm2(eBuf) < TOL2) { converged = true; break }

    // Build geometric Jacobian columns (3 × n).
    // Column i = cross(z_{i-1}, p_ee − p_{i-1}).
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        zBuf[0] = 0; zBuf[1] = 0; zBuf[2] = 1  // base frame z-axis
        rBuf[0] = pEE[0]; rBuf[1] = pEE[1]; rBuf[2] = pEE[2]
      } else {
        const prev = fkOut[i - 1]!
        const zPrev = mat4ZAxis(prev)  // readonly tuple — no alloc
        zBuf[0] = zPrev[0]; zBuf[1] = zPrev[1]; zBuf[2] = zPrev[2]
        const pPrev = mat4Position(prev)
        rBuf[0] = pEE[0] - pPrev[0]
        rBuf[1] = pEE[1] - pPrev[1]
        rBuf[2] = pEE[2] - pPrev[2]
      }
      cross(zBuf, rBuf, Jcols[i]!)
    }

    // A = J Jᵀ + λ²I  (3×3, row-major).
    A[0]=0; A[1]=0; A[2]=0; A[3]=0; A[4]=0; A[5]=0; A[6]=0; A[7]=0; A[8]=0
    for (const jc of Jcols) {
      A[0] += jc[0] * jc[0]; A[1] += jc[0] * jc[1]; A[2] += jc[0] * jc[2]
      A[3] += jc[1] * jc[0]; A[4] += jc[1] * jc[1]; A[5] += jc[1] * jc[2]
      A[6] += jc[2] * jc[0]; A[7] += jc[2] * jc[1]; A[8] += jc[2] * jc[2]
    }
    A[0] += LAMBDA2; A[4] += LAMBDA2; A[8] += LAMBDA2

    // Solve A·v = e, then Δθ[i] = α · Jcols[i] · v.
    solve3Into(A, eBuf, A0, A1, A2, vBuf)
    for (let i = 0; i < n; i++) {
      angles[i] = (angles[i] ?? 0) + ALPHA * dot3(Jcols[i]!, vBuf)
      const lim = jointLimits?.[i]
      if (lim) angles[i] = Math.max(lim.min, Math.min(lim.max, angles[i]!))
    }
  }

  return { jointAngles: angles, converged, iterations: iter }
}
