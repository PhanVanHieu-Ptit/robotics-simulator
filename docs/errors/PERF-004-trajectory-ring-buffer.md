# PERF-004 — TrajectorySystem O(n) Splice at Buffer Cap

**Status**: `RESOLVED` (fixed in `feat: trafectory-trail`, commit `02eff6a`)
**Severity**: Medium

---

## Problem (Historical)

An early version of `TrajectorySystem` trimmed the trajectory buffer using `Array.splice()` when it exceeded `maxTrajectoryLength = 2000` points. At the cap, every new point caused an O(n) left-shift of 2000 elements, producing a visible stutter every time the buffer was full.

```ts
// BEFORE (pattern that caused the issue)
robot.trajectoryBuffer.push(newPose)
robot.trajectoryBuffer.splice(0, robot.trajectoryBuffer.length - SimulationConfig.maxTrajectoryLength)
// ↑ At cap: shifts 2000 entries every tick — O(n)
```

---

## How It Was Fixed

`TrajectorySystem` was rewritten around an internal `PositionRingBuffer` class with a fixed-capacity circular buffer. Push and overflow are O(1) — no element shifting.

```ts
// AFTER — current code in src/simulation/systems/TrajectorySystem.ts
class PositionRingBuffer {
  private readonly data: Pose3D[]
  private head = 0
  private _count = 0

  push(pose: Pose3D): void {
    if (this._count < this.capacity) {
      this.data[(this.head + this._count) % this.capacity] = pose
      this._count++
    } else {
      // Overwrite oldest slot, advance head — O(1)
      this.data[this.head] = pose
      this.head = (this.head + 1) % this.capacity
    }
    this.version++
  }
}
```

A `writeTo(Float32Array)` method copies positions in order for the renderer without further allocation.

---

## Prevention

Never use `splice(0, n)` as a ring-buffer idiom. If capacity is fixed and the oldest element should be discarded when full, use a head/tail index pair. `Array.splice` is O(n) because it must re-index every remaining element.

---

## Related Files

- [src/simulation/systems/TrajectorySystem.ts](../../src/simulation/systems/TrajectorySystem.ts) — current ring buffer implementation
- [src/config/simulation.ts](../../src/config/simulation.ts) — `maxTrajectoryLength` constant
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — PERF-4
