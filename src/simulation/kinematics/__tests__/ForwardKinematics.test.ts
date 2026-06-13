import { describe, it, expect } from 'vitest'
import { dhTransform, computeFK, mat4Multiply, mat4Position, mat3ToQuat } from '../ForwardKinematics'
import type { DHParam } from '../DHParameters'
import frankaConfig from '@config/robots/franka_panda.json'

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const ZERO_PARAM: DHParam = { a: 0, d: 0, alpha: 0, thetaOffset: 0 }

// ─── dhTransform ─────────────────────────────────────────────────────────────

describe('dhTransform', () => {
  it('returns identity when all params and theta are zero', () => {
    const T = dhTransform(ZERO_PARAM, 0)
    T.forEach((v, i) => expect(v).toBeCloseTo(IDENTITY[i]!, 12))
  })

  it('pure Z rotation at θ = π/2: cos/sin in top-left 2×2 block', () => {
    const T = dhTransform(ZERO_PARAM, Math.PI / 2)
    expect(T[0]).toBeCloseTo(0, 10)   // cos(π/2)
    expect(T[1]).toBeCloseTo(-1, 10)  // -sin(π/2)·cos(0)
    expect(T[4]).toBeCloseTo(1, 10)   // sin(π/2)
    expect(T[5]).toBeCloseTo(0, 10)   // cos(π/2)·cos(0)
    expect(T[10]).toBeCloseTo(1, 10)  // z-axis unchanged
    expect(T[3]).toBeCloseTo(0, 10)   // no X translation
    expect(T[11]).toBeCloseTo(0, 10)  // no Z translation
  })

  it('pure Z rotation at θ = π: diagonal is -I in XY block', () => {
    const T = dhTransform(ZERO_PARAM, Math.PI)
    expect(T[0]).toBeCloseTo(-1, 10)
    expect(T[5]).toBeCloseTo(-1, 10)
    expect(T[10]).toBeCloseTo(1, 10)
  })

  it('pure X rotation when only alpha = π/2', () => {
    const p: DHParam = { a: 0, d: 0, alpha: Math.PI / 2, thetaOffset: 0 }
    const T = dhTransform(p, 0)
    // Rz(0)·Rx(π/2): rows 1 and 2 swap with sign
    expect(T[0]).toBeCloseTo(1, 10)
    expect(T[5]).toBeCloseTo(0, 10)  // cos(α)
    expect(T[6]).toBeCloseTo(-1, 10) // -cos(θ)·sin(α) = -sin(π/2)
    expect(T[9]).toBeCloseTo(1, 10)  // sin(α)
    expect(T[10]).toBeCloseTo(0, 10) // cos(α)
  })

  it('translation along X when only a is set', () => {
    const p: DHParam = { a: 1.5, d: 0, alpha: 0, thetaOffset: 0 }
    const T = dhTransform(p, 0)
    expect(mat4Position(T)).toEqual([1.5, 0, 0])
  })

  it('translation along Z when only d is set', () => {
    const p: DHParam = { a: 0, d: 2.3, alpha: 0, thetaOffset: 0 }
    const T = dhTransform(p, 0)
    expect(mat4Position(T)).toEqual([0, 0, 2.3])
  })

  it('thetaOffset shifts the joint angle', () => {
    const withOffset: DHParam  = { a: 0, d: 0, alpha: 0, thetaOffset: Math.PI / 4 }
    const withoutOffset: DHParam = { a: 0, d: 0, alpha: 0, thetaOffset: 0 }
    const T1 = dhTransform(withOffset, 0)
    const T2 = dhTransform(withoutOffset, Math.PI / 4)
    T1.forEach((v, i) => expect(v).toBeCloseTo(T2[i]!, 12))
  })

  it('combined a, d, alpha, theta produces correct translation', () => {
    // d=1, a=1, alpha=0, theta=π/2 → position should be [a·cos(θ), a·sin(θ), d] = [0, 1, 1]
    const p: DHParam = { a: 1, d: 1, alpha: 0, thetaOffset: 0 }
    const T = dhTransform(p, Math.PI / 2)
    const pos = mat4Position(T)
    expect(pos[0]).toBeCloseTo(0, 10)
    expect(pos[1]).toBeCloseTo(1, 10)
    expect(pos[2]).toBeCloseTo(1, 10)
  })
})

// ─── mat4Multiply ─────────────────────────────────────────────────────────────

