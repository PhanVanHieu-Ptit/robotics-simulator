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

| ID | Task | Key Files | Notes |
|----|------|-----------|-------|
| T-001 | Implement IK solver (FABRIK or Jacobian pseudo-inverse) | `src/simulation/kinematics/InverseKinematics.ts`, `src/workers/ik.worker.ts` | `solveIK()` throws; `IKCommand` type exists with no handler |
| T-002 | Wire `IKCommand` into `InputSystem` | `src/simulation/systems/InputSystem.ts` | Case exists in union but no dispatch branch |
| T-003 | Extract end-effector quaternion from final FK transform | `src/simulation/robots/FrankaArm.ts` line where `endEffectorPose` is built | BUG-1: quaternion hardcoded to `[0,0,0,1]` |

---

## P1 — High Value

| ID | Task | Key Files | Notes |
|----|------|-----------|-------|
| T-021 | Wire `RobotLoader` into `SceneRoot` for `ridgeback_franka` | `src/rendering/scene/SceneRoot.tsx`, `src/rendering/robots/RobotLoader.tsx` | Component + hook built; just needs mounting in the scene tree alongside or replacing primitive meshes |

---

## P2 — Medium Value

| ID | Task | Key Files | Notes |
|----|------|-----------|-------|
| T-009 | Implement Gamepad input | `src/input/GamepadController.ts` | Stub; use `navigator.getGamepads()` |
| T-010 | Derive visual link lengths from DH params | `src/rendering/robots/FrankaArm.tsx` (LINK_LENGTHS const) | INC-1: hardcoded values can drift from DH config |
| T-011 | Add `robotId` to `DriveCommand` | `src/simulation/types/Command.ts`, `src/simulation/systems/InputSystem.ts` | BUG-3: currently targets all robots |
| T-014 | Instantiate and connect `EventBus` in engine | `src/simulation/core/EventBus.ts`, `src/simulation/core/SimulationEngine.ts` | SCALE-4: defined but never used |
| T-015 | Add schema validation for robot JSON configs | `src/config/robots/*.json`, `src/simulation/robots/FrankaArm.ts` | D5: no boundary validation |

---

## P3 — Low Priority / Speculative

| ID | Task | Key Files | Notes |
|----|------|-----------|-------|
| T-016 | Implement `CollisionSystem` (BVH broadphase) | `src/simulation/systems/CollisionSystem.ts`, `src/simulation/world/Obstacle.ts` | Consider `@react-three/rapier` for physics |
| T-017 | Implement `PathPlannerSystem` (RRT/PRM) | `src/simulation/systems/PathPlannerSystem.ts`, `src/workers/planner.worker.ts` | Worker thread via Comlink pattern already documented |
| T-018 | Support dynamic robot spawning | `src/rendering/scene/SceneRoot.tsx` | SCALE-3: robots hard-coded in scene |
| T-019 | Allow multi-world testing (break engine singleton) | `src/simulation/core/SimulationEngine.ts`, `src/hooks/useSimulation.ts` | SCALE-1: module singleton blocks isolation |
| T-020 | Debounce `PerformanceMonitor` renders | `src/ui/panels/PerformanceMonitor.tsx` | PERF-5: re-renders every tick |

---

## Completed

| ID | Task | Completed | Reference |
|----|------|-----------|-----------|
| T-003 | Extract end-effector quaternion from final FK transform | 2026-06-13 | branch fix-control — `mat3ToQuat()` wired in `FrankaArm.buildState()` |
| T-004 | Write unit tests for FK computation | 2026-06-13 | branch fix-control — `ForwardKinematics.test.ts` (28 tests) |
| T-005 | Write unit tests for DiffDrive kinematics | 2026-06-13 | branch fix-control — `DifferentialDrive.test.ts` (23 tests) |
| T-006 | Fix `FrankaArmMesh` matrix allocation (PERF-1) | 2026-06-13 | `FrankaArm.tsx` — `useFrame` + direct `group.matrix.set()`; zero allocs/frame, zero React re-renders |
| T-007 | Fix FPS metric to use wall-clock, not tick time | 2026-06-13 | `WorldSnapshot.wallDeltaSec` propagated to `metricsStore`; FPS = `1/wallDeltaSec` |
| T-008 | Replace `TrajectorySystem` splice with ring buffer (PERF-4) | 2026-06-13 | `TrajectorySystem.ts` — `PositionRingBuffer` class; O(1) push, no array shifting |
| T-012 | Read speeds from robot config in `InputMapper` | 2026-06-13 | `InputMapper.ts` imports `diffDriveConfig`; tests updated to match |
| T-013 | Remove React subscriptions from `DiffDriveRobot` (PERF-2) | 2026-06-13 | `DifferentialDriveRobot.tsx` already uses `useFrame` + `getState()` — zero re-renders |
| INC-3 | Fix `DifferentialDrive.dhTransforms` returning identity | 2026-06-13 | `DifferentialDrive.ts` — `buildState()` computes 4×4 world transform from basePose; 3 new tests |
