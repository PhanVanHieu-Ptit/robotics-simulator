# BUG-004 — Keyboard Speed Constants Diverge from Robot Config

**Status**: `OPEN`
**Severity**: Low
**Backlog**: T-012

---

## Problem

Keyboard-driven commands never reach the robot's configured maximum speed. The user can observe that the robot drives more slowly than expected when comparing UI velocity sliders to keyboard control.

---

## Root Cause

`InputMapper` hardcodes speed constants that are lower than the values in the robot config:

```ts
// src/input/InputMapper.ts
const LINEAR_SPEED  = 1.5  // m/s
const ANGULAR_SPEED = 2.0  // rad/s
```

```json
// src/config/robots/differential_drive.json
{
  "maxLinearVel":  2.0,
  "maxAngularVel": 3.14
}
```

The keyboard can never produce a command faster than `1.5 m/s` / `2.0 rad/s`, even though the robot is configured to accept up to `2.0 m/s` / `3.14 rad/s`. The two values are maintained independently and will drift further over time.

---

## Fix

Import the robot config and derive speed constants from it:

```ts
// src/input/InputMapper.ts
import diffDriveConfig from '@config/robots/differential_drive.json'

// No local constants — read from config
export function mapInputToCommands(input: Readonly<RawInput>): Command[] {
  const linear =
    (input.forward  ?  diffDriveConfig.maxLinearVel  : 0) -
    (input.backward ?  diffDriveConfig.maxLinearVel  : 0)

  const angular =
    (input.left  ? diffDriveConfig.maxAngularVel : 0) -
    (input.right ? diffDriveConfig.maxAngularVel : 0)

  if (linear === 0 && angular === 0) return []
  return [{ type: 'DRIVE', linear, angular }]
}
```

If per-robot speed scaling is desired later (e.g., "turbo" key = 50% speed), apply a multiplier to `maxLinearVel` rather than a separate constant.

---

## Prevention

Robot behaviour constants must have a single source of truth in the JSON config. `InputMapper` is a translation layer, not a specification. Any magic number in `InputMapper` that mirrors a config field is a maintenance hazard.

---

## Related Files

- [src/input/InputMapper.ts](../../src/input/InputMapper.ts) — `LINEAR_SPEED`, `ANGULAR_SPEED` constants
- [src/config/robots/differential_drive.json](../../src/config/robots/differential_drive.json) — authoritative limits
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — BUG-4
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-012
