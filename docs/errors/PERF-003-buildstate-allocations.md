# PERF-003 — `FrankaArm.buildState()` Allocates on Every Physics Tick

**Status**: `OPEN`
**Severity**: Medium (GC pressure at 60 Hz)

---

## Problem

`FrankaArm.step()` calls `buildState()` every tick, which calls `computeFK()`, which allocates a new `Mat4[]` array and a new `RobotState` object. At 7 joints + 60 Hz this is ~8 heap objects per tick = ~480 allocations/second from the simulation layer alone.

---

## Root Cause

```ts
// src/simulation/robots/FrankaArm.ts
step(_dt: number): void {
  this.state = this.buildState()   // allocates every tick
}

private buildState(): RobotState {
  const transforms = computeFK(this.cfg.dhParams, this._angles)
  // ↑ computeFK builds a new Mat4[] and pushes to it in a loop
  return {
    id: this.cfg.id,
    jointStates: this._angles.map(...),   // allocates array + 7 objects
    endEffectorPose: { position: pos, quaternion: [0,0,0,1] },  // allocates
    dhTransforms: transforms,
  }
}
```

```ts
// src/simulation/kinematics/ForwardKinematics.ts
export function computeFK(dhParams, jointAngles): Mat4[] {
  const transforms: Mat4[] = []    // new array every call
  let acc: Mat4 = IDENTITY
  for (...) {
    acc = mat4Multiply(acc, local) // new Mat4 per joint
    transforms.push(acc)
  }
  return transforms
}
```

---

## Fix

Pre-allocate the transforms array and joint state array; mutate in-place each tick.

```ts
// src/simulation/robots/FrankaArm.ts
export class FrankaArm implements Robot {
  // Pre-allocated buffers — mutated every tick, never reallocated
  private _transforms: Mat4[]
  private _jointStates: { angle: number; velocity: number; torque: number }[]

  constructor(private readonly cfg: FrankaArmConfig) {
    this._transforms  = new Array(cfg.dhParams.length)
    this._jointStates = cfg.initialAngles.map((angle) => ({ angle, velocity: 0, torque: 0 }))
    // ...
  }

  step(_dt: number): void {
    computeFKInPlace(this.cfg.dhParams, this._angles, this._transforms)
    for (let i = 0; i < this._angles.length; i++) {
      this._jointStates[i]!.angle = this._angles[i]!
    }
    // Mutate existing state rather than replacing
    const ee = this._transforms[this._transforms.length - 1]
    if (ee) {
      this.state.endEffectorPose = { position: mat4Position(ee), quaternion: [0,0,0,1] }
      this.state.dhTransforms = this._transforms
    }
  }
}
```

This requires changing `computeFK` to accept an output buffer (`computeFKInPlace`), and relaxing `Mat4` from a `readonly` tuple to a mutable typed array or plain `number[]`.

---

## Prevention

Hot-path code (anything called in `step()` at 60 Hz) should allocate zero heap objects per call. Pre-allocate in the constructor, mutate in the tick. Profile with Chrome DevTools Memory tab → "Allocation instrumentation on timeline" to catch regressions.

---

## Related Files

- [src/simulation/robots/FrankaArm.ts](../../src/simulation/robots/FrankaArm.ts) — `step()` and `buildState()`
- [src/simulation/kinematics/ForwardKinematics.ts](../../src/simulation/kinematics/ForwardKinematics.ts) — `computeFK()` allocations
- [src/simulation/types/RobotState.ts](../../src/simulation/types/RobotState.ts) — `Mat4` type definition
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — PERF-3
