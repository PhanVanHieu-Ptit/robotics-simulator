# State Management

## Overview

Three Zustand stores with `subscribeWithSelector` middleware. No Redux, no Context API for simulation state.

```
simulationStore   — engine lifecycle: running/paused/speed/time
robotStore        — per-robot physics output: angles, poses, transforms, trajectories
sceneStore        — rendering preferences (persisted to localStorage)
```

All stores live in `src/store/`.

---

## Store Slices

### `simulationStore` (`src/store/simulationStore.ts`)

```ts
interface SimulationState {
  isRunning: boolean       // engine is stepping each frame
  isPaused: boolean        // engine is running but commands are gated
  speed: SpeedOption       // 0.25 | 0.5 | 1 | 2 | 4
  mode: SimMode            // 'manual' | 'auto' | 'replay' [INFERRED: only 'manual' used]
  simTime: number          // accumulated seconds of simulation
  frameTime: number        // last tick wall-clock duration (ms)
}
```

**Updated by:** `useSimulationFrame` via `onSnapshot` callback (60 Hz).
**Read by:** `Toolbar`, `PerformanceMonitor`, `useInputController`, `useSimulationFrame`.

---

### `robotStore` (`src/store/robotStore.ts`)

```ts
interface RobotState {
  jointAngles: number[]                        // Franka 7 joint angles (radians)
  dhTransforms: Mat4[]                         // Cumulative FK transforms (one per joint)
  endEffectorPose: Pose3D                      // EE position + quaternion
  basePose: Pose2D                             // DiffDrive base (x, y, theta)
  trajectories: Record<string, Pose3D[]>       // Path buffers (ring, max 2000)
  robotSnapshots: Record<string, RobotState>   // Raw WorldSnapshot.robots entries
}
```

**Updated by:** `useSimulationFrame` via `onSnapshot` (60 Hz).
**Read by:** `FrankaArmMesh`, `DiffDriveRobot`, `JointPanel`, `TrajectoryLine`, `CoordinateFrame`.

---

### `sceneStore` (`src/store/sceneStore.ts`)

```ts
interface SceneState {
  showGrid: boolean
  showCoordinateFrames: boolean
  showTrajectory: boolean
  showBoundingBoxes: boolean
  cameraPreset: 'perspective' | 'top' | 'front' | 'side'
  ikTarget: Pose3D | null
}
```

**Persisted:** `localStorage` key `'robotics-sim-scene'`.
**Updated by:** `ConfigPanel` (user toggles).
**Read by:** `Environment`, `CameraController`, `CoordinateFrames`, `TrajectoryLine`.

---

## Data Flow

```
SimulationEngine.tick()
  └─► onSnapshot(WorldSnapshot)                  [called 60 Hz]
        ├─► robotStore.setJointAngles()
        ├─► robotStore.setDhTransforms()
        ├─► robotStore.setEndEffectorPose()
        ├─► robotStore.setBasePose()
        ├─► robotStore.setTrajectories()
        ├─► simulationStore.setSimTime()
        └─► simulationStore.setFrameTime()

User Input (keyboard / UI)
  └─► useRobotCommands().dispatch(cmd)
        └─► getEngine()?.world.enqueueCommand(cmd)  [no store write]

UI Toggles (ConfigPanel)
  └─► sceneStore.set*()
        └─► R3F components re-render on next frame
```

---

## Subscription Patterns

### Correct — vanilla subscribe in RAF loops

```ts
// useInputController.ts, useSimulationFrame.ts
const unsub = useSimulationStore.subscribe(
  s => s.isRunning && !s.isPaused,
  active => { activeRef.current = active }
)
```

This avoids triggering React re-renders inside `useFrame`.

### Correct — selector hook in React components

```ts
const jointAngles = useRobotStore(s => s.jointAngles)
const { showGrid } = useSceneStore()
```

### Wrong — never do this

```ts
// In useFrame callback or simulation tick:
useRobotStore.getState().setJointAngles(...)  // OK only if called from onSnapshot, not from RAF directly
```

---

## Selectors (`src/store/selectors/robotSelectors.ts`)

| Selector | Returns | Used By |
|----------|---------|---------|
| `useJointLimitWarnings()` | `boolean[]` (7 flags) | `JointPanel` — orange color when near limit |
| `useEEPositionLabel()` | `string` | `JointPanel` — formatted XYZ string |

Threshold for warning: within `0.05 rad` of joint limit.

---

## Pitfalls

| Issue | Consequence | Fix |
|-------|-------------|-----|
| `sceneStore` schema changes without migration | Stale persisted data silently applied | Add `version` + `migrate` to Zustand `persist` config |
| Subscribing to fast-changing fields (simTime, frameTime) in components | Re-renders every tick (60 Hz) | Use `subscribeWithSelector` with equality check or debounce |
| Using `useSimulationStore()` in `useFrame` | Can cascade update depth errors | Mirror to `ref` via vanilla `subscribe` |
