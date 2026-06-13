import { describe, it, expect } from 'vitest'
import { TrajectorySystem } from '../TrajectorySystem'
import { SimulationWorld } from '../../world/SimulationWorld'
import type { Robot } from '../../robots/Robot'
import type { Command } from '../../types/Command'
import type { Pose3D, RobotState } from '../../types/RobotState'

// ─── Minimal mutable mock robot ───────────────────────────────────────────────

function makeMockRobot(id: string, initialPos: [number, number, number] = [0, 0, 0]): Robot & { _pos: [number, number, number] } {
  const ZERO_QUAT: readonly [number, number, number, number] = [0, 0, 0, 1]
  const robot = {
    id,
    _pos: [...initialPos] as [number, number, number],
    get state(): RobotState {
      return {
        id,
        jointStates: [],
        basePose: { x: 0, y: 0, theta: 0 },
        endEffectorPose: { position: [...robot._pos] as [number, number, number], quaternion: ZERO_QUAT },
        dhTransforms: [],
      }
    },
    trajectoryBuffer: [] as Pose3D[],
    applyCommand(_cmd: Command) {},
    step(_dt: number) {},
    reset() { robot._pos = [0, 0, 0] },
  }
  return robot
}

function makeWorld(robot: Robot): SimulationWorld {
  const world = new SimulationWorld()
  world.addRobot(robot)
  return world
}

// ─── TrajectorySystem.tick deadband ──────────────────────────────────────────

describe('TrajectorySystem deadband filtering', () => {
  it('does not push when robot has not moved (< 1 mm)', () => {
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)
    sys.tick(world, 1 / 60) // same position

    const buf = sys.getBuffer('r1')
    expect(buf?.count).toBe(1) // only the first push (no previous = always pushed)
  })

  it('pushes on first tick regardless of previous position', () => {
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)

    expect(sys.getBuffer('r1')?.count).toBe(1)
  })

  it('pushes when movement exceeds 1 mm threshold', () => {
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)        // push at [0,0,0]
    robot._pos = [0.01, 0, 0]     // move 10 mm
    sys.tick(world, 1 / 60)        // should push again

    expect(sys.getBuffer('r1')?.count).toBe(2)
  })

  it('does not push for sub-millimetre movement (0.5 mm < 1 mm threshold)', () => {
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)
    robot._pos = [0.0005, 0, 0]   // 0.5 mm
    sys.tick(world, 1 / 60)

    expect(sys.getBuffer('r1')?.count).toBe(1)
  })

  it('robot.trajectoryBuffer matches internal ring buffer after each push', () => {
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)
    robot._pos = [0.1, 0, 0]
    sys.tick(world, 1 / 60)

    const buf = sys.getBuffer('r1')!
    expect(robot.trajectoryBuffer).toHaveLength(buf.count)
    for (let i = 0; i < buf.count; i++) {
      expect(robot.trajectoryBuffer[i]).toBe(buf.at(i))
    }
  })
})

// ─── Ring buffer capacity and overflow ───────────────────────────────────────

describe('TrajectorySystem ring buffer overflow', () => {
  it('buffer length stays at capacity after overflow', () => {
    const capacity = 5
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem(capacity)

    // Push capacity+3 distinct positions
    for (let i = 0; i <= capacity + 2; i++) {
      robot._pos = [i * 0.1, 0, 0]
      sys.tick(world, 1 / 60)
    }

    expect(sys.getBuffer('r1')?.count).toBe(capacity)
  })

  it('oldest entry is overwritten after overflow (ring wraps)', () => {
    const capacity = 3
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem(capacity)

    // Push 4 positions into a capacity-3 buffer
    const positions: [number, number, number][] = [
      [0, 0, 0],
      [0.1, 0, 0],
      [0.2, 0, 0],
      [0.3, 0, 0], // overwrites [0,0,0]
    ]
    for (const pos of positions) {
      robot._pos = pos
      sys.tick(world, 1 / 60)
    }

    const buf = sys.getBuffer('r1')!
    const arr = new Float32Array(capacity * 3)
    buf.writeTo(arr)

    // Oldest surviving entry should be [0.1,0,0]
    expect(arr[0]).toBeCloseTo(0.1, 5)
    expect(arr[3]).toBeCloseTo(0.2, 5)
    expect(arr[6]).toBeCloseTo(0.3, 5)
  })

  it('writeTo linearises buffer oldest-first', () => {
    const capacity = 4
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem(capacity)

    for (let i = 0; i < capacity; i++) {
      robot._pos = [i * 0.01, 0, 0]
      sys.tick(world, 1 / 60)
    }

    const arr = new Float32Array(capacity * 3)
    const n = sys.getBuffer('r1')!.writeTo(arr)
    expect(n).toBe(capacity)
    for (let i = 0; i < capacity; i++) {
      expect(arr[i * 3]).toBeCloseTo(i * 0.01, 5)
    }
  })

  it('writeTo after overflow contains no stale entries', () => {
    const capacity = 3
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem(capacity)

    for (let i = 0; i < capacity * 2; i++) {
      robot._pos = [i * 0.1, 0, 0]
      sys.tick(world, 1 / 60)
    }

    const arr = new Float32Array(capacity * 3)
    const n = sys.getBuffer('r1')!.writeTo(arr)

    expect(n).toBe(capacity)
    // All written X values should be the last `capacity` positions
    const expectedStart = (capacity * 2 - capacity) * 0.1
    expect(arr[0]).toBeCloseTo(expectedStart, 5)
  })
})

// ─── clearAll ─────────────────────────────────────────────────────────────────

describe('TrajectorySystem.clearAll', () => {
  it('resets count to 0 for all robot buffers', () => {
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)
    robot._pos = [0.1, 0, 0]
    sys.tick(world, 1 / 60)

    sys.clearAll()
    expect(sys.getBuffer('r1')?.count).toBe(0)
  })

  it('after clearAll, new ticks push fresh entries', () => {
    const robot = makeMockRobot('r1', [0, 0, 0])
    const world = makeWorld(robot)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)
    sys.clearAll()
    robot._pos = [1, 0, 0]
    sys.tick(world, 1 / 60)

    expect(sys.getBuffer('r1')?.count).toBe(1)
    expect(sys.getBuffer('r1')!.at(0).position[0]).toBeCloseTo(1, 5)
  })
})

// ─── Multiple robots ──────────────────────────────────────────────────────────

describe('TrajectorySystem with multiple robots', () => {
  it('tracks each robot independently', () => {
    const r1 = makeMockRobot('r1', [0, 0, 0])
    const r2 = makeMockRobot('r2', [10, 0, 0])
    const world = new SimulationWorld()
    world.addRobot(r1)
    world.addRobot(r2)
    const sys = new TrajectorySystem()

    sys.tick(world, 1 / 60)

    expect(sys.getBuffer('r1')?.count).toBe(1)
    expect(sys.getBuffer('r2')?.count).toBe(1)
    expect(sys.getBuffer('r1')!.at(0).position[0]).toBeCloseTo(0, 5)
    expect(sys.getBuffer('r2')!.at(0).position[0]).toBeCloseTo(10, 5)
  })
})
