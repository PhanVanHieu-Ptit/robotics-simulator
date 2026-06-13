import { describe, it, expect, beforeEach } from 'vitest'
import { DifferentialDriveSystem } from '../DifferentialDriveSystem'

describe('DifferentialDriveSystem', () => {
  let sys: DifferentialDriveSystem

  beforeEach(() => {
    sys = new DifferentialDriveSystem()
  })

  // ── initial state ─────────────────────────────────────────────────────────

  it('starts with all state at zero', () => {
    const s = sys.getState()
    expect(s.x).toBe(0)
    expect(s.y).toBe(0)
    expect(s.theta).toBe(0)
    expect(s.v).toBe(0)
    expect(s.omega).toBe(0)
  })

  // ── velocity ramp (acceleration) ──────────────────────────────────────────

  describe('acceleration ramp', () => {
    it('v ramps up toward target, never instantaneous', () => {
      sys.setTarget(2.0, 0)
      sys.tick(1 / 60)
      const s = sys.getState()
      expect(s.v).toBeGreaterThan(0)
      expect(s.v).toBeLessThan(2.0)
    })

    it('v does not exceed maxLinearVel after many ticks', () => {
      sys.setTarget(2.0, 0)
      for (let i = 0; i < 300; i++) sys.tick(1 / 60)
      expect(sys.getState().v).toBeLessThanOrEqual(2.0 + 1e-9)
    })

    it('omega ramps up toward target', () => {
      sys.setTarget(0, 2.5)
      sys.tick(1 / 60)
      const s = sys.getState()
      expect(s.omega).toBeGreaterThan(0)
      expect(s.omega).toBeLessThan(2.5)
    })

    it('v decelerates to 0 after target set to 0 (key released)', () => {
      // Ramp up first
      sys.setTarget(2.0, 0)
      for (let i = 0; i < 60; i++) sys.tick(1 / 60)
      expect(sys.getState().v).toBeGreaterThan(0)

      // Release — ramp down
      sys.setTarget(0, 0)
      for (let i = 0; i < 200; i++) sys.tick(1 / 60)
      expect(sys.getState().v).toBeCloseTo(0, 4)
    })
  })

  // ── theta wrapping ────────────────────────────────────────────────────────

  describe('theta wrapping', () => {
    it('theta stays in [-π, π] when rotating CCW past π', () => {
      // Pre-position theta close to π
      sys = new DifferentialDriveSystem({ maxAngularVel: 10, angularAccel: 100 })
      sys.setTarget(0, 10)
      for (let i = 0; i < 100; i++) sys.tick(0.05)

      const theta = sys.getState().theta
      expect(theta).toBeGreaterThanOrEqual(-Math.PI)
      expect(theta).toBeLessThanOrEqual(Math.PI)
    })

    it('theta stays in [-π, π] when rotating CW past -π', () => {
      sys = new DifferentialDriveSystem({ maxAngularVel: 10, angularAccel: 100 })
      sys.setTarget(0, -10)
      for (let i = 0; i < 100; i++) sys.tick(0.05)

      const theta = sys.getState().theta
      expect(theta).toBeGreaterThanOrEqual(-Math.PI)
      expect(theta).toBeLessThanOrEqual(Math.PI)
    })
  })

  // ── unicycle kinematics ───────────────────────────────────────────────────

  describe('unicycle integration', () => {
    it('pure forward (θ=0): x increases, y stays near 0', () => {
      // Snap v to max quickly with high accel
      sys = new DifferentialDriveSystem({ linearAccel: 1000, angularAccel: 1000 })
      sys.setTarget(1.0, 0)
      sys.tick(1) // 1 second at v≈1
      const s = sys.getState()
      expect(s.x).toBeCloseTo(1.0, 1)
      expect(Math.abs(s.y)).toBeLessThan(0.01)
    })

    it('pure rotation at rest: position stays near (0, 0)', () => {
      sys = new DifferentialDriveSystem({ angularAccel: 1000 })
      sys.setTarget(0, 1.0)
      sys.tick(1)
      const s = sys.getState()
      expect(Math.abs(s.x)).toBeLessThan(0.01)
      expect(Math.abs(s.y)).toBeLessThan(0.01)
      expect(s.theta).toBeGreaterThan(0)
    })
  })

  // ── frame-rate independence ───────────────────────────────────────────────

  describe('frame-rate independence', () => {
    it('10× smaller dt steps ≈ 1× large dt step within 2% (position)', () => {
      const large = new DifferentialDriveSystem({ linearAccel: 1000, angularAccel: 1000 })
      large.setTarget(1.0, 0)
      large.tick(0.1)

      const small = new DifferentialDriveSystem({ linearAccel: 1000, angularAccel: 1000 })
      small.setTarget(1.0, 0)
      for (let i = 0; i < 10; i++) small.tick(0.01)

      expect(small.getState().x).toBeCloseTo(large.getState().x, 2)
    })
  })

  // ── setTarget clamping ────────────────────────────────────────────────────

  describe('setTarget', () => {
    it('clamps v target above maxLinearVel', () => {
      sys = new DifferentialDriveSystem({ maxLinearVel: 1.0, linearAccel: 1000 })
      sys.setTarget(99, 0)
      for (let i = 0; i < 60; i++) sys.tick(1 / 60)
      expect(sys.getState().v).toBeLessThanOrEqual(1.0 + 1e-9)
    })

    it('clamps omega target above maxAngularVel', () => {
      sys = new DifferentialDriveSystem({ maxAngularVel: 1.0, angularAccel: 1000 })
      sys.setTarget(0, 99)
      for (let i = 0; i < 60; i++) sys.tick(1 / 60)
      expect(sys.getState().omega).toBeLessThanOrEqual(1.0 + 1e-9)
    })
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('resets all state to zero', () => {
      sys.setTarget(2.0, 1.0)
      for (let i = 0; i < 30; i++) sys.tick(1 / 60)
      sys.reset()
      const s = sys.getState()
      expect(s.x).toBe(0)
      expect(s.y).toBe(0)
      expect(s.theta).toBe(0)
      expect(s.v).toBe(0)
      expect(s.omega).toBe(0)
    })

    it('after reset, new setTarget and tick work normally', () => {
      sys.setTarget(1.0, 0)
      sys.tick(1)
      sys.reset()
      sys.setTarget(1.0, 0)
      sys.tick(1 / 60)
      expect(sys.getState().v).toBeGreaterThan(0)
    })
  })

  // ── getState ──────────────────────────────────────────────────────────────

  it('getState returns current state without advancing', () => {
    sys.setTarget(1.0, 0)
    const s1 = sys.getState()
    const s2 = sys.getState()
    expect(s1).toBe(s2)
    expect(s1.v).toBe(0) // no tick called
  })
})
