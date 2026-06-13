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
| T-004 | Write unit tests for FK computation | `src/simulation/kinematics/ForwardKinematics.ts` | Known test vectors from Franka docs exist |
| T-005 | Write unit tests for DiffDrive kinematics | `src/simulation/robots/DifferentialDrive.ts` | Unicycle model, easy to verify |
| T-006 | Fix `toThreeMatrix()` to mutate existing `Matrix4` instead of allocating | `src/rendering/robots/FrankaArm.tsx` | PERF-1: 7 allocations/frame → GC pressure |
| T-007 | Fix FPS metric to use wall-clock, not tick time | `src/ui/panels/PerformanceMonitor.tsx` | BUG-2: shows unrealistic numbers |
| T-008 | Replace `TrajectorySystem` splice with head/tail ring buffer | `src/simulation/systems/TrajectorySystem.ts` | PERF-4: O(n) at cap (2000 entries) |
| T-021 | Wire `RobotLoader` into `SceneRoot` for `ridgeback_franka` | `src/rendering/scene/SceneRoot.tsx`, `src/rendering/robots/RobotLoader.tsx` | Component + hook built; just needs mounting in the scene tree alongside or replacing primitive meshes |

---

## P2 — Medium Value

| ID | Task | Key Files | Notes |
|----|------|-----------|-------|
| T-009 | Implement Gamepad input | `src/input/GamepadController.ts` | Stub; use `navigator.getGamepads()` |
| T-010 | Derive visual link lengths from DH params | `src/rendering/robots/FrankaArm.tsx` (LINK_LENGTHS const) | INC-1: hardcoded values can drift from DH config |
| T-011 | Add `robotId` to `DriveCommand` | `src/simulation/types/Command.ts`, `src/simulation/systems/InputSystem.ts` | BUG-3: currently targets all robots |
| T-012 | Read speeds from robot config in `InputMapper` | `src/input/InputMapper.ts` | BUG-4: hardcoded `1.5 m/s`, `2.0 rad/s` |
| T-013 | Merge 3 Zustand subscriptions in `DiffDriveRobot` | `src/rendering/robots/DifferentialDriveRobot.tsx` | PERF-2: use `useShallow` + combined selector |
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

_(Move items here when done — include date and PR/commit reference.)_

| ID | Task | Completed | Reference |
|----|------|-----------|-----------|
| — | — | — | — |
