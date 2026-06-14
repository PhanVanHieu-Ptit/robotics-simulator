import type { DHParam } from './DHParameters'
import type { Pose3D } from '../types/RobotState'
import { computeFK, mat4Position, mat4ZAxis } from './ForwardKinematics'

export interface IKResult {
  readonly jointAngles: readonly number[]
  readonly converged: boolean
  readonly iterations: number
}

export type JointLimit = { readonly min: number; readonly max: number }

// ─── Internal vector helpers (no allocations reused across iterations) ───────

type Vec3 = [number, number, number]

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function norm2(v: Vec3): number {
  return dot3(v, v)
}

// Row-major 3×3 determinant.
function det3(m: number[]): number {
  return (
    m[0]! * (m[4]! * m[8]! - m[5]! * m[7]!) -
    m[1]! * (m[3]! * m[8]! - m[5]! * m[6]!) +
    m[2]! * (m[3]! * m[7]! - m[4]! * m[6]!)
  )
}

// Solve A·x = b via Cramer's rule (A is row-major 3×3, b is Vec3).
// Returns [0,0,0] when the system is singular — damping prevents reaching this.
function solve3(A: number[], b: Vec3): Vec3 {
  const d = det3(A)
  if (Math.abs(d) < 1e-12) return [0, 0, 0]
  const inv = 1 / d
  const A0 = A.slice(); A0[0] = b[0]; A0[3] = b[1]; A0[6] = b[2]
  const A1 = A.slice(); A1[1] = b[0]; A1[4] = b[1]; A1[7] = b[2]
  const A2 = A.slice(); A2[2] = b[0]; A2[5] = b[1]; A2[8] = b[2]
  return [det3(A0) * inv, det3(A1) * inv, det3(A2) * inv]
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
 * base frame, extracted from the cumulative FK transforms.
 *
 * DLS update:  Δθ = α · Jᵀ (J Jᵀ + λ²I)⁻¹ Δp
 * J Jᵀ is 3×3 — inverted analytically via Cramer's rule each iteration.
 *
 * Orientation (quaternion) in `target` is currently ignored.
 * Add a 3×n orientation block to J to enable full 6-DOF IK.
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

  let iter = 0
  let converged = false

  for (; iter < maxIterations; iter++) {
    const transforms = computeFK(dhParams, angles)
    const last = transforms[n - 1]!
    const pEE = mat4Position(last)

    const e: Vec3 = [tx - pEE[0], ty - pEE[1], tz - pEE[2]]
    if (norm2(e) < TOL2) { converged = true; break }

    // Build geometric Jacobian columns (3 × n).
    // Column i = cross(z_{i-1}, p_ee − p_{i-1}).
    const Jcols: Vec3[] = []
    for (let i = 0; i < n; i++) {
      const zPrev: Vec3 = i === 0
        ? [0, 0, 1]                         // base frame z-axis
        : mat4ZAxis(transforms[i - 1]!)
      const pPrev = i === 0
        ? ([0, 0, 0] as Vec3)
        : (mat4Position(transforms[i - 1]!) as Vec3)
      const r: Vec3 = [pEE[0] - pPrev[0], pEE[1] - pPrev[1], pEE[2] - pPrev[2]]
      Jcols.push(cross(zPrev, r))
    }

    // A = J Jᵀ + λ²I  (3×3, row-major).
    // Typed as a 9-element tuple so noUncheckedIndexedAccess doesn't widen to number|undefined.
    const A: [number,number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0,0]
    for (const jc of Jcols) {
      A[0] += jc[0]! * jc[0]!; A[1] += jc[0]! * jc[1]!; A[2] += jc[0]! * jc[2]!
      A[3] += jc[1]! * jc[0]!; A[4] += jc[1]! * jc[1]!; A[5] += jc[1]! * jc[2]!
      A[6] += jc[2]! * jc[0]!; A[7] += jc[2]! * jc[1]!; A[8] += jc[2]! * jc[2]!
    }
    A[0] += LAMBDA2; A[4] += LAMBDA2; A[8] += LAMBDA2

    // Solve A·v = e, then Δθ[i] = α · Jcols[i] · v.
    const v = solve3(A, e)
    for (let i = 0; i < n; i++) {
      angles[i] = (angles[i] ?? 0) + ALPHA * dot3(Jcols[i]!, v)
      const lim = jointLimits?.[i]
      if (lim) angles[i] = Math.max(lim.min, Math.min(lim.max, angles[i]!))
    }
  }

  return { jointAngles: angles, converged, iterations: iter }
}
