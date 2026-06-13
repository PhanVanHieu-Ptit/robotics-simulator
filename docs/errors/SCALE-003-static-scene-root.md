# SCALE-003 — `SceneRoot` Hard-Codes All Robot Meshes

**Status**: `OPEN`
**Severity**: Low
**Backlog**: T-018

---

## Problem

Adding a third robot to the simulation requires manually editing `SceneRoot.tsx` to import and render its mesh component. There is no mechanism to declare robots in config and have the scene render them automatically.

---

## Root Cause

```tsx
// src/rendering/scene/SceneRoot.tsx
import { DiffDriveRobot }   from '../robots/DifferentialDriveRobot'
import { FrankaArmMesh }    from '../robots/FrankaArm'
import { ManipulatorRenderer } from '@ui/panels/ManipulatorControls'

export function SceneRoot() {
  return (
    <Canvas>
      {/* Static list — must be edited for every new robot */}
      <DiffDriveRobot />
      <FrankaArmMesh />
      <ManipulatorRenderer />
      {/* ... */}
    </Canvas>
  )
}
```

Every robot is a static import; the scene has no concept of a "robot registry."

---

## Fix

Maintain a registry mapping robot ID to its React mesh component, and render dynamically:

```ts
// src/rendering/robots/registry.ts
import type { ComponentType } from 'react'
import { FRANKA_ID, DIFF_DRIVE_ID } from '@config/robots'
import { FrankaArmMesh }   from './FrankaArm'
import { DiffDriveRobot }  from './DifferentialDriveRobot'

export const ROBOT_MESH_REGISTRY: Record<string, ComponentType> = {
  [FRANKA_ID]:    FrankaArmMesh,
  [DIFF_DRIVE_ID]: DiffDriveRobot,
}
```

```tsx
// src/rendering/scene/SceneRoot.tsx
import { ROBOT_MESH_REGISTRY } from '../robots/registry'
import { useRobotStore } from '@store/robotStore'

function RobotMeshes() {
  const robotIds = useRobotStore((s) => Object.keys(s.robotSnapshots))
  return (
    <>
      {robotIds.map((id) => {
        const Mesh = ROBOT_MESH_REGISTRY[id]
        return Mesh ? <Mesh key={id} /> : null
      })}
    </>
  )
}
```

Adding a new robot then only requires: adding the robot to `SimulationWorld` and registering its mesh component in `registry.ts`.

---

## Prevention

Scene composition should be data-driven, not code-driven. Static imports of domain objects (robots, obstacles) inside scene files are a sign that configuration concerns have leaked into rendering concerns.

---

## Related Files

- [src/rendering/scene/SceneRoot.tsx](../../src/rendering/scene/SceneRoot.tsx) — static mesh imports
- [src/rendering/robots/](../../src/rendering/robots/) — individual robot mesh components
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — SCALE-3
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-018
