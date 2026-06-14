# Task Backlog

> Prioritized work items for AI coding agents. Update when tasks are completed or discovered.

## Priority Legend

| P | Meaning |
|---|---------|
| P0 | Blocks other work |
| P1 | High-value, bounded scope |
| P2 | Medium-value, some complexity |
| P3 | Low-value or speculative |

---

## P0 — Blockers

_No active blockers._ All P0 items completed on branch `update-frank-arm-mesh`.

---

## P1 — High Value

_No active P1 items._

---

## P2 — Medium Value

| ID | Task | Key Files | Notes |
|----|------|-----------|-------|
| T-010 | Derive visual link lengths from DH params | `src/rendering/robots/FrankaArm.tsx` (LINK_LENGTHS const) | INC-1: hardcoded values; low priority now GLB is primary renderer |
| T-016 | Implement `CollisionSystem` (BVH broadphase) | `src/simulation/systems/CollisionSystem.ts`, `src/simulation/world/Obstacle.ts` | Consider `@react-three/rapier` for physics |

---

## P3 — Low Priority / Speculative

| ID | Task | Key Files | Notes |
|----|------|-----------|-------|
| T-017 | Implement `PathPlannerSystem` (RRT/PRM) | `src/simulation/systems/PathPlannerSystem.ts`, `src/workers/planner.worker.ts` | Worker thread via Comlink pattern already documented |
| T-018 | Support dynamic robot spawning | `src/rendering/scene/SceneRoot.tsx` | SCALE-3: robots hard-coded in scene |
| T-019 | Allow multi-world testing (break engine singleton) | `src/simulation/core/SimulationEngine.ts`, `src/hooks/useSimulation.ts` | SCALE-1: module singleton blocks isolation |

---

## Completed

| ID | Task | Completed | Reference |
|----|------|-----------|-----------|
| T-001 | Implement IK solver (DLS Jacobian pseudo-inverse) | 2026-06-14 | branch update-frank-arm-mesh — `InverseKinematics.ts`; 8 unit tests; converges to ≤1 mm for reachable targets |
| T-002 | Wire `IKCommand` into `InputSystem` | 2026-06-14 | branch update-frank-arm-mesh — `FrankaArm.applyCommand()` stores target; `step()` invokes `solveIK()` then clears it |
| T-003 | Extract end-effector quaternion from final FK transform | 2026-06-13 | branch fix-control — `mat3ToQuat()` wired in `FrankaArm.buildState()` |
| T-004 | Write unit tests for FK computation | 2026-06-13 | branch fix-control — `ForwardKinematics.test.ts` (28 tests) |
| T-005 | Write unit tests for DiffDrive kinematics | 2026-06-13 | branch fix-control — `DifferentialDrive.test.ts` (23 tests) |
| T-006 | Fix `FrankaArmMesh` matrix allocation (PERF-1) | 2026-06-13 | `FrankaArm.tsx` — `useFrame` + direct `group.matrix.set()`; zero allocs/frame, zero React re-renders |
| T-007 | Fix FPS metric to use wall-clock, not tick time | 2026-06-13 | `WorldSnapshot.wallDeltaSec` propagated to `metricsStore`; FPS = `1/wallDeltaSec` |
| T-008 | Replace `TrajectorySystem` splice with ring buffer (PERF-4) | 2026-06-13 | `TrajectorySystem.ts` — `PositionRingBuffer` class; O(1) push, no array shifting |
| T-011 | Add `robotId` to `DriveCommand` for targeted dispatch | 2026-06-14 | branch update-frank-arm-mesh — `DriveCommand.robotId?` optional; `InputSystem` routes targeted vs broadcast; 3 new tests |
| T-012 | Read speeds from robot config in `InputMapper` | 2026-06-13 | `InputMapper.ts` imports `diffDriveConfig`; tests updated to match |
| T-013 | Remove React subscriptions from `DiffDriveRobot` (PERF-2) | 2026-06-13 | `DifferentialDriveRobot.tsx` already uses `useFrame` + `getState()` — zero re-renders |
| T-014 | Wire `EventBus` into `SimulationEngine` | 2026-06-14 | branch update-frank-arm-mesh — `SimulationEngine` accepts optional `bus`; emits `tick` + `reset`; `getEventBus()` exported from `useSimulation.ts` |
| T-015 | Add schema validation for robot JSON configs | 2026-06-14 | `src/config/validateRobotConfig.ts` — `validateFrankaConfig` + `validateDiffDriveConfig`; 27 new tests; wired into `useSimulation.ts` |
| SCALE-2 | Export robot ID constants, remove magic strings | 2026-06-14 | `src/config/robotIds.ts` — `FRANKA_ID`, `DIFF_DRIVE_ID` sourced from JSON; updated robotStore, ManipulatorControls, TelemetryPanel, SceneRoot, DifferentialDriveRobot |
| PERF-3a | Pre-allocate `_jointStatesCache` in `FrankaArm` | 2026-06-14 | `FrankaArm.ts` — reuses same array each tick; saves 8 allocs/tick (1 array + 7 JointState objects) |
| T-021 | Wire `RobotLoader` into `SceneRoot` for `ridgeback_franka` | 2026-06-14 | branch update-frank-arm-mesh — `MovingRobot` component in `SceneRoot.tsx`; GLB loaded, hierarchy traversed, joints registered; `ManipulatorSystem` + `ForwardKinematicsSystem` drive the arm |
| INC-2 | `IKCommand` type exists but is never handled | 2026-06-14 | branch update-frank-arm-mesh — `FrankaArm.applyCommand()` now handles `SET_IK_TARGET`; `InputSystem` routes it via `robotId` dispatch |
| INC-3 | Fix `DifferentialDrive.dhTransforms` returning identity | 2026-06-13 | `DifferentialDrive.ts` — `buildState()` computes 4×4 world transform from basePose; 3 new tests |
| T-009 | Implement Gamepad input | 2026-06-14 | `GamepadController.ts` — left-stick analog; `mapAnalogToCommands()`; deadzone 0.15; 14 tests |
| T-020 | Finish PERF-3: eliminate FK allocations (computeFKInto) | 2026-06-14 | `ForwardKinematics.ts` — `computeFKInto`, `dhTransformInto`, `mat4MultiplyInto`; `FrankaArm` pre-allocates 3 buffers; 97% fewer allocs/tick; 8 tests |
| PERF-6 | Consolidate dual RAF loops | 2026-06-14 | `inputControllerSingleton.ts` + `useInputController.ts` (mount-only) + `useSimulationFrame.ts` (samples input + ticks engine) |
