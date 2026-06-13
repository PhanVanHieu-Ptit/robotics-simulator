import { describe, it, expect, beforeEach } from 'vitest'
import { useSimulationStore } from '../simulationStore'

beforeEach(() => {
  // Reset to default state between tests
  useSimulationStore.setState({ isRunning: false, isPaused: false, speed: 1, mode: 'manual' })
})

describe('simulationStore', () => {
  // ── default state ─────────────────────────────────────────────────────────

  it('default isRunning is false', () => {
    expect(useSimulationStore.getState().isRunning).toBe(false)
  })

  it('default isPaused is false', () => {
    expect(useSimulationStore.getState().isPaused).toBe(false)
  })

  it('default speed is 1', () => {
    expect(useSimulationStore.getState().speed).toBe(1)
  })

  it('default mode is "manual"', () => {
    expect(useSimulationStore.getState().mode).toBe('manual')
  })

  // ── setRunning ────────────────────────────────────────────────────────────

  it('setRunning(true) sets isRunning to true', () => {
    useSimulationStore.getState().setRunning(true)
    expect(useSimulationStore.getState().isRunning).toBe(true)
  })

  it('setRunning(false) sets isRunning to false', () => {
    useSimulationStore.getState().setRunning(true)
    useSimulationStore.getState().setRunning(false)
    expect(useSimulationStore.getState().isRunning).toBe(false)
  })

  it('setRunning does not affect isPaused', () => {
    useSimulationStore.getState().setPaused(true)
    useSimulationStore.getState().setRunning(true)
    expect(useSimulationStore.getState().isPaused).toBe(true)
  })

  // ── setPaused ─────────────────────────────────────────────────────────────

  it('setPaused(true) sets isPaused to true', () => {
    useSimulationStore.getState().setPaused(true)
    expect(useSimulationStore.getState().isPaused).toBe(true)
  })

  it('setPaused(true) without setRunning: no validation error (store accepts it)', () => {
    expect(() => useSimulationStore.getState().setPaused(true)).not.toThrow()
    expect(useSimulationStore.getState().isPaused).toBe(true)
  })

  it('setPaused does not affect isRunning', () => {
    useSimulationStore.getState().setRunning(true)
    useSimulationStore.getState().setPaused(true)
    expect(useSimulationStore.getState().isRunning).toBe(true)
  })

  // ── setSpeed ──────────────────────────────────────────────────────────────

  it('setSpeed(0.25) stores 0.25', () => {
    useSimulationStore.getState().setSpeed(0.25)
    expect(useSimulationStore.getState().speed).toBe(0.25)
  })

  it('setSpeed(0.5) stores 0.5', () => {
    useSimulationStore.getState().setSpeed(0.5)
    expect(useSimulationStore.getState().speed).toBe(0.5)
  })

  it('setSpeed(2) stores 2', () => {
    useSimulationStore.getState().setSpeed(2)
    expect(useSimulationStore.getState().speed).toBe(2)
  })

  it('setSpeed(4) stores 4', () => {
    useSimulationStore.getState().setSpeed(4)
    expect(useSimulationStore.getState().speed).toBe(4)
  })

  // ── setMode ───────────────────────────────────────────────────────────────

  it('setMode("auto") stores "auto"', () => {
    useSimulationStore.getState().setMode('auto')
    expect(useSimulationStore.getState().mode).toBe('auto')
  })

  it('setMode("replay") stores "replay"', () => {
    useSimulationStore.getState().setMode('replay')
    expect(useSimulationStore.getState().mode).toBe('replay')
  })

  it('setMode("manual") restores manual mode', () => {
    useSimulationStore.getState().setMode('auto')
    useSimulationStore.getState().setMode('manual')
    expect(useSimulationStore.getState().mode).toBe('manual')
  })

  // ── state isolation ────────────────────────────────────────────────────────

  it('each action only modifies its own field', () => {
    useSimulationStore.getState().setRunning(true)
    const s = useSimulationStore.getState()
    expect(s.isRunning).toBe(true)
    expect(s.isPaused).toBe(false)
    expect(s.speed).toBe(1)
    expect(s.mode).toBe('manual')
  })
})
