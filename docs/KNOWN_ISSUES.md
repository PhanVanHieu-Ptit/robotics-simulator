# KNOWN_ISSUES.md

Confirmed bugs, anti-patterns, and scalability risks found by static analysis. Each entry includes the file location, severity, and a concrete fix.

---

## Bugs

### BUG-1: End-effector quaternion is always identity

**File**: [src/simulation/robots/FrankaArm.ts](src/simulation/robots/FrankaArm.ts) — `buildState()`
**Severity**: Medium

`endEffectorPose.quaternion` is hardcoded to `[0, 0, 0, 1]`. FK correctly computes the full 4×4 rotation matrix for each frame, but the orientation is never extracted from it. IK targets that use orientation will fail silently.

**Fix**: Extract the 3×3 rotation block from the final DH transform and convert it to a quaternion. A standard `mat3ToQuat()` utility is needed.

---

### ~~BUG-2: `PerformanceMonitor` FPS is computed from simulation frame time, not wall-clock FPS~~ FIXED

`wallDeltaSec` is now propagated through `WorldSnapshot` → `metricsStore` → `PerformanceMonitor`. FPS is computed as `1 / wallDeltaSec` (real frame rate from R3F's rAF delta). `frameTime` remains the physics tick work time and is shown separately as the "FRAME" metric.

---

### BUG-3: `InputSystem` broadcasts `DRIVE` commands to all robots

**File**: [src/simulation/systems/InputSystem.ts](src/simulation/systems/InputSystem.ts) — `tick()`
**Severity**: Low (no second robot responds, but will break when one is added)

`DRIVE` commands have no `robotId`. `InputSystem` sends them to every robot in the world. `FrankaArm.applyCommand()` silently ignores them (type guard), but this is fragile. If a future robot accepts `DRIVE`, it will be controlled unintentionally.

**Fix**: Add `robotId` to `DriveCommand` or filter by robot type in `InputSystem`.

---

### ~~BUG-4: `InputMapper` speed constants diverge from robot config limits~~ FIXED

`InputMapper.ts` now imports `diffDriveConfig` and reads `maxLinearVel` / `maxAngularVel` directly. Tests updated to match. Keyboard input now reaches the configured maximum speed (2.0 m/s, 3.14 rad/s).

---

## Performance Risks

### PERF-1: `toThreeMatrix()` allocates a new `THREE.Matrix4` every render frame

**File**: [src/rendering/robots/FrankaArm.tsx](src/rendering/robots/FrankaArm.tsx)
**Severity**: High (7 allocations per frame at 60 Hz = 420 objects/sec → GC pressure)

```ts
// Current — allocates on every render
matrix={mat ? toThreeMatrix(mat) : undefined}
```

**Fix**: Use `useRef` to hold a stable `Matrix4` array, then update in a `useEffect` or directly mutate via `group.matrix.set(...)` in `useFrame`.

---

### PERF-2: `DiffDriveRobot` has 3 separate Zustand subscriptions

**File**: [src/rendering/robots/DifferentialDriveRobot.tsx](src/rendering/robots/DifferentialDriveRobot.tsx)
**Severity**: Medium

Three `useRobotStore()` calls → three separate re-render triggers per tick.

**Fix**: Combine into one selector that returns a single stable object:
```ts
const { basePose, leftAngle, rightAngle } = useRobotStore(
  (s) => ({
    basePose:   s.basePose,
    leftAngle:  s.robotSnapshots['diff_drive']?.jointStates[0]?.angle ?? 0,
    rightAngle: s.robotSnapshots['diff_drive']?.jointStates[1]?.angle ?? 0,
  }),
  shallow,
)
```

---

### PERF-3: `FrankaArm.buildState()` allocates new arrays on every physics tick

**File**: [src/simulation/robots/FrankaArm.ts](src/simulation/robots/FrankaArm.ts) — `step()`
**Severity**: Medium

`buildState()` → `computeFK()` allocates a fresh `Mat4[]` and `RobotState` on every call at 60 Hz. At 7 joints this is ~8 object allocations per tick.

**Fix**: Pre-allocate the transforms array and mutate in-place. Requires changing `Mat4` from `readonly` tuple to a mutable typed array, or using a pool.

---

### PERF-4: `TrajectorySystem` uses `splice()` for ring-buffer trimming

**File**: [src/simulation/systems/TrajectorySystem.ts](src/simulation/systems/TrajectorySystem.ts)
**Severity**: Medium (O(n) shift at `maxTrajectoryLength = 2000`)

```ts
robot.trajectoryBuffer.splice(0, robot.trajectoryBuffer.length - SimulationConfig.maxTrajectoryLength)
```

At cap, this shifts 2000 elements every tick it fires.

**Fix**: Replace `trajectoryBuffer: Pose3D[]` with a fixed-size ring buffer class (head/tail index).

---

### PERF-5: `PerformanceMonitor` re-renders every physics tick

**File**: [src/ui/panels/PerformanceMonitor.tsx](src/ui/panels/PerformanceMonitor.tsx)
**Severity**: Low

Subscribes to `simTime` (updated 60×/sec) and `frameTime`. This is a React component so it triggers a full DOM reconciliation every tick.

**Fix**: Debounce the store update to ~10 Hz for display purposes, or use a `ref` + direct DOM mutation for the metric values.

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

### SCALE-4: `EventBus` is defined but completely disconnected

**File**: [src/simulation/core/EventBus.ts](src/simulation/core/EventBus.ts)
**Severity**: Low (current) / High (future)

`SimulationEvents` defines `tick`, `collision`, `trajectoryUpdated`, and `reset` but the `EventBus` class is never instantiated. `SimulationEngine` does not hold or emit to any bus. Collision detection and trajectory events have no emission path.

**Fix**: Inject `EventBus<SimulationEvents>` into `SimulationEngine` constructor and emit in `tick()` and on system events.

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

### INC-2: `IKCommand` type exists but is never handled

**File**: [src/simulation/types/Command.ts](src/simulation/types/Command.ts), [src/simulation/systems/InputSystem.ts](src/simulation/systems/InputSystem.ts)

`IKCommand` is in the `Command` union. `InputSystem.tick()` has no branch for `'SET_IK_TARGET'`. It falls through silently (the `'robotId' in cmd` branch catches it but passes to a robot that ignores it).

**Fix**: Either remove `IKCommand` from the union until IK is implemented, or add an explicit handler that invokes the (future) IK system.

---

### INC-3: `DifferentialDrive.dhTransforms` is always the identity matrix

**File**: [src/simulation/robots/DifferentialDrive.ts](src/simulation/robots/DifferentialDrive.ts) — `buildState()`

`dhTransforms: [IDENTITY16]` is returned regardless of base pose. The base pose is correctly tracked in `basePose: Pose2D`, but the transform representation is never updated. This is misleading for any consumer that expects `dhTransforms[0]` to be the world-space pose.

**Fix**: Compute a proper 4×4 transform from `(x, y, theta)` and place it in `dhTransforms[0]`.
