import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputSystem } from '../InputSystem'
import { SimulationWorld } from '../../world/SimulationWorld'
import type { Robot } from '../../robots/Robot'
import type { Command } from '../../types/Command'
import type { Pose3D, RobotState } from '../../types/RobotState'

function makeMockRobot(id: string): Robot & { lastCommand: Command | null } {
  const mock = {
    id,
    lastCommand: null as Command | null,
    resetCallCount: 0,
    state: {
      id,
      jointStates: [],
      basePose: { x: 0, y: 0, theta: 0 },
      endEffectorPose: { position: [0, 0, 0] as [number, number, number], quaternion: [0, 0, 0, 1] as [number, number, number, number] },
      dhTransforms: [],
    } as RobotState,
    trajectoryBuffer: [] as Pose3D[],
    applyCommand(cmd: Command) { mock.lastCommand = cmd },
    step(_dt: number) {},
    reset() { mock.resetCallCount++ },
  }
  return mock
}

describe('InputSystem', () => {
  let world: SimulationWorld
  let sys: InputSystem

  beforeEach(() => {
    world = new SimulationWorld()
    sys = new InputSystem()
  })

  // ── DRIVE command routing ──────────────────────────────────────────────────

  it('DRIVE command goes to all robots (including Franka — BUG-3 documented behaviour)', () => {
    const franka = makeMockRobot('franka_panda')
    const drive  = makeMockRobot('diff_drive')
    world.addRobot(franka)
    world.addRobot(drive)
    world.enqueueCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
    sys.tick(world, 1 / 60)
    expect(franka.lastCommand).toMatchObject({ type: 'DRIVE' })
    expect(drive.lastCommand).toMatchObject({ type: 'DRIVE' })
  })

  it('DRIVE payload is forwarded intact', () => {
    const robot = makeMockRobot('r1')
    world.addRobot(robot)
    world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: -2.0 })
    sys.tick(world, 1 / 60)
    expect(robot.lastCommand).toEqual({ type: 'DRIVE', linear: 1.5, angular: -2.0 })
  })

  // ── SET_JOINT command routing ─────────────────────────────────────────────

  it('SET_JOINT routes to the targeted robot only', () => {
    const franka = makeMockRobot('franka_panda')
    const drive  = makeMockRobot('diff_drive')
    world.addRobot(franka)
    world.addRobot(drive)
    world.enqueueCommand({ type: 'SET_JOINT', robotId: 'franka_panda', index: 0, angle: 1.0 })
    sys.tick(world, 1 / 60)
    expect(franka.lastCommand).toMatchObject({ type: 'SET_JOINT', index: 0 })
    expect(drive.lastCommand).toBeNull()
  })

  it('SET_JOINT with unknown robotId: no robot receives the command, no crash', () => {
    const franka = makeMockRobot('franka_panda')
    world.addRobot(franka)
    expect(() => {
      world.enqueueCommand({ type: 'SET_JOINT', robotId: 'nonexistent', index: 0, angle: 1.0 })
      sys.tick(world, 1 / 60)
    }).not.toThrow()
    expect(franka.lastCommand).toBeNull()
  })

  // ── RESET command ─────────────────────────────────────────────────────────

  it('RESET calls reset() on all robots', () => {
    const r1 = makeMockRobot('r1')
    const r2 = makeMockRobot('r2')
    world.addRobot(r1)
    world.addRobot(r2)
    world.enqueueCommand({ type: 'RESET' })
    sys.tick(world, 1 / 60)
    expect(r1.resetCallCount).toBe(1)
    expect(r2.resetCallCount).toBe(1)
  })

  it('RESET does not call applyCommand on any robot', () => {
    const r1 = makeMockRobot('r1')
    world.addRobot(r1)
    world.enqueueCommand({ type: 'RESET' })
    sys.tick(world, 1 / 60)
    expect(r1.lastCommand).toBeNull()
  })

  // ── command queue flush ───────────────────────────────────────────────────

  it('queue is emptied after tick — second tick receives no commands', () => {
    const robot = makeMockRobot('r1')
    world.addRobot(robot)
    world.enqueueCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
    sys.tick(world, 1 / 60)

    robot.lastCommand = null
    sys.tick(world, 1 / 60) // no new commands enqueued
    expect(robot.lastCommand).toBeNull()
  })

  it('multiple commands in one tick are all processed', () => {
    const applyFn = vi.fn()
    const robot: Robot = {
      id: 'r1',
      state: {
        id: 'r1', jointStates: [], basePose: { x: 0, y: 0, theta: 0 },
        endEffectorPose: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] }, dhTransforms: [],
      },
      trajectoryBuffer: [],
      applyCommand: applyFn,
      step: vi.fn(),
      reset: vi.fn(),
    }
    world.addRobot(robot)
    world.enqueueCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
    world.enqueueCommand({ type: 'DRIVE', linear: 0.5, angular: 1.0 })
    sys.tick(world, 1 / 60)
    expect(applyFn).toHaveBeenCalledTimes(2)
  })

  // ── no robots ─────────────────────────────────────────────────────────────

  it('tick with no robots and queued commands does not crash', () => {
    world.enqueueCommand({ type: 'DRIVE', linear: 1.0, angular: 0 })
    expect(() => sys.tick(world, 1 / 60)).not.toThrow()
  })
})
