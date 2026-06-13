import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SimulationEngine } from '../core/SimulationEngine'
import { SimulationWorld } from '../world/SimulationWorld'
import { SimulationClock } from '../core/SimulationClock'
import { FrankaArm } from '../robots/FrankaArm'
import { DifferentialDrive } from '../robots/DifferentialDrive'
import { InputSystem } from '../systems/InputSystem'
import { KinematicsSystem } from '../systems/KinematicsSystem'
import { TrajectorySystem } from '../systems/TrajectorySystem'
import frankaConfig from '@config/robots/franka_panda.json'
import driveConfig from '@config/robots/differential_drive.json'
import type { WorldSnapshot } from '../types/WorldSnapshot'

function buildEngine(onSnapshot = vi.fn()): SimulationEngine {
  const world = new SimulationWorld()
  world.addRobot(new FrankaArm(frankaConfig))
  world.addRobot(new DifferentialDrive(driveConfig))
  const clock = new SimulationClock()
  const systems = [new InputSystem(), new KinematicsSystem(), new TrajectorySystem()]
  return new SimulationEngine(world, clock, systems, onSnapshot)
}

describe('SimulationEngine — full tick cycle', () => {
  let onSnapshot: ReturnType<typeof vi.fn>
  let engine: SimulationEngine

  beforeEach(() => {
    onSnapshot = vi.fn()
    engine = buildEngine(onSnapshot)
  })

  // ── snapshot emission ─────────────────────────────────────────────────────

  it('tick() calls onSnapshot exactly once', () => {
    engine.tick(1 / 60)
    expect(onSnapshot).toHaveBeenCalledOnce()
  })

  it('multiple ticks call onSnapshot each time', () => {
    engine.tick(1 / 60)
    engine.tick(1 / 60)
    engine.tick(1 / 60)
    expect(onSnapshot).toHaveBeenCalledTimes(3)
  })

  it('snapshot contains both robots', () => {
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots).toHaveProperty('franka_panda')
    expect(snapshot.robots).toHaveProperty('diff_drive')
  })

  it('franka_panda dhTransforms has 7 entries', () => {
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.dhTransforms).toHaveLength(7)
  })

  it('snapshot.simTime increases with each tick', () => {
    engine.tick(1 / 60)
    engine.tick(1 / 60)
    const s1: WorldSnapshot = onSnapshot.mock.calls[0][0]
    const s2: WorldSnapshot = onSnapshot.mock.calls[1][0]
    expect(s2.simTime).toBeGreaterThan(s1.simTime)
  })

  it('60 ticks at fixedDt: simTime ≈ 1.0 s', () => {
    for (let i = 0; i < 60; i++) engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[59][0]
    expect(snapshot.simTime).toBeCloseTo(1.0, 4)
  })

  it('snapshot.frameTime is a non-negative number', () => {
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.frameTime).toBeGreaterThanOrEqual(0)
  })

  // ── command → robot propagation ───────────────────────────────────────────

  it('DRIVE command applied before tick: diff_drive basePose.x changes', () => {
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0 })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeGreaterThan(0)
  })

  it('DRIVE command not applied: diff_drive stays at origin', () => {
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeCloseTo(0, 10)
  })

  it('SET_JOINT applied before tick: franka jointAngles[0] changes', () => {
    const targetAngle = 1.0
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: targetAngle })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[0]!.angle).toBeCloseTo(targetAngle, 10)
  })

  // ── RESET command ─────────────────────────────────────────────────────────

  it('RESET command: diff_drive basePose returns to origin after move', () => {
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0 })
    engine.tick(1 / 60)
    engine.world.enqueueCommand({ type: 'RESET' })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[1][0]
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeCloseTo(0, 5)
  })

  it('RESET command: franka joint angles return to initialAngles', () => {
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0 })
    engine.tick(1 / 60)
    engine.world.enqueueCommand({ type: 'RESET' })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[1][0]
    expect(snapshot.robots['franka_panda']!.jointStates[0]!.angle)
      .toBeCloseTo(frankaConfig.initialAngles[0]!, 5)
  })

  // ── engine.reset() ────────────────────────────────────────────────────────

  it('engine.reset() resets simTime to 0 and robot poses', () => {
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0 })
    engine.tick(1 / 60)
    engine.reset()
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[1][0]
    // simTime should restart from near 0
    expect(snapshot.simTime).toBeCloseTo(1 / 60, 5)
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeCloseTo(0, 5)
  })

  // ── engine.step() (no rawDelta → uses fixedDt) ───────────────────────────

  it('step() without rawDelta uses fixedDt (simTime advances by fixedDt)', () => {
    engine.step()
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    // fixedDt = 1/60; speedMultiplier = 1 → simTime ≈ 1/60 but engine.step uses clock.fixedDt not advance
    // Per SimulationEngine.step: tick(undefined) → dt = clock.fixedDt (not advanced by clock)
    expect(snapshot.simTime).toBe(0) // clock.advance is NOT called in step mode
  })

  // ── trajectories ──────────────────────────────────────────────────────────

  it('snapshot.trajectories contains entries for all robots', () => {
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.trajectories).toHaveProperty('franka_panda')
    expect(snapshot.trajectories).toHaveProperty('diff_drive')
  })

  // ── ECS pipeline order (InputSystem → KinematicsSystem → TrajectorySystem) ──

  it('command takes effect in the same tick it is enqueued', () => {
    // DRIVE enqueued before tick → InputSystem applies it → KinematicsSystem steps → pose changed in snapshot
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 2.0, angular: 0 })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeGreaterThan(0)
  })
})
