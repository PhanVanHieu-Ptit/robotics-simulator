import { describe, it, expect, beforeEach } from 'vitest'
import { DifferentialDrive } from '../DifferentialDrive'
import driveConfig from '@config/robots/differential_drive.json'

describe('DifferentialDrive', () => {
  let robot: DifferentialDrive

  beforeEach(() => {
    robot = new DifferentialDrive(driveConfig)
  })

  // ── construction ─────────────────────────────────────────────────────────

  it('id matches config id', () => {
    expect(robot.id).toBe('diff_drive')
  })

  it('initial pose is (0, 0, θ=0)', () => {
    expect(robot.state.basePose).toEqual({ x: 0, y: 0, theta: 0 })
  })

  it('initial trajectoryBuffer is empty', () => {
    expect(robot.trajectoryBuffer).toHaveLength(0)
  })

  it('initial jointStates has two entries (left and right wheel)', () => {
    expect(robot.state.jointStates).toHaveLength(2)
  })

  // ── applyCommand — DRIVE ──────────────────────────────────────────────────

  describe('applyCommand DRIVE', () => {
    it('stores linear and angular velocities', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 1.0, angular: 0.5 })
      robot.step(1)
      // Pose should have changed from (0,0,0)
      const { x, y, theta } = robot.state.basePose
      expect(Math.abs(x) + Math.abs(y) + Math.abs(theta)).toBeGreaterThan(0)
    })

    it('linear velocity above maxLinearVel is clamped', () => {
      robot.applyCommand({ type: 'DRIVE', linear: driveConfig.maxLinearVel + 100, angular: 0 })
      robot.step(1)
      // At max speed for 1s along θ=0: x should equal maxLinearVel
      expect(robot.state.basePose.x).toBeCloseTo(driveConfig.maxLinearVel, 5)
    })

    it('negative linear velocity above magnitude limit is clamped', () => {
      robot.applyCommand({ type: 'DRIVE', linear: -(driveConfig.maxLinearVel + 100), angular: 0 })
      robot.step(1)
      expect(robot.state.basePose.x).toBeCloseTo(-driveConfig.maxLinearVel, 5)
    })

    it('angular velocity above maxAngularVel is clamped', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 0, angular: driveConfig.maxAngularVel + 100 })
      robot.step(1)
      expect(robot.state.basePose.theta).toBeCloseTo(driveConfig.maxAngularVel, 5)
    })
  })

  // ── step — kinematics ─────────────────────────────────────────────────────

  describe('step', () => {
    it('stationary at dt=0: pose unchanged', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 1.5, angular: 1.0 })
      robot.step(0)
      expect(robot.state.basePose).toEqual({ x: 0, y: 0, theta: 0 })
    })

    it('pure forward motion (θ=0, angular=0): x increases, y and theta unchanged', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
      robot.step(1)
      expect(robot.state.basePose.x).toBeGreaterThan(0)
      expect(robot.state.basePose.y).toBeCloseTo(0, 10)
      expect(robot.state.basePose.theta).toBeCloseTo(0, 10)
    })

    it('pure rotation (linear=0): position approximately unchanged, theta changes', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 0, angular: 1.0 })
      robot.step(1)
      expect(robot.state.basePose.x).toBeCloseTo(0, 10)
      expect(robot.state.basePose.y).toBeCloseTo(0, 10)
      expect(robot.state.basePose.theta).toBeCloseTo(1.0, 5)
    })

    it('combined motion: theta changes first, affecting x/y direction', () => {
      // At θ=π/2 (facing +Y), forward motion should increase y, not x
      robot.applyCommand({ type: 'DRIVE', linear: 0, angular: Math.PI / 2 })
      robot.step(1) // theta ≈ π/2 now
      robot.applyCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
      robot.step(1) // forward in new heading direction
      expect(robot.state.basePose.y).toBeGreaterThan(0.5)
      expect(Math.abs(robot.state.basePose.x)).toBeLessThan(0.5)
    })

    it('wheel joint angles advance proportionally to linear velocity', () => {
      robot.applyCommand({ type: 'DRIVE', linear: driveConfig.wheelRadius * Math.PI, angular: 0 })
      robot.step(1)
      // One full wheel revolution per second at linear = wheelRadius * π? No:
      // wheelAngDelta = (linear / wheelRadius) * dt
      const expected = (driveConfig.wheelRadius * Math.PI) / driveConfig.wheelRadius * 1
      expect(robot.state.jointStates[0]!.angle).toBeCloseTo(expected, 5)
      expect(robot.state.jointStates[1]!.angle).toBeCloseTo(expected, 5)
    })

    it('theta accumulates across multiple steps (no wrapping in robot class)', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 0, angular: 1.0 })
      // 4 × π/2 = 2π total rotation
      for (let i = 0; i < 4; i++) {
        robot.step(Math.PI / 2)
      }
      // Robot class does NOT wrap theta — it accumulates
      expect(robot.state.basePose.theta).toBeCloseTo(2 * Math.PI, 5)
    })

    it('zero input: pose does not change', () => {
      robot.step(1)
      expect(robot.state.basePose).toEqual({ x: 0, y: 0, theta: 0 })
    })

    it('multiple steps accumulate position correctly', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
      robot.step(0.5)
      robot.step(0.5)
      expect(robot.state.basePose.x).toBeCloseTo(1.0, 5)
    })
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('restores pose to (0, 0, θ=0)', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 1.0, angular: 1.0 })
      robot.step(2)
      robot.reset()
      expect(robot.state.basePose).toEqual({ x: 0, y: 0, theta: 0 })
    })

    it('clears stored velocity commands (linear and angular reset to 0)', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 2.0, angular: 1.0 })
      robot.reset()
      robot.step(1)
      expect(robot.state.basePose).toEqual({ x: 0, y: 0, theta: 0 })
    })

    it('clears trajectoryBuffer', () => {
      robot.trajectoryBuffer.push({ position: [1, 2, 3], quaternion: [0, 0, 0, 1] })
      robot.reset()
      expect(robot.trajectoryBuffer).toHaveLength(0)
    })

    it('wheel joint angles reset to 0', () => {
      robot.applyCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
      robot.step(1)
      robot.reset()
      expect(robot.state.jointStates[0]!.angle).toBeCloseTo(0, 10)
      expect(robot.state.jointStates[1]!.angle).toBeCloseTo(0, 10)
    })
  })
})