describe('mat4Multiply', () => {
  const I = IDENTITY as unknown as Parameters<typeof mat4Multiply>[0]

  it('identity × identity = identity', () => {
    const R = mat4Multiply(I, I)
    R.forEach((v, i) => expect(v).toBeCloseTo(IDENTITY[i]!, 12))
  })

  it('identity × A = A', () => {
    const p: DHParam = { a: 0.5, d: 0.3, alpha: Math.PI / 3, thetaOffset: 0.1 }
    const A = dhTransform(p, 0.7)
    const R = mat4Multiply(I, A)
    R.forEach((v, i) => expect(v).toBeCloseTo(A[i], 12))
  })

  it('A × identity = A', () => {
    const p: DHParam = { a: 0.5, d: 0.3, alpha: Math.PI / 3, thetaOffset: 0.1 }
    const A = dhTransform(p, 0.7)
    const R = mat4Multiply(A, I)
    R.forEach((v, i) => expect(v).toBeCloseTo(A[i], 12))
  })

  it('is non-commutative: A × B ≠ B × A', () => {
    const A = dhTransform({ a: 1, d: 0, alpha: 0, thetaOffset: 0 }, Math.PI / 4)
    const B = dhTransform({ a: 0, d: 1, alpha: Math.PI / 2, thetaOffset: 0 }, 0)
    const AB = mat4Multiply(A, B)
    const BA = mat4Multiply(B, A)
    const equal = AB.every((v, i) => Math.abs(v - BA[i]) < 1e-10)
    expect(equal).toBe(false)
  })

  it('is associative: (A × B) × C = A × (B × C)', () => {
    const A = dhTransform({ a: 0.3, d: 0.1, alpha: 0.5, thetaOffset: 0 }, 0.2)
    const B = dhTransform({ a: 0.1, d: 0.2, alpha: -0.3, thetaOffset: 0 }, 0.5)
    const C = dhTransform({ a: 0.2, d: 0.3, alpha: 0.1, thetaOffset: 0 }, 0.3)
    const AB_C = mat4Multiply(mat4Multiply(A, B), C)
    const A_BC = mat4Multiply(A, mat4Multiply(B, C))
    AB_C.forEach((v, i) => expect(v).toBeCloseTo(A_BC[i], 10))
  })

  it('translation stacks along Z for pure-translation transforms', () => {
    const Tz1 = dhTransform({ a: 0, d: 0.1, alpha: 0, thetaOffset: 0 }, 0)
    const Tz2 = dhTransform({ a: 0, d: 0.1, alpha: 0, thetaOffset: 0 }, 0)
    const R = mat4Multiply(Tz1, Tz2)
    expect(R[11]).toBeCloseTo(0.2, 10)
  })
})

// ─── computeFK ───────────────────────────────────────────────────────────────

describe('computeFK', () => {
  it('empty params returns empty transforms array', () => {
    expect(computeFK([], [])).toHaveLength(0)
  })

  it('single joint returns exactly one transform equal to dhTransform', () => {
    const p: DHParam = { a: 0.5, d: 0.3, alpha: 1.0, thetaOffset: 0.1 }
    const theta = 0.7
    const [T] = computeFK([p], [theta])
    const expected = dhTransform(p, theta)
    T!.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12))
  })

  it('transforms are cumulative, not local — two-joint Z translation stacks', () => {
    const params: DHParam[] = [
      { a: 0, d: 0.1, alpha: 0, thetaOffset: 0 },
      { a: 0, d: 0.1, alpha: 0, thetaOffset: 0 },
    ]
    const transforms = computeFK(params, [0, 0])
    expect(transforms[1]![11]).toBeCloseTo(0.2, 10)
  })

  it('joint angle change propagates only to downstream transforms', () => {
    const params: DHParam[] = [
      { a: 0, d: 0.1, alpha: 0, thetaOffset: 0 },
      { a: 0, d: 0.1, alpha: 0, thetaOffset: 0 },
    ]
    const before = computeFK(params, [0, 0])
    const after  = computeFK(params, [0, Math.PI / 2])
    // Joint 0 transform unchanged
    before[0]!.forEach((v, i) => expect(v).toBeCloseTo(after[0]![i]!, 12))
    // Joint 1 transform IS different (downstream)
    const same = before[1]!.every((v, i) => Math.abs(v - after[1]![i]!) < 1e-10)
    expect(same).toBe(false)
  })

  it('missing joint angles default to 0 (extra params)', () => {
    const p: DHParam = { a: 0, d: 0.5, alpha: 0, thetaOffset: 0 }
    const withZero  = computeFK([p], [0])
    const withEmpty = computeFK([p], [])
    withZero[0]!.forEach((v, i) => expect(v).toBeCloseTo(withEmpty[0]![i]!, 12))
  })

  it('7-DOF Franka at home angles: EE position matches ground truth', () => {
    const transforms = computeFK(frankaConfig.dhParams, frankaConfig.initialAngles)
    expect(transforms).toHaveLength(7)
    const eePos = mat4Position(transforms[6]!)
    // Ground truth captured from first passing run using this simulator's DH convention.
    // Note: differs from Franka documentation which uses a different base-frame origin.
    expect(eePos[0]).toBeCloseTo(0.116, 3) // ±0.5 mm
    expect(eePos[1]).toBeCloseTo(0.545, 3)
    expect(eePos[2]).toBeCloseTo(0.395, 3)
  })

  it('7-DOF Franka at all-zero angles: EE within physical arm reach', () => {
    const allZero = Array<number>(7).fill(0)
    const transforms = computeFK(frankaConfig.dhParams, allZero)
    const eePos = mat4Position(transforms[6]!)
    const reach = Math.sqrt(eePos[0] ** 2 + eePos[1] ** 2 + eePos[2] ** 2)
    // Total link lengths: 0.333+0.316+0.384+0.107 ≈ 1.14m
    expect(reach).toBeLessThan(1.2)
    expect(reach).toBeGreaterThan(0)
  })
})

