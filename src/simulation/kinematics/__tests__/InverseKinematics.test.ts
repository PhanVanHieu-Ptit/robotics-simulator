import { describe, it, expect } from 'vitest'
import { solveIK } from '../InverseKinematics'
import { computeFK, mat4Position } from '../ForwardKinematics'
import frankaConfig from '@config/robots/franka_panda.json'

const { dhParams, jointLimits, initialAngles } = frankaConfig

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eePosition(angles: readonly number[]): readonly [number, number, number] {
  const transforms = computeFK(dhParams, angles)
  return mat4Position(transforms[transforms.length - 1]!)
}

function dist(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)
}

function pose(position: [number, number, number]) {
  return { position, quaternion: [0, 0, 0, 1] as [number, number, number, number] }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('solveIK', () => {

  it('converges when target equals the current end-effector position', () => {
    const currentEE = eePosition(initialAngles)
    const result = solveIK(dhParams, initialAngles, pose([...currentEE] as [number,number,number]))

    expect(result.converged).toBe(true)
    expect(result.iterations).toBeLessThan(10)

    const resultEE = eePosition(result.jointAngles)
    expect(dist(resultEE, currentEE)).toBeLessThan(1e-3)
  })

  it('reaches a reachable target within 1 mm', () => {
    // Target in front of the base, well within the ~855 mm workspace
    const target: [number, number, number] = [0.4, 0, 0.5]
    const result = solveIK(dhParams, initialAngles, pose(target), 200, jointLimits)

    expect(result.converged).toBe(true)
    const resultEE = eePosition(result.jointAngles)
    expect(dist(resultEE, target)).toBeLessThan(1e-3)
  })

  it('returns converged=false for an unreachable target', () => {
    // 10 m away — far outside the workspace
    const result = solveIK(dhParams, initialAngles, pose([10, 0, 0]), 100, jointLimits)

    expect(result.converged).toBe(false)
    expect(result.iterations).toBe(100)
  })

  it('respects joint limits on every output angle', () => {
    const target: [number, number, number] = [0.3, 0.3, 0.4]
    const result = solveIK(dhParams, initialAngles, pose(target), 200, jointLimits)

    result.jointAngles.forEach((angle, i) => {
      const lim = jointLimits[i]!
      expect(angle).toBeGreaterThanOrEqual(lim.min - 1e-9)
      expect(angle).toBeLessThanOrEqual(lim.max + 1e-9)
    })
  })

  it('does not throw or return NaN near a singular configuration (arm straight up)', () => {
    // All-zeros is close to singular for several joints
    const singularAngles = new Array(7).fill(0)
    const target: [number, number, number] = [0.3, 0, 0.5]

    expect(() => {
      const result = solveIK(dhParams, singularAngles, pose(target), 50)
      result.jointAngles.forEach((a) => expect(Number.isFinite(a)).toBe(true))
    }).not.toThrow()
  })

  it('returns the correct number of joint angles', () => {
    const result = solveIK(dhParams, initialAngles, pose([0.4, 0, 0.5]))
    expect(result.jointAngles.length).toBe(dhParams.length)
  })

  it('is idempotent: solving twice for the same target gives the same result', () => {
    const target: [number, number, number] = [0.4, 0.1, 0.45]
    const r1 = solveIK(dhParams, initialAngles, pose(target), 200, jointLimits)
    const r2 = solveIK(dhParams, initialAngles, pose(target), 200, jointLimits)

    r1.jointAngles.forEach((a, i) => {
      expect(a).toBeCloseTo(r2.jointAngles[i]!, 10)
    })
  })

  it('works without jointLimits (no clamping applied)', () => {
    const target: [number, number, number] = [0.4, 0, 0.5]
    const result = solveIK(dhParams, initialAngles, pose(target), 200)

    expect(result.converged).toBe(true)
    const resultEE = eePosition(result.jointAngles)
    expect(dist(resultEE, target)).toBeLessThan(1e-3)
  })
})
