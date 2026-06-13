import { describe, it, expect, beforeEach } from 'vitest'
import { FrankaArm } from '../FrankaArm'
import frankaConfig from '@config/robots/franka_panda.json'

describe('FrankaArm', () => {
  let arm: FrankaArm

  beforeEach(() => {
    arm = new FrankaArm(frankaConfig)
  })

  // ── construction ─────────────────────────────────────────────────────────

  it('id matches config id', () => {
    expect(arm.id).toBe('franka_panda')
  })

  it('initial state id matches config', () => {
    expect(arm.state.id).toBe('franka_panda')
  })

  it('initial dhTransforms has one entry per DOF', () => {
    expect(arm.state.dhTransforms).toHaveLength(frankaConfig.dhParams.length)
  })

  it('initial jointStates angles match initialAngles from config', () => {
    arm.state.jointStates.forEach((js, i) => {
      expect(js.angle).toBeCloseTo(frankaConfig.initialAngles[i]!, 10)
    })
  })

  it('initial endEffectorPose is non-null after construction', () => {
    expect(arm.state.endEffectorPose).not.toBeNull()
  })

  it('initial trajectoryBuffer is empty', () => {
    expect(arm.trajectoryBuffer).toHaveLength(0)
  })

  // ── applyCommand — SET_JOINT ──────────────────────────────────────────────

  describe('applyCommand SET_JOINT', () => {
    it('stores angle for a valid index within limits', () => {
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.0 })
      arm.step(0)
      expect(arm.state.jointStates[0]!.angle).toBeCloseTo(1.0, 10)
    })

    it('clamps angle above upper limit to upper limit', () => {
      const limit = frankaConfig.jointLimits[0]!
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: limit.max + 10 })
      arm.step(0)
      expect(arm.state.jointStates[0]!.angle).toBeCloseTo(limit.max, 10)
    })

    it('clamps angle below lower limit to lower limit', () => {
      const limit = frankaConfig.jointLimits[0]!
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: limit.min - 10 })
      arm.step(0)
      expect(arm.state.jointStates[0]!.angle).toBeCloseTo(limit.min, 10)
    })

    it('angle exactly at upper limit is accepted unchanged', () => {
      const limit = frankaConfig.jointLimits[1]!
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 1, angle: limit.max })
      arm.step(0)
      expect(arm.state.jointStates[1]!.angle).toBeCloseTo(limit.max, 10)
    })

    it('wrong robotId: angle is unchanged after step', () => {
      const before = arm.state.jointStates[0]!.angle
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'wrong_robot', index: 0, angle: 999 })
      arm.step(0)
      expect(arm.state.jointStates[0]!.angle).toBeCloseTo(before, 10)
    })

    it('out-of-range index does not crash', () => {
      expect(() => {
        arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 999, angle: 1.0 })
      }).not.toThrow()
    })

    it('only the commanded joint angle changes; other joints unchanged', () => {
      const before = arm.state.jointStates.map((js) => js.angle)
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 2, angle: 0.5 })
      arm.step(0)
      for (let i = 0; i < frankaConfig.dhParams.length; i++) {
        if (i === 2) continue
        expect(arm.state.jointStates[i]!.angle).toBeCloseTo(before[i]!, 10)
      }
    })

    it('sequential commands to the same joint: last one wins', () => {
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0.5 })
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.0 })
      arm.step(0)
      expect(arm.state.jointStates[0]!.angle).toBeCloseTo(1.0, 10)
    })
  })

  // ── applyCommand — DRIVE (ignored) ────────────────────────────────────────

  describe('applyCommand DRIVE', () => {
    it('DRIVE command is ignored — no crash and state unchanged', () => {
      const before = arm.state.jointStates.map((js) => js.angle)
      expect(() => {
        arm.applyCommand({ type: 'DRIVE', linear: 1.5, angular: 2.0 })
      }).not.toThrow()
      arm.step(0)
      arm.state.jointStates.forEach((js, i) => {
        expect(js.angle).toBeCloseTo(before[i]!, 10)
      })
    })
  })

  // ── step ─────────────────────────────────────────────────────────────────

  describe('step', () => {
    it('step rebuilds state — state object reference changes', () => {
      const s1 = arm.state
      arm.step(1 / 60)
      expect(arm.state).not.toBe(s1)
    })

    it('dhTransforms updated after SET_JOINT + step', () => {
      const before = arm.state.dhTransforms[6]!
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 6, angle: 0 })
      arm.step(0)
      // Joint 7 changed → final transform should differ
      const equal = before.every((v, i) => Math.abs(v - arm.state.dhTransforms[6]![i]!) < 1e-10)
      expect(equal).toBe(false)
    })

    it('endEffectorPose reflects moved joint after step', () => {
      const before = arm.state.endEffectorPose.position
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.0 })
      arm.step(0)
      const after = arm.state.endEffectorPose.position
      const changed = before.some((v, i) => Math.abs(v - after[i]) > 1e-5)
      expect(changed).toBe(true)
    })

    it('basePose is always (0, 0, 0) — Franka is fixed-base', () => {
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.0 })
      arm.step(1)
      expect(arm.state.basePose).toEqual({ x: 0, y: 0, theta: 0 })
    })
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('restores all joint angles to initialAngles', () => {
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0 })
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 3, angle: 0 })
      arm.step(0)
      arm.reset()
      arm.state.jointStates.forEach((js, i) => {
        expect(js.angle).toBeCloseTo(frankaConfig.initialAngles[i]!, 10)
      })
    })

    it('clears trajectoryBuffer on reset', () => {
      // Manually push into buffer to simulate trajectory data
      arm.trajectoryBuffer.push({ position: [1, 2, 3], quaternion: [0, 0, 0, 1] })
      arm.reset()
      expect(arm.trajectoryBuffer).toHaveLength(0)
    })

    it('dhTransforms recomputed from initialAngles after reset', () => {
      // Move joint 1 away from its initial angle (-0.785) to something different
      arm.applyCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 1, angle: 0 })
      arm.step(0)
      const afterMove = arm.state.dhTransforms[6]!.slice()
      arm.reset()
      arm.step(0)
      const afterReset = arm.state.dhTransforms[6]!
      // After reset, transform should differ from the moved state
      const allSame = afterReset.every((v, i) => Math.abs(v - afterMove[i]!) < 1e-10)
      expect(allSame).toBe(false)
    })
  })
})
