# SCALE-002 — Robot IDs Are String Literals Scattered Across Files

**Status**: `OPEN`
**Severity**: Medium
**Backlog**: T-011 (partial overlap)

---

## Problem

`'franka_panda'` and `'diff_drive'` are repeated as string literals in at least four files. Renaming a robot or adding a third robot requires a grep-and-replace across the codebase, with no compiler enforcement to catch missed sites.

---

## Root Cause

```ts
// src/store/robotStore.ts
const franka = snapshot.robots['franka_panda']   // literal
const diff   = snapshot.robots['diff_drive']     // literal

// src/rendering/robots/DifferentialDriveRobot.tsx
const snap = store.robotSnapshots['diff_drive']  // literal

// src/rendering/overlays/Trail.tsx (via prop)
<Trail robotId="franka_panda" />

// src/hooks/useSimulation.ts (config-driven but ID comes from JSON at runtime)
new FrankaArm({ id: frankaConfig.id, ... })
```

The JSON configs are the authoritative source of the IDs (`franka_panda.json → "id": "franka_panda"`), but nothing statically enforces that the string literals used in TypeScript match.

---

## Fix

Export robot ID constants from the JSON configs (or a dedicated constants file) and import them at every use site:

```ts
// src/config/robots/index.ts
export const FRANKA_ID   = 'franka_panda' as const
export const DIFF_DRIVE_ID = 'diff_drive' as const
```

```ts
// src/store/robotStore.ts
import { FRANKA_ID, DIFF_DRIVE_ID } from '@config/robots'

const franka = snapshot.robots[FRANKA_ID]
const diff   = snapshot.robots[DIFF_DRIVE_ID]
```

TypeScript will then catch any missing import when a new robot is added, rather than silently returning `undefined` at runtime.

A more robust approach uses the JSON config `id` field directly with a typed `satisfies` check:

```ts
import frankaConfig from '@config/robots/franka_panda.json'
export const FRANKA_ID = frankaConfig.id satisfies string
```

---

## Prevention

Robot identifiers are configuration — they belong in the config files, not scattered as literals. Any string that must match across multiple files is a constant, and constants should have one declaration site.

---

## Related Files

- [src/config/robots/franka_panda.json](../../src/config/robots/franka_panda.json) — `"id": "franka_panda"`
- [src/config/robots/differential_drive.json](../../src/config/robots/differential_drive.json) — `"id": "diff_drive"`
- [src/store/robotStore.ts](../../src/store/robotStore.ts) — string literal uses
- [src/rendering/robots/DifferentialDriveRobot.tsx](../../src/rendering/robots/DifferentialDriveRobot.tsx) — string literal use
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — SCALE-2