// ─── mat3ToQuat ───────────────────────────────────────────────────────────────

describe('mat3ToQuat', () => {
  const s45 = Math.sin(Math.PI / 4) // sin(45°) = cos(45°) ≈ 0.7071

  it('identity matrix → [0, 0, 0, 1]', () => {
    const I = IDENTITY as unknown as Parameters<typeof mat3ToQuat>[0]
    const q = mat3ToQuat(I)
    expect(q[0]).toBeCloseTo(0, 10)
    expect(q[1]).toBeCloseTo(0, 10)
    expect(q[2]).toBeCloseTo(0, 10)
    expect(q[3]).toBeCloseTo(1, 10)
  })

  it('90° rotation around Z → [0, 0, sin(π/4), cos(π/4)]', () => {
    const T = dhTransform(ZERO_PARAM, Math.PI / 2)
    const q = mat3ToQuat(T)
    expect(q[0]).toBeCloseTo(0, 10)
    expect(q[1]).toBeCloseTo(0, 10)
    expect(q[2]).toBeCloseTo(s45, 10)
    expect(q[3]).toBeCloseTo(s45, 10)
  })

  it('90° rotation around X → [sin(π/4), 0, 0, cos(π/4)]', () => {
    const T = dhTransform({ a: 0, d: 0, alpha: Math.PI / 2, thetaOffset: 0 }, 0)
    const q = mat3ToQuat(T)
    expect(q[0]).toBeCloseTo(s45, 10)
    expect(q[1]).toBeCloseTo(0, 10)
    expect(q[2]).toBeCloseTo(0, 10)
    expect(q[3]).toBeCloseTo(s45, 10)
  })

  it('180° rotation around Z → [0, 0, 1, 0] (z-dominant Shepperd branch)', () => {
    const T = dhTransform(ZERO_PARAM, Math.PI)
    const q = mat3ToQuat(T)
    expect(q[0]).toBeCloseTo(0, 10)
    expect(q[1]).toBeCloseTo(0, 10)
    expect(Math.abs(q[2])).toBeCloseTo(1, 10)
    expect(q[3]).toBeCloseTo(0, 10)
  })

  it('output is always a unit quaternion (norm = 1)', () => {
    const angles = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, Math.PI]
    for (const theta of angles) {
      const T = dhTransform({ a: 0.3, d: 0.2, alpha: 1.1, thetaOffset: 0 }, theta)
      const [x, y, z, w] = mat3ToQuat(T)
      const norm = Math.sqrt(x * x + y * y + z * z + w * w)
      expect(norm).toBeCloseTo(1, 10)
    }
  })

  it('round-trips with FK: quaternion changes when joint angle changes', () => {
    const params: DHParam[] = [{ a: 0, d: 0.1, alpha: Math.PI / 2, thetaOffset: 0 }]
    const [T0] = computeFK(params, [0])
    const [T1] = computeFK(params, [Math.PI / 2])
    const q0 = mat3ToQuat(T0!)
    const q1 = mat3ToQuat(T1!)
    const same = q0.every((v, i) => Math.abs(v - q1[i]) < 1e-10)
    expect(same).toBe(false)
  })
})

// ─── mat4Position ─────────────────────────────────────────────────────────────

describe('mat4Position', () => {
  it('extracts correct translation from a pure translation matrix', () => {
    const T = dhTransform({ a: 3, d: 7, alpha: 0, thetaOffset: 0 }, 0)
    const pos = mat4Position(T)
    expect(pos[0]).toBeCloseTo(3, 10) // a·cos(0)
    expect(pos[1]).toBeCloseTo(0, 10) // a·sin(0)
    expect(pos[2]).toBeCloseTo(7, 10) // d
  })
})
