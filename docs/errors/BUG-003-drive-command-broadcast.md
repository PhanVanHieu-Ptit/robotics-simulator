# BUG-003 — `DRIVE` Commands Broadcast to All Robots

**Status**: `OPEN`
**Severity**: Low (latent — no visible effect until a second mobile robot is added)
**Backlog**: T-011

---

## Problem

Every `DRIVE` command is dispatched to every robot in the world, regardless of which robot the user intends to control. Currently `FrankaArm.applyCommand()` rejects `DRIVE` silently (type guard on `cmd.type`), so there is no user-visible bug — but the fragility is structural.

**Latent symptom**: Add a second mobile robot (e.g., a Ridgeback base) and both robots will respond to WASD simultaneously, with no way to direct input to one independently.

---

## Root Cause

`DriveCommand` has no `robotId` field, so `InputSystem` cannot route it:

```ts
// src/simulation/types/Command.ts
export interface DriveCommand {
  type: 'DRIVE'
  linear: number
  angular: number
  // ← no robotId
}

// src/simulation/systems/InputSystem.ts
if (cmd.type === 'DRIVE') {
  for (const robot of world.robots.values()) {
    robot.applyCommand(cmd)   // hits every robot
  }
}
```

`FrankaArm` silently ignores `DRIVE` only because its type guard catches it:

```ts
// src/simulation/robots/FrankaArm.ts
applyCommand(cmd: Command): void {
  if (cmd.type !== 'SET_JOINT' || cmd.robotId !== this.cfg.id) return
  // DRIVE never reaches here — but this is a coincidence, not a contract
}
```

---

## Fix

**Option A** (preferred): Add `robotId` to `DriveCommand` and route by ID.

```ts
// src/simulation/types/Command.ts
export interface DriveCommand {
  type: 'DRIVE'
  robotId: string       // ← add this
  linear: number
  angular: number
}
```

```ts
// src/input/InputMapper.ts — pass target robot ID
export function mapInputToCommands(input: Readonly<RawInput>, robotId: string): Command[] {
  // ...
  return [{ type: 'DRIVE', robotId, linear, angular }]
}
```

```ts
// src/simulation/systems/InputSystem.ts — route by ID like other commands
} else if ('robotId' in cmd) {
  const robot = world.robots.get(cmd.robotId)
  robot?.applyCommand(cmd)
}
```

**Option B** (minimal): Filter by robot type in `InputSystem` — mobile robots handle `DRIVE`, manipulators don't. Weaker because it relies on an implicit convention.

---

## Prevention

All command types should carry a `robotId`. Treat targetless commands as a design smell. When adding a new command type, the first question should be: "which robot is this for?"

---

## Related Files

- [src/simulation/systems/InputSystem.ts](../../src/simulation/systems/InputSystem.ts) — broadcast loop
- [src/simulation/types/Command.ts](../../src/simulation/types/Command.ts) — `DriveCommand` missing `robotId`
- [src/input/InputMapper.ts](../../src/input/InputMapper.ts) — command construction site
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — BUG-3
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-011
