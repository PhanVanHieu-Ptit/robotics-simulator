import type { System } from './System'
import type { SimulationWorld } from '../world/SimulationWorld'
import type { Pose3D } from '../types/RobotState'
import { SimulationConfig } from '@config/simulation'

// Circular buffer: O(1) push and overflow — no splice, no element shifting.
export class PositionRingBuffer {
  private readonly data: Pose3D[]
  private head = 0
  private _count = 0
  version = 0

  constructor(readonly capacity: number) {
    this.data = new Array(capacity)
  }

  get count(): number {
    return this._count
  }

  push(pose: Pose3D): void {
    if (this._count < this.capacity) {
      this.data[(this.head + this._count) % this.capacity] = pose
      this._count++
    } else {
      this.data[this.head] = pose
      this.head = (this.head + 1) % this.capacity
    }
    this.version++
  }

  at(i: number): Pose3D {
    return this.data[(this.head + i) % this.capacity]!
  }

  last(): Pose3D | undefined {
    return this._count > 0 ? this.at(this._count - 1) : undefined
  }

  /** Copy positions oldest→newest into a Float32Array. Returns point count. */
  writeTo(target: Float32Array): number {
    const n = this._count
    for (let i = 0; i < n; i++) {
      const [x, y, z] = this.at(i).position
      target[i * 3]     = x
      target[i * 3 + 1] = y
      target[i * 3 + 2] = z
    }
    return n
  }

  /** Linearise to a plain Pose3D array (one allocation per call). */
  toArray(): Pose3D[] {
    const out: Pose3D[] = new Array(this._count)
    for (let i = 0; i < this._count; i++) out[i] = this.at(i)
    return out
  }

  clear(): void {
    this.head = 0
    this._count = 0
    this.version++
  }
}

export class TrajectorySystem implements System {
  private readonly buffers = new Map<string, PositionRingBuffer>()
  private readonly capacity: number

  constructor(capacity = SimulationConfig.maxTrajectoryLength) {
    this.capacity = capacity
  }

  tick(world: SimulationWorld, _dt: number): void {
    for (const robot of world.robots.values()) {
      const { position } = robot.state.endEffectorPose

      let buf = this.buffers.get(robot.id)
      if (!buf) {
        buf = new PositionRingBuffer(this.capacity)
        this.buffers.set(robot.id, buf)
      }

      // Dead-band: skip if moved < 1 mm (avoids duplicate points)
      const last = buf.last()
      if (last) {
        const dx = position[0] - last.position[0]
        const dy = position[1] - last.position[1]
        const dz = position[2] - last.position[2]
        if (dx * dx + dy * dy + dz * dz < 1e-6) continue
      }

      buf.push(robot.state.endEffectorPose)
    }
  }

  /**
   * Build a `Record<robotId, Pose3D[]>` from the current ring buffers.
   * Called once per tick by SimulationEngine — O(n) per robot, but only once,
   * not inside the per-push hot path.
   */
  getTrajectorySnapshot(): Record<string, readonly Pose3D[]> {
    const result: Record<string, readonly Pose3D[]> = {}
    for (const [id, buf] of this.buffers) {
      result[id] = buf.toArray()
    }
    return result
  }

  /** Direct access to the ring buffer for renderers that bypass the store. */
  getBuffer(robotId: string): PositionRingBuffer | undefined {
    return this.buffers.get(robotId)
  }

  clearAll(): void {
    for (const buf of this.buffers.values()) buf.clear()
  }
}
