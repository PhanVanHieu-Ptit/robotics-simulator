# INC-003 — `DifferentialDrive.dhTransforms` Always Returns Identity Matrix

**Status**: `OPEN`
**Severity**: Low

---

## Problem

`DifferentialDrive.state.dhTransforms` always contains a single 4×4 identity matrix, regardless of the robot's actual world position and orientation. Any consumer that reads `dhTransforms[0]` to get the robot's world-space pose will receive the origin with no rotation — silently wrong.

**Current safe zone**: No system currently reads `dhTransforms` from `DifferentialDrive`. The real pose is correctly tracked in `basePose: Pose2D`. But this is an implicit contract that is easy to violate.

---

## Root Cause

```ts
// src/simulation/robots/DifferentialDrive.ts
const IDENTITY16 = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] as const

private buildState(pose: Pose2D, leftAngle: number, rightAngle: number): RobotState {
  return {
    // ...
    dhTransforms: [IDENTITY16],   // ← never updated from pose
  }
}
```

`basePose.x/y/theta` is correctly updated in `step()`, but the `dhTransforms` field is ignored.

---

## Fix

Compute a proper 4×4 SE(2)-embedded-in-SE(3) transform from `(x, y, theta)`:

```ts
// src/simulation/robots/DifferentialDrive.ts
function pose2DToMat4(pose: Pose2D): Mat4 {
  const { x, y, theta } = pose
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  // Rotation around Y-axis (robot moves in the XZ plane in world space),
  // or Z-axis depending on your coordinate convention.
  // Using Y-up, robot forward = +Z:
  return [
     c, 0, s, x,
     0, 1, 0, 0,
    -s, 0, c, y,
     0, 0, 0, 1,
  ]
}

private buildState(pose: Pose2D, leftAngle: number, rightAngle: number): RobotState {
  return {
    // ...
    dhTransforms: [pose2DToMat4(pose)],
  }
}
```

Verify the axis convention against `DiffDriveRobot.tsx` (which sets `position.set(x, WHEEL_R, y)` and `rotation.y = -theta`) to ensure the matrix matches the visual transform.

---

## Prevention

When a `RobotState` field exists in the type but a robot has no meaningful value for it, either:
- Compute a correct value (as above), or
- Remove the field from the shared `RobotState` type and make it robot-specific.

Silently returning a sentinel (identity matrix, zero quaternion) for a field that has semantic meaning is misleading. Future consumers will read the value and assume it's real.

---

## Related Files

- [src/simulation/robots/DifferentialDrive.ts](../../src/simulation/robots/DifferentialDrive.ts) — `buildState()` line with `IDENTITY16`
- [src/simulation/types/RobotState.ts](../../src/simulation/types/RobotState.ts) — `dhTransforms` field in `RobotState`
- [src/rendering/robots/DifferentialDriveRobot.tsx](../../src/rendering/robots/DifferentialDriveRobot.tsx) — uses `basePose`, not `dhTransforms` (currently safe)
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — INC-3
