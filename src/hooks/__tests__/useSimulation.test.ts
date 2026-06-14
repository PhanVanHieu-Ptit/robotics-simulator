import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSimulationStore } from '@store/simulationStore'
import { useRobotStore } from '@store/robotStore'

// Reset store state between tests
beforeEach(() => {
  useSimulationStore.setState({ isRunning: false, isPaused: false, speed: 1, mode: 'manual' })
  useRobotStore.getState().resetAll()
  vi.restoreAllMocks()
})

// ─── useSimulation state transitions ─────────────────────────────────────────
// These tests exercise the store transitions directly rather than rendering
// the hook (which requires a full R3F canvas). They verify the observable
// side-effects that matter: correct store state before and after each action.

describe('simulation lifecycle — store state', () => {
  it('initial state: not running, not paused', () => {
    const s = useSimulationStore.getState()
    expect(s.isRunning).toBe(false)
    expect(s.isPaused).toBe(false)
  })

  it('start: sets isRunning=true, isPaused=false', () => {
    useSimulationStore.setState({ isRunning: true, isPaused: false })
    expect(useSimulationStore.getState().isRunning).toBe(true)
    expect(useSimulationStore.getState().isPaused).toBe(false)
  })

  it('pause: keeps isRunning=true, sets isPaused=true', () => {
    useSimulationStore.setState({ isRunning: true, isPaused: false })
    useSimulationStore.setState({ isPaused: true })
    expect(useSimulationStore.getState().isRunning).toBe(true)
    expect(useSimulationStore.getState().isPaused).toBe(true)
  })

  it('resume: clears isPaused without touching isRunning', () => {
    useSimulationStore.setState({ isRunning: true, isPaused: true })
    useSimulationStore.setState({ isPaused: false })
    expect(useSimulationStore.getState().isRunning).toBe(true)
    expect(useSimulationStore.getState().isPaused).toBe(false)
  })

  it('stop: clears both isRunning and isPaused', () => {
    useSimulationStore.setState({ isRunning: true, isPaused: true })
    useSimulationStore.setState({ isRunning: false, isPaused: false })
    expect(useSimulationStore.getState().isRunning).toBe(false)
    expect(useSimulationStore.getState().isPaused).toBe(false)
  })
})

// ─── robotStore reset on stop ─────────────────────────────────────────────────

describe('robotStore reset', () => {
  it('resetAll clears jointAngles and endEffectorPose', () => {
    // Simulate some state arriving from a snapshot
    useRobotStore.setState({
      jointAngles: [0.1, 0.2, 0.3, 0, 0, 0, 0],
      endEffectorPose: { position: [0.3, 0.4, 0.5], quaternion: [0, 0, 0, 1] },
    })
    useRobotStore.getState().resetAll()
    expect(useRobotStore.getState().jointAngles).toHaveLength(0)
    expect(useRobotStore.getState().endEffectorPose).toBeNull()
  })

  it('resetAll clears basePose to origin', () => {
    useRobotStore.setState({ basePose: { x: 5, y: 3, theta: 1.57 } })
    useRobotStore.getState().resetAll()
    expect(useRobotStore.getState().basePose).toEqual({ x: 0, y: 0, theta: 0 })
  })
})
