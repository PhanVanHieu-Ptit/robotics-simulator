# PERF-001 — `toThreeMatrix()` Allocates a New `Matrix4` Every Frame

**Status**: `OPEN`
**Severity**: High (GC pressure)
**Backlog**: T-006

---

## Problem

`FrankaArmMesh` allocates 7 new `THREE.Matrix4` objects on every render frame — one per joint. At 60 Hz this creates ~420 short-lived objects per second, causing frequent minor GC pauses that manifest as frame stutter.

---

## Root Cause

`toThreeMatrix()` calls `new THREE.Matrix4()` on every invocation:

```ts
// src/rendering/robots/FrankaArm.tsx
function toThreeMatrix(mat4: readonly number[]): THREE.Matrix4 {
  return new THREE.Matrix4().set(...)  // ← allocates on every call
}

// Called in JSX, once per joint, every render frame:
matrix={mat ? toThreeMatrix(mat) : undefined}
```

Because this is inside a React render, React also diffs the prop value against the previous frame's `Matrix4` instance — two different objects that are structurally equal, forcing Three.js to always consider the matrix "changed".

---

## Fix

Pre-allocate a stable array of `Matrix4` in a `ref` and mutate in-place using `useFrame`:

```ts
// src/rendering/robots/FrankaArm.tsx
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function FrankaArmMesh() {
  const groupRefs   = useRef<(THREE.Group | null)[]>([])
  const matrices    = useRef<THREE.Matrix4[]>(
    LINK_LENGTHS.map(() => new THREE.Matrix4())   // allocated once
  )

  useFrame(() => {
    const transforms = useRobotStore.getState().dhTransforms
    for (let i = 0; i < LINK_LENGTHS.length; i++) {
      const mat = transforms[i]
      const group = groupRefs.current[i]
      if (!mat || !group) continue
      // Mutate in-place — no allocation
      matrices.current[i]!.set(
        mat[0], mat[1], mat[2],  mat[3],
        mat[4], mat[5], mat[6],  mat[7],
        mat[8], mat[9], mat[10], mat[11],
        mat[12],mat[13],mat[14], mat[15],
      )
      group.matrix.copy(matrices.current[i]!)
      group.matrixWorldNeedsUpdate = true
    }
  })

  return (
    <group name="franka_panda">
      {LINK_LENGTHS.map((len, i) => (
        <group
          key={i}
          ref={(el) => { groupRefs.current[i] = el }}
          matrixAutoUpdate={false}
          // ← no matrix prop; updated imperatively above
        >
          <Joint color={i === LINK_LENGTHS.length - 1 ? '#ff8c42' : '#4a9eff'} />
          {len > 0 && <Link length={len} />}
        </group>
      ))}
    </group>
  )
}
```

This removes all 7 allocations per frame and also eliminates the React prop diff for matrix values.

---

## Prevention

Never allocate Three.js objects (Vector3, Quaternion, Matrix4, Euler) inside render functions or `useFrame` callbacks. Pre-allocate in `useRef` or at module scope and mutate in-place.

A lint rule or codemod to detect `new THREE.*` inside render/useFrame would catch regressions automatically.

---

## Related Files

- [src/rendering/robots/FrankaArm.tsx](../../src/rendering/robots/FrankaArm.tsx) — `toThreeMatrix()` and its call site
- [src/store/robotStore.ts](../../src/store/robotStore.ts) — `dhTransforms` data source
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — PERF-1
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-006
