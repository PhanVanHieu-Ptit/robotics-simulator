import { describe, it, expect, beforeEach } from 'vitest'
import { useRobotStore } from '../robotStore'
import type { WorldSnapshot } from '@simulation/types'
import type { Mat4 } from '@simulation/types'

const IDENTITY16: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const ZERO_POSE3D = { position: [0, 0, 0] as [number, number, number], quaternion: [0, 0, 0, 1] as [number, number, number, number] }

function makeFrankaRobotState(angleOverride = 0.1) {
  return {
    id: 'franka_panda',
    jointStates: Array(7).fill(null).map((_, i) => ({ angle: angleOverride + i * 0.01, velocity: 0, torque: 0 })),
    basePose: { x: 0, y: 0, theta: 0 },
    endEffectorPose: { position: [0.3, 0.4, 0.5] as [number, number, number], quaternion: [0, 0, 0, 1] as [number, number, number, number] },
    dhTransforms: Array(7).fill(IDENTITY16) as Mat4[],
  }
}

function makeSnapshot(overrides: Partial<WorldSnapshot> = {}): WorldSnapshot {
  return {
    simTime: 1.0,
    frameTime: 16,
    robots: {
      franka_panda: makeFrankaRobotState(),
    },
    trajectories: { franka_panda: [] },
    ...overrides,
  }
}

beforeEach(() => {
  useRobotStore.getState().resetAll()
})

// ── applySnapshot ─────────────────────────────────────────────────────────────

describe('applySnapshot', () => {
  it('updates jointAngles from franka_panda robot state', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    const angles = useRobotStore.getState().jointAngles
    expect(angles).toHaveLength(7)
    expect(angles[0]).toBeCloseTo(0.1, 10)
    expect(angles[6]).toBeCloseTo(0.1 + 6 * 0.01, 10)
  })

  it('updates dhTransforms from franka_panda robot state', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    const transforms = useRobotStore.getState().dhTransforms
    expect(transforms).toHaveLength(7)
    transforms.forEach((t) => t.forEach((v, i) => expect(v).toBeCloseTo(IDENTITY16[i]!, 12)))
  })

  it('updates endEffectorPose from franka_panda', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    const pose = useRobotStore.getState().endEffectorPose
    expect(pose).not.toBeNull()
    expect(pose!.position[0]).toBeCloseTo(0.3, 10)
    expect(pose!.position[1]).toBeCloseTo(0.4, 10)
    expect(pose!.position[2]).toBeCloseTo(0.5, 10)
  })

  it('updates basePose from diff_drive robot state', () => {
    const snapshot = makeSnapshot({
      robots: {
        franka_panda: makeFrankaRobotState(),
        diff_drive: {
          id: 'diff_drive',
          jointStates: [],
          basePose: { x: 5, y: 3, theta: 1.57 },
          endEffectorPose: ZERO_POSE3D,
          dhTransforms: [],
        },
      },
    })
    useRobotStore.getState().applySnapshot(snapshot)
    expect(useRobotStore.getState().basePose).toEqual({ x: 5, y: 3, theta: 1.57 })
  })

  it('stores raw robot snapshots keyed by robotId', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    const snapshots = useRobotStore.getState().robotSnapshots
    expect(snapshots).toHaveProperty('franka_panda')
  })

  it('updates trajectories from snapshot', () => {
    const traj = [ZERO_POSE3D, ZERO_POSE3D]
    const snapshot = makeSnapshot({ trajectories: { franka_panda: traj } })
    useRobotStore.getState().applySnapshot(snapshot)
    expect(useRobotStore.getState().trajectories['franka_panda']).toBe(traj)
  })

  it('missing franka_panda in snapshot: jointAngles becomes []', () => {
    const snapshot: WorldSnapshot = {
      simTime: 1,
      frameTime: 16,
      robots: {},
      trajectories: {},
    }
    useRobotStore.getState().applySnapshot(snapshot)
    expect(useRobotStore.getState().jointAngles).toHaveLength(0)
  })

  it('missing diff_drive in snapshot: basePose falls back to initial (0,0,0)', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    expect(useRobotStore.getState().basePose).toEqual({ x: 0, y: 0, theta: 0 })
  })

  it('second applySnapshot overwrites first completely', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    const updated = makeSnapshot()
    ;(updated.robots['franka_panda']!.jointStates as { angle: number; velocity: number; torque: number }[])[0]!.angle = 9.9
    // Need a truly different snapshot
    const snapshot2 = makeSnapshot({ robots: {
      franka_panda: {
        id: 'franka_panda',
        jointStates: Array(7).fill(null).map(() => ({ angle: 9.9, velocity: 0, torque: 0 })),
        basePose: { x: 0, y: 0, theta: 0 },
        endEffectorPose: ZERO_POSE3D,
        dhTransforms: Array(7).fill(IDENTITY16) as Mat4[],
      },
    }})
    useRobotStore.getState().applySnapshot(snapshot2)
    expect(useRobotStore.getState().jointAngles[0]).toBeCloseTo(9.9, 5)
  })

  it('other robots in robotSnapshots are not preserved across snapshots (full replace)', () => {
    // First snapshot has both robots
    const snap1 = makeSnapshot({
      robots: {
        franka_panda: makeFrankaRobotState(),
        diff_drive: {
          id: 'diff_drive',
          jointStates: [],
          basePose: { x: 5, y: 0, theta: 0 },
          endEffectorPose: ZERO_POSE3D,
          dhTransforms: [],
        },
      },
    })
    useRobotStore.getState().applySnapshot(snap1)

    // Second snapshot only has franka_panda
    useRobotStore.getState().applySnapshot(makeSnapshot())

    // diff_drive should no longer be in robotSnapshots
    expect(useRobotStore.getState().robotSnapshots['diff_drive']).toBeUndefined()
  })
})

// ── resetAll ─────────────────────────────────────────────────────────────────

describe('resetAll', () => {
  it('clears jointAngles', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    useRobotStore.getState().resetAll()
    expect(useRobotStore.getState().jointAngles).toHaveLength(0)
  })

  it('clears dhTransforms', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    useRobotStore.getState().resetAll()
    expect(useRobotStore.getState().dhTransforms).toHaveLength(0)
  })

  it('sets endEffectorPose to null', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    useRobotStore.getState().resetAll()
    expect(useRobotStore.getState().endEffectorPose).toBeNull()
  })

  it('resets basePose to (0, 0, 0)', () => {
    const snap = makeSnapshot({
      robots: {
        franka_panda: makeFrankaRobotState(),
        diff_drive: {
          id: 'diff_drive',
          jointStates: [],
          basePose: { x: 99, y: 99, theta: 3 },
          endEffectorPose: ZERO_POSE3D,
          dhTransforms: [],
        },
      },
    })
    useRobotStore.getState().applySnapshot(snap)
    useRobotStore.getState().resetAll()
    expect(useRobotStore.getState().basePose).toEqual({ x: 0, y: 0, theta: 0 })
  })

  it('clears trajectories and robotSnapshots', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    useRobotStore.getState().resetAll()
    expect(useRobotStore.getState().trajectories).toEqual({})
    expect(useRobotStore.getState().robotSnapshots).toEqual({})
  })
})
