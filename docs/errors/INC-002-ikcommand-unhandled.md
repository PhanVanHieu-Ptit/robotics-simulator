# INC-002 — `IKCommand` in Type Union But No Dispatch Branch

**Status**: `OPEN`
**Severity**: Medium
**Backlog**: T-001, T-002

---

## Problem

`IKCommand` appears in the `Command` discriminated union, giving the impression that IK targets can be dispatched. In reality, no system handles this command type. Commands dispatched with `type: 'SET_IK_TARGET'` are silently consumed by the `'robotId' in cmd` branch in `InputSystem` and passed to the robot, which also ignores them. The user sees no error, no movement, and no feedback.

**Symptom**: Dispatching an `IKCommand` from the UI or programmatically produces no observable effect and no warning.

---

## Root Cause

```ts
// src/simulation/types/Command.ts
export type Command =
  | DriveCommand
  | JointCommand      // SET_JOINT
  | ResetCommand
  | IKCommand         // SET_IK_TARGET ← in the union

export interface IKCommand {
  type: 'SET_IK_TARGET'
  robotId: string
  target: Pose3D
}
```

```ts
// src/simulation/systems/InputSystem.ts
tick(world, _dt) {
  for (const cmd of commands) {
    if (cmd.type === 'RESET') { ... }
    if (cmd.type === 'DRIVE') { ... }
    else if ('robotId' in cmd) {
      const robot = world.robots.get(cmd.robotId)
      robot?.applyCommand(cmd)   // FrankaArm ignores it; no IK handler
    }
    // No 'SET_IK_TARGET' branch
  }
}
```

```ts
// src/simulation/kinematics/InverseKinematics.ts
export function solveIK(...): IKResult {
  throw new Error('IK solver not yet implemented')
}
```

---

## Fix

**Short-term**: Remove `IKCommand` from the `Command` union until `solveIK()` is implemented. This makes the type system accurate — the UI cannot even construct a command that has no handler. Re-add it when T-001 is done.

```ts
// src/simulation/types/Command.ts — temporary
export type Command =
  | DriveCommand
  | JointCommand
  | ResetCommand
  // IKCommand removed until IK is implemented (T-001)
```

**Long-term** (T-001 + T-002): Implement `solveIK()` and add a dispatch branch:

```ts
// src/simulation/systems/InputSystem.ts
if (cmd.type === 'SET_IK_TARGET') {
  const robot = world.robots.get(cmd.robotId)
  if (robot instanceof FrankaArm) {
    const result = solveIK(robot.config.dhParams, robot.currentAngles, cmd.target)
    if (result.converged) {
      result.jointAngles.forEach((angle, i) => {
        world.enqueueCommand({ type: 'SET_JOINT', robotId: cmd.robotId, index: i, angle })
      })
    }
  }
}
```

---

## Prevention

The `Command` union is a contract between UI and simulation. Only add a command type to the union when there is a handler that processes it. A command type with no handler is equivalent to dead code — it compiles, it dispatches, and it disappears.

---

## Related Files

- [src/simulation/types/Command.ts](../../src/simulation/types/Command.ts) — `IKCommand` definition
- [src/simulation/systems/InputSystem.ts](../../src/simulation/systems/InputSystem.ts) — missing dispatch branch
- [src/simulation/kinematics/InverseKinematics.ts](../../src/simulation/kinematics/InverseKinematics.ts) — stub `solveIK()`
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — INC-2
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-001, T-002
