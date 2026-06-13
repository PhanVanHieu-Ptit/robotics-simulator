# BUG-001 — End-Effector Quaternion Always `[0, 0, 0, 1]`

**Status**: `OPEN`
**Severity**: Medium
**Backlog**: T-003

---

## Problem

`FrankaArm.state.endEffectorPose.quaternion` is always the identity quaternion `[0, 0, 0, 1]` regardless of joint configuration. Any consumer that reads orientation from the robot state — IK target matching, end-effector frame visualization in the sidebar, telemetry — receives wrong data silently.

**Symptom**: The EE orientation panel always shows `rx=0, ry=0, rz=0`. An IK solver given a target with non-trivial orientation will compute against a phantom identity pose and produce incorrect joint angles.

---

## Root Cause

`FrankaArm.buildState()` extracts position from the final DH transform correctly, but hardcodes the quaternion:

```ts
// src/simulation/robots/FrankaArm.ts — line 36
endEffectorPose: { position: pos, quaternion: [0, 0, 0, 1] },
```

`computeFK()` returns the full 4×4 rotation matrix for each frame, but the 3×3 rotation block of the last transform is never read. There is no `mat3ToQuat()` utility in the codebase.

---

## Fix

Extract the rotation submatrix from the last DH transform and convert it to a quaternion.

```ts
// src/simulation/kinematics/ForwardKinematics.ts — add this utility
export function mat4ToQuat(m: Mat4): readonly [number, number, number, number] {
  // Shepperd method — numerically stable for any rotation
  const trace = m[0] + m[5] + m[10]
  let qx, qy, qz, qw: number

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1)
    qw = 0.25 / s
    qx = (m[9] - m[6]) * s
    qy = (m[2] - m[8]) * s
    qz = (m[4] - m[1]) * s
  } else if (m[0] > m[5] && m[0] > m[10]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[5] - m[10])
    qw = (m[9] - m[6]) / s
    qx = 0.25 * s
    qy = (m[1] + m[4]) / s
    qz = (m[2] + m[8]) / s
  } else if (m[5] > m[10]) {
    const s = 2 * Math.sqrt(1 + m[5] - m[0] - m[10])
    qw = (m[2] - m[8]) / s
    qx = (m[1] + m[4]) / s
    qy = 0.25 * s
    qz = (m[6] + m[9]) / s
  } else {
    const s = 2 * Math.sqrt(1 + m[10] - m[0] - m[5])
    qw = (m[4] - m[1]) / s
    qx = (m[2] + m[8]) / s
    qy = (m[6] + m[9]) / s
    qz = 0.25 * s
  }
  return [qx, qy, qz, qw]
}
```

Then replace the hardcoded value in `FrankaArm.buildState()`:

```ts
// src/simulation/robots/FrankaArm.ts
import { computeFK, mat4Position, mat4ToQuat } from '../kinematics/ForwardKinematics'

private buildState(): RobotState {
  const transforms = computeFK(this.cfg.dhParams, this._angles)
  const eeTransform = transforms[transforms.length - 1]
  const pos  = eeTransform ? mat4Position(eeTransform) : ([0, 0, 0] as const)
  const quat = eeTransform ? mat4ToQuat(eeTransform)   : ([0, 0, 0, 1] as const)

  return {
    // ...
    endEffectorPose: { position: pos, quaternion: quat },
    // ...
  }
}
```

---

## Prevention

- Add a unit test that sets a known joint angle (e.g., joint 0 = π/2) and asserts the resulting quaternion is non-identity.
- The `computeFK` tests (T-004) should include orientation assertions using known Franka DH test vectors.

---

## Related Files

- [src/simulation/robots/FrankaArm.ts](../../src/simulation/robots/FrankaArm.ts) — line 36, hardcoded quaternion
- [src/simulation/kinematics/ForwardKinematics.ts](../../src/simulation/kinematics/ForwardKinematics.ts) — needs `mat4ToQuat()`
- [src/simulation/types/RobotState.ts](../../src/simulation/types/RobotState.ts) — `Pose3D.quaternion` type
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — BUG-1
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-003
