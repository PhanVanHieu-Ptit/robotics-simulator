import { describe, it, expect, beforeEach } from 'vitest'
import { SimulationClock } from '../SimulationClock'
import { SimulationConfig } from '@config/simulation'

describe('SimulationClock', () => {
  let clock: SimulationClock

  beforeEach(() => {
    clock = new SimulationClock()
  })

  // ── advance ──────────────────────────────────────────────────────────────

  describe('advance', () => {
    it('starts at simTime = 0', () => {
      expect(clock.simTime).toBe(0)
    })

    it('increases simTime by rawDelta × speedMultiplier at default speed (1×)', () => {
      const dt = clock.advance(1 / 60)
      expect(clock.simTime).toBeCloseTo(1 / 60, 10)
      expect(dt).toBeCloseTo(1 / 60, 10)
    })

    it('zero rawDelta does not advance simTime', () => {
      clock.advance(0)
      expect(clock.simTime).toBe(0)
    })

    it('rawDelta exceeding maxDt is clamped to maxDt', () => {
      const rawBig = SimulationConfig.maxDt * 10
      const dt = clock.advance(rawBig)
      expect(dt).toBeCloseTo(SimulationConfig.maxDt, 10)
      expect(clock.simTime).toBeCloseTo(SimulationConfig.maxDt, 10)
    })

    it('three calls at fixedDt accumulate simTime ≈ 3 × fixedDt', () => {
      const { fixedDt } = SimulationConfig
      clock.advance(fixedDt)
      clock.advance(fixedDt)
      clock.advance(fixedDt)
      expect(clock.simTime).toBeCloseTo(3 * fixedDt, 10)
    })

    it('returns the effective dt used (scaled by speedMultiplier)', () => {
      clock.setSpeed(2)
      const dt = clock.advance(0.1)
      expect(dt).toBeCloseTo(0.2, 10)
    })
  })

  // ── setSpeed ──────────────────────────────────────────────────────────────

  describe('setSpeed', () => {
    it('values below 0.25 are clamped to 0.25', () => {
      clock.setSpeed(0)
      expect(clock.speedMultiplier).toBe(0.25)
    })

    it('values above 4 are clamped to 4', () => {
      clock.setSpeed(100)
      expect(clock.speedMultiplier).toBe(4)
    })

    it('valid multiplier is stored exactly', () => {
      clock.setSpeed(2)
      expect(clock.speedMultiplier).toBe(2)
    })

    it('0.5× speed: same rawDelta produces half the simTime advance', () => {
      clock.setSpeed(0.5)
      clock.advance(0.1)
      expect(clock.simTime).toBeCloseTo(0.05, 10)
    })

    it('4× speed: same rawDelta produces 4× simTime advance', () => {
      clock.setSpeed(4)
      clock.advance(0.01)
      expect(clock.simTime).toBeCloseTo(0.04, 10)
    })
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('resets simTime to 0', () => {
      clock.advance(1)
      clock.reset()
      expect(clock.simTime).toBe(0)
    })

    it('preserves speedMultiplier after reset', () => {
      clock.setSpeed(2)
      clock.reset()
      expect(clock.speedMultiplier).toBe(2)
    })
  })

  // ── fixedDt ───────────────────────────────────────────────────────────────

  describe('fixedDt', () => {
    it('equals SimulationConfig.fixedDt', () => {
      expect(clock.fixedDt).toBe(SimulationConfig.fixedDt)
    })
  })
})
