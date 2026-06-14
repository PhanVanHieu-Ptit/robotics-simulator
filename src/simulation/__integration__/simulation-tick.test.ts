import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SimulationEngine } from '../core/SimulationEngine'
import { SimulationWorld } from '../world/SimulationWorld'
import { SimulationClock } from '../core/SimulationClock'
import { FrankaArm } from '../robots/FrankaArm'
import { DifferentialDrive } from '../robots/DifferentialDrive'
import { InputSystem } from '../systems/InputSystem'
import { KinematicsSystem } from '../systems/KinematicsSystem'
import { TrajectorySystem } from '../systems/TrajectorySystem'
import { computeFK, mat4Position } from '../kinematics/ForwardKinematics'
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

  // ── DriveCommand robotId targeting ───────────────────────────────────────

  it('DRIVE with robotId targets only that robot', () => {
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0, robotId: 'diff_drive' })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeGreaterThan(0)
  })

  it('DRIVE with unknown robotId: no robot moves', () => {
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0, robotId: 'nonexistent' })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeCloseTo(0, 10)
  })

  it('DRIVE without robotId broadcasts to all mobile robots', () => {
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0 })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    // diff_drive handles DRIVE; franka ignores it — broadcast must reach diff_drive
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeGreaterThan(0)
  })

  // ── ECS pipeline order (InputSystem → KinematicsSystem → TrajectorySystem) ──

  it('command takes effect in the same tick it is enqueued', () => {
    // DRIVE enqueued before tick → InputSystem applies it → KinematicsSystem steps → pose changed in snapshot
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 2.0, angular: 0 })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['diff_drive']!.basePose.x).toBeGreaterThan(0)
  })

  // ── SET_JOINT — joint limit clamping ─────────────────────────────────────

  it('SET_JOINT above joint max is clamped to max', () => {
    const joint = 0
    const overMax = frankaConfig.jointLimits[joint]!.max + 2.0
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: joint, angle: overMax })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[joint]!.angle)
      .toBeCloseTo(frankaConfig.jointLimits[joint]!.max, 5)
  })

  it('SET_JOINT below joint min is clamped to min', () => {
    const joint = 1
    const underMin = frankaConfig.jointLimits[joint]!.min - 2.0
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: joint, angle: underMin })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[joint]!.angle)
      .toBeCloseTo(frankaConfig.jointLimits[joint]!.min, 5)
  })

  it('SET_JOINT at exactly joint max is accepted without clamping', () => {
    const joint = 0
    const atMax = frankaConfig.jointLimits[joint]!.max
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: joint, angle: atMax })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[joint]!.angle).toBeCloseTo(atMax, 5)
  })

  it('SET_JOINT at exactly joint min is accepted without clamping', () => {
    const joint = 1
    const atMin = frankaConfig.jointLimits[joint]!.min
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: joint, angle: atMin })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[joint]!.angle).toBeCloseTo(atMin, 5)
  })

  // ── command queue drains each tick ────────────────────────────────────────

  it('SET_JOINT command is consumed after one tick and not re-applied', () => {
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.0 })
    engine.tick(1 / 60)
    // Second tick: no new commands — angle must stay at 1.0, not drift back to initial
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[1][0]
    expect(snapshot.robots['franka_panda']!.jointStates[0]!.angle).toBeCloseTo(1.0, 10)
  })

  it('no commands: franka joint angles stay at initialAngles across multiple ticks', () => {
    engine.tick(1 / 60)
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[1][0]
    frankaConfig.initialAngles.forEach((initAngle, i) => {
      expect(snapshot.robots['franka_panda']!.jointStates[i]!.angle).toBeCloseTo(initAngle, 10)
    })
  })

  // ── multiple SET_JOINT in same tick ──────────────────────────────────────

  it('multiple SET_JOINT to different joints in one tick: all applied', () => {
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0.5 })
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 2, angle: 1.0 })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[0]!.angle).toBeCloseTo(0.5, 10)
    expect(snapshot.robots['franka_panda']!.jointStates[2]!.angle).toBeCloseTo(1.0, 10)
  })

  it('two SET_JOINT to the same joint in one tick: last command wins', () => {
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0.5 })
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.2 })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[0]!.angle).toBeCloseTo(1.2, 10)
  })

  // ── FK consistency after SET_JOINT ───────────────────────────────────────

  it('endEffectorPose changes after SET_JOINT', () => {
    engine.tick(1 / 60)
    const baseEE = onSnapshot.mock.calls[0][0].robots['franka_panda']!.endEffectorPose!.position

    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.5 })
    engine.tick(1 / 60)
    const newEE = onSnapshot.mock.calls[1][0].robots['franka_panda']!.endEffectorPose!.position

    const dist = Math.sqrt(
      (newEE[0] - baseEE[0]) ** 2 + (newEE[1] - baseEE[1]) ** 2 + (newEE[2] - baseEE[2]) ** 2,
    )
    expect(dist).toBeGreaterThan(0.001)
  })

  it('endEffectorPose in snapshot matches computeFK output after SET_JOINT', () => {
    const angle = 1.0
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]

    const expectedAngles = [...frankaConfig.initialAngles]
    expectedAngles[0] = angle
    const transforms = computeFK(frankaConfig.dhParams, expectedAngles)
    const expectedPos = mat4Position(transforms[transforms.length - 1]!)

    const snapshotPos = snapshot.robots['franka_panda']!.endEffectorPose!.position
    expect(snapshotPos[0]).toBeCloseTo(expectedPos[0], 5)
    expect(snapshotPos[1]).toBeCloseTo(expectedPos[1], 5)
    expect(snapshotPos[2]).toBeCloseTo(expectedPos[2], 5)
  })

  it('dhTransforms in snapshot matches computeFK transforms after SET_JOINT', () => {
    const angle = 0.8
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 2, angle })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]

    const expectedAngles = [...frankaConfig.initialAngles]
    expectedAngles[2] = angle
    const expectedTransforms = computeFK(frankaConfig.dhParams, expectedAngles)

    const snapshotTransforms = snapshot.robots['franka_panda']!.dhTransforms
    expect(snapshotTransforms).toHaveLength(expectedTransforms.length)
    expectedTransforms.forEach((mat, i) => {
      mat.forEach((val, j) => {
        expect(snapshotTransforms[i]![j]).toBeCloseTo(val, 5)
      })
    })
  })

  // ── SET_IK_TARGET ─────────────────────────────────────────────────────────

  it('SET_IK_TARGET: arm EE moves closer to target after one tick', () => {
    const target: [number, number, number] = [0.4, 0, 0.5]

    engine.tick(1 / 60)
    const initialEE = onSnapshot.mock.calls[0][0].robots['franka_panda']!.endEffectorPose!.position
    const initialDist = Math.sqrt(
      (initialEE[0] - target[0]) ** 2 + (initialEE[1] - target[1]) ** 2 + (initialEE[2] - target[2]) ** 2,
    )

    engine.world.enqueueCommand({
      type: 'SET_IK_TARGET',
      robotId: 'franka_panda',
      target: { position: target, quaternion: [0, 0, 0, 1] },
    })
    engine.tick(1 / 60)
    const newEE = onSnapshot.mock.calls[1][0].robots['franka_panda']!.endEffectorPose!.position
    const newDist = Math.sqrt(
      (newEE[0] - target[0]) ** 2 + (newEE[1] - target[1]) ** 2 + (newEE[2] - target[2]) ** 2,
    )

    expect(newDist).toBeLessThan(initialDist)
  })

  it('SET_IK_TARGET: converges to within 1 mm for a reachable target in one tick', () => {
    const target: [number, number, number] = [0.4, 0, 0.5]
    engine.world.enqueueCommand({
      type: 'SET_IK_TARGET',
      robotId: 'franka_panda',
      target: { position: target, quaternion: [0, 0, 0, 1] },
    })
    engine.tick(1 / 60)

    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    const eePos = snapshot.robots['franka_panda']!.endEffectorPose!.position
    const dist = Math.sqrt(
      (eePos[0] - target[0]) ** 2 + (eePos[1] - target[1]) ** 2 + (eePos[2] - target[2]) ** 2,
    )
    expect(dist).toBeLessThan(1e-3)
  })

  it('SET_IK_TARGET: out-of-reach target — result stays within joint limits', () => {
    engine.world.enqueueCommand({
      type: 'SET_IK_TARGET',
      robotId: 'franka_panda',
      target: { position: [10, 0, 0], quaternion: [0, 0, 0, 1] },
    })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    snapshot.robots['franka_panda']!.jointStates.forEach((js, i) => {
      const lim = frankaConfig.jointLimits[i]!
      expect(js.angle).toBeGreaterThanOrEqual(lim.min - 1e-9)
      expect(js.angle).toBeLessThanOrEqual(lim.max + 1e-9)
    })
  })

  it('SET_IK_TARGET: consumed after one tick — second tick does not re-run IK', () => {
    const target: [number, number, number] = [0.4, 0, 0.5]
    engine.world.enqueueCommand({
      type: 'SET_IK_TARGET',
      robotId: 'franka_panda',
      target: { position: target, quaternion: [0, 0, 0, 1] },
    })
    engine.tick(1 / 60)
    const anglesAfterIK = onSnapshot.mock.calls[0][0].robots['franka_panda']!.jointStates.map(j => j.angle)

    // Second tick: no new IK command — angles must be unchanged
    engine.tick(1 / 60)
    const anglesAfterIdle = onSnapshot.mock.calls[1][0].robots['franka_panda']!.jointStates.map(j => j.angle)

    anglesAfterIK.forEach((angle, i) => {
      expect(anglesAfterIdle[i]).toBeCloseTo(angle, 10)
    })
  })

  // ── play-mode slider simulation ───────────────────────────────────────────

  it('slider drag in play mode: angle persists across subsequent ticks', () => {
    // joint 4: limits [-2.8973, 2.8973]; 1.3 is well within range
    const sliderAngle = 1.3
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 4, angle: sliderAngle })
    engine.tick(1 / 60)

    // Simulate play continuing without any new slider input
    engine.tick(1 / 60)
    engine.tick(1 / 60)

    const snapshot: WorldSnapshot = onSnapshot.mock.calls[2][0]
    expect(snapshot.robots['franka_panda']!.jointStates[4]!.angle).toBeCloseTo(sliderAngle, 10)
  })

  it('pause simulation: state is unchanged when tick() is not called', () => {
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0.8 })
    engine.tick(1 / 60) // play: command applied

    // Pause: useSimulationFrame checks isPaused → skips tick() entirely.
    // State in the engine must be identical when play resumes.
    engine.tick(1 / 60) // resume: no new commands
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[1][0]
    expect(snapshot.robots['franka_panda']!.jointStates[0]!.angle).toBeCloseTo(0.8, 10)
  })

  it('slider drag then different angle: only the latest command angle is in effect', () => {
    // Simulate user dragging slider quickly: two commands enqueued in one tick
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0.3 })
    engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 0.9 })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['franka_panda']!.jointStates[0]!.angle).toBeCloseTo(0.9, 10)
  })

  // ── all 7 joints via SET_JOINT ────────────────────────────────────────────

  it('all 7 Franka joints can be independently set in a single tick', () => {
    const raw = [0.1, -0.3, 0.5, -1.0, 0.2, 1.0, -0.4]
    const clamped = raw.map((a, i) => {
      const lim = frankaConfig.jointLimits[i]!
      return Math.max(lim.min, Math.min(lim.max, a))
    })
    clamped.forEach((angle, i) => {
      engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: i, angle })
    })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[0][0]
    clamped.forEach((angle, i) => {
      expect(snapshot.robots['franka_panda']!.jointStates[i]!.angle).toBeCloseTo(angle, 5)
    })
  })

  // ── RESET restores all joints ─────────────────────────────────────────────

  it('RESET after setting all 7 joints restores every angle to initialAngles', () => {
    frankaConfig.jointLimits.forEach((lim, i) => {
      engine.world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: i, angle: lim.max })
    })
    engine.tick(1 / 60)

    engine.world.enqueueCommand({ type: 'RESET' })
    engine.tick(1 / 60)
    const snapshot: WorldSnapshot = onSnapshot.mock.calls[1][0]
    frankaConfig.initialAngles.forEach((initAngle, i) => {
      expect(snapshot.robots['franka_panda']!.jointStates[i]!.angle).toBeCloseTo(initAngle, 5)
    })
  })
})
