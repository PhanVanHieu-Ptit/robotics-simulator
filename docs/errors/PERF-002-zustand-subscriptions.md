# PERF-002 — Multiple Zustand Subscriptions in `DiffDriveRobot`

**Status**: `RESOLVED` (fixed in `feat: differential-drive-simulation`, commit `0914caf`)
**Severity**: Medium

---

## Problem (Historical)

An earlier version of `DifferentialDriveRobot` called `useRobotStore()` multiple times inside the component body, creating three independent Zustand subscriptions. Each store update (60×/sec) triggered three separate re-render checks, causing redundant React reconciliation every physics tick.

---

## Root Cause

```ts
// BEFORE (pattern that caused the issue)
const basePose    = useRobotStore((s) => s.basePose)
const leftAngle   = useRobotStore((s) => s.robotSnapshots['diff_drive']?.jointStates[0]?.angle ?? 0)
const rightAngle  = useRobotStore((s) => s.robotSnapshots['diff_drive']?.jointStates[1]?.angle ?? 0)
// → 3 subscribers, 3 render triggers per tick
```

---

## How It Was Fixed

`DifferentialDriveRobot` was rewritten to read state imperatively inside `useFrame` via `useRobotStore.getState()` and apply updates directly to `THREE.Object3D` refs. This eliminates all Zustand subscriptions from the component entirely — zero React re-renders during simulation.

```ts
// AFTER — current code in src/rendering/robots/DifferentialDriveRobot.tsx
useFrame(() => {
  const store = useRobotStore.getState()            // direct read, no subscription
  const { x, y, theta } = store.basePose
  if (groupRef.current) {
    groupRef.current.position.set(x, WHEEL_R, y)
    groupRef.current.rotation.y = -theta
  }
  // ...
})
```

---

## Prevention

In R3F components: never subscribe to stores that update at 60 Hz. Read them imperatively with `.getState()` inside `useFrame`, and apply results directly to Three.js object refs. Only subscribe via hooks (`useStore(selector)`) for data that drives JSX structure changes (e.g., robot count, config values).

---

## Related Files

- [src/rendering/robots/DifferentialDriveRobot.tsx](../../src/rendering/robots/DifferentialDriveRobot.tsx) — current implementation (resolved)
- [src/store/robotStore.ts](../../src/store/robotStore.ts) — Zustand store
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — PERF-2
