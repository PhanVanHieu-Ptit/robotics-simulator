# KNOWN_ISSUES.md

Confirmed bugs, anti-patterns, and scalability risks found by static analysis. Each entry includes the file location, severity, and a concrete fix.

---

## Bugs

### ~~BUG-1: End-effector quaternion is always identity~~ FIXED

`mat3ToQuat()` (Shepperd's method) is now exported from `ForwardKinematics.ts` and wired into `FrankaArm.buildState()`. The quaternion is extracted from the 3×3 rotation block of the final DH transform each tick.

---

### ~~BUG-2: `PerformanceMonitor` FPS is computed from simulation frame time, not wall-clock FPS~~ FIXED

`wallDeltaSec` is now propagated through `WorldSnapshot` → `metricsStore` → `PerformanceMonitor`. FPS is computed as `1 / wallDeltaSec` (real frame rate from R3F's rAF delta). `frameTime` remains the physics tick work time and is shown separately as the "FRAME" metric.

---

### ~~BUG-3: `InputSystem` broadcasts `DRIVE` commands to all robots~~ FIXED

`DriveCommand` now has an optional `robotId?: string` field. When set, `InputSystem` routes the command only to that robot. When omitted (keyboard control), it broadcasts to all robots — preserving existing behavior. 3 new integration tests verify targeted vs. broadcast dispatch.

---

### ~~BUG-4: `InputMapper` speed constants diverge from robot config limits~~ FIXED

`InputMapper.ts` now imports `diffDriveConfig` and reads `maxLinearVel` / `maxAngularVel` directly. Tests updated to match. Keyboard input now reaches the configured maximum speed (2.0 m/s, 3.14 rad/s).

---

## Performance Risks

### ~~PERF-1: `toThreeMatrix()` allocates a new `THREE.Matrix4` every render frame~~ FIXED

`FrankaArmMesh` now uses `useFrame` + `group.matrix.set(...)` (direct mutation). The `useRobotStore` React subscription is removed entirely — the component produces zero React re-renders and zero `Matrix4` allocations per frame.

---

### ~~PERF-2: `DiffDriveRobot` has 3 separate Zustand subscriptions~~ FIXED

`DifferentialDriveRobot` already uses `useFrame` + `useRobotStore.getState()` — no React subscription hook calls, zero re-renders per tick.

---

### PERF-3: `FrankaArm.buildState()` allocates new arrays on every physics tick

**File**: [src/simulation/robots/FrankaArm.ts](src/simulation/robots/FrankaArm.ts) — `step()`
**Severity**: Medium

`buildState()` → `computeFK()` allocates a fresh `Mat4[]` and `RobotState` on every call at 60 Hz. At 7 joints this is ~8 object allocations per tick.

**Fix**: Pre-allocate the transforms array and mutate in-place. Requires changing `Mat4` from `readonly` tuple to a mutable typed array, or using a pool.

---

### ~~PERF-4: `TrajectorySystem` uses `splice()` for ring-buffer trimming~~ FIXED

`TrajectorySystem` now uses `PositionRingBuffer` — a fixed-size circular buffer with O(1) push. No array shifting at cap. `writeTo(Float32Array)` linearises in one pass for renderers.

---

### ~~PERF-5: `PerformanceMonitor` re-renders every physics tick~~ FIXED

`PerformanceMonitor` subscribes to `metricsStore` (a plain JS pub-sub, not Zustand) and writes directly to DOM `ref`s. Zero React re-renders while the simulation runs.

---

### PERF-6: Dual RAF loops (simulation frame + input controller)

**File**: [src/rendering/hooks/useSimulationFrame.ts](src/rendering/hooks/useSimulationFrame.ts), [src/input/hooks/useInputController.ts](src/input/hooks/useInputController.ts)
**Severity**: Low

Two independent `requestAnimationFrame` loops run simultaneously. The input loop can fire commands at a different cadence than the simulation tick, leading to command accumulation in the queue between ticks.

**Fix**: Drive input sampling from inside `useSimulationFrame` (read keyboard state before calling `engine.tick()`), eliminating the second RAF loop.

---

## Scalability Risks

### SCALE-1: Engine singleton blocks multi-world and testing

**File**: [src/hooks/useSimulation.ts](src/hooks/useSimulation.ts)
**Severity**: Medium

`let _engine: SimulationEngine | null` is a module-level singleton. This means:
- Only one simulation can run at a time
- Tests that call `createEngine()` implicitly share state unless `_engine` is manually reset
- No support for multiple scenes (e.g., a comparison view)

**Fix**: Move engine creation into React context or accept the constraint explicitly in `ARCHITECTURE.md`.

---

### SCALE-2: Hard-coded robot IDs in store and rendering

**Files**: [src/store/robotStore.ts](src/store/robotStore.ts) L30-31, [src/rendering/robots/DifferentialDriveRobot.tsx](src/rendering/robots/DifferentialDriveRobot.tsx) L5
**Severity**: Medium

`snapshot.robots['franka_panda']` and `snapshot.robots['diff_drive']` are string literals. Adding a third robot requires hunting and updating multiple files.

**Fix**: Export robot ID constants from each JSON config and import them; or make `robotStore` generic over robot IDs discovered from the world snapshot.

---

### SCALE-3: `SceneRoot` hard-codes all robot meshes

**File**: [src/rendering/scene/SceneRoot.tsx](src/rendering/scene/SceneRoot.tsx)
**Severity**: Low

`<DiffDriveRobot />` and `<FrankaArmMesh />` are imported and placed statically. Adding a third robot requires editing `SceneRoot`.

**Fix**: Maintain a registry mapping `robotId → MeshComponent` and render dynamically.

---

### ~~SCALE-4: `EventBus` is defined but completely disconnected~~ FIXED

`SimulationEngine` now accepts an optional `bus?: EventBus<SimulationEvents>` parameter and emits `tick` and `reset` events. A module-level `_bus` is created in `useSimulation.ts` and injected at engine creation. Consumers call `getEventBus()` to subscribe. `collision` and `trajectoryUpdated` events remain unimplemented until those systems are built.

---

## Inconsistencies

### INC-1: Visual link lengths are hardcoded approximations, not from DH params

**File**: [src/rendering/robots/FrankaArm.tsx](src/rendering/robots/FrankaArm.tsx) — `LINK_LENGTHS`

```ts
const LINK_LENGTHS = [0.333, 0.316, 0.384, 0.0, 0.107, 0.088, 0.107]
```

These are manually entered and partially match the DH `d` parameters in `franka_panda.json`. They will drift if DH params are updated.

**Fix**: Derive link lengths from `frankaConfig.dhParams[i].d` (or `a`) at startup.

---

### ~~INC-2: `IKCommand` type exists but is never handled~~ FIXED

`FrankaArm.applyCommand()` now handles `SET_IK_TARGET` by storing the target in `_ikTarget`. `step()` calls `solveIK()` when `_ikTarget !== null`, then clears it so IK runs at most once per command. `InputSystem` routes it via the existing `'robotId' in cmd` branch — no changes needed there.

---

### ~~INC-3: `DifferentialDrive.dhTransforms` is always the identity matrix~~ FIXED

`buildState()` now computes a proper row-major 4×4 world-space transform from `(x, y, theta)` matching the Three.js Y-up, XZ-plane convention. Three tests added to `DifferentialDrive.test.ts` verify identity at origin and correct encoding of translation and rotation.
