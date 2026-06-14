# Changelog

All notable user-visible changes. Format: [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added
- GitHub Actions CI pipeline — type-check, lint, format, test, build on every push and PR.
- React `ErrorBoundary` wrapping `<AppLayout>` — unhandled errors now show a friendly message with a Retry button instead of a blank white screen.
- `ARCHITECTURE.md` — layer rules, data-flow diagram, FK duality documentation, module singleton table.
- `CONTRIBUTING.md` — dev setup, PR checklist, coding conventions, architectural boundary rules.
- `src/rendering/utils/nodeRegistry.ts` — Three.js node registry extracted from `ManipulatorSystem.ts` to respect `src/simulation/` framework-free boundary.
- `useInputSampler`, `useEngineFrame`, `useSimToGLBBridge` — `useSimulationFrame` is now composed of three single-responsibility hooks.

### Changed
- **IK solver** (`InverseKinematics.ts`) — zero heap allocations per iteration. `solve3` now uses pre-allocated scratch `Mat3` arrays; FK uses `computeFKInto`. Reduces ~1100 allocations per `solveIK` call to 0.
- **`TrajectorySystem`** — removed O(n) copy-back to `robot.trajectoryBuffer` on each push. Trajectories are now built once per tick via `getTrajectorySnapshot()` called by `SimulationEngine`. Engine holds a typed `TrajectorySystem` reference and calls `clearAll()` on reset.
- **`rendererStore`** — converted from Zustand store to plain pub-sub (same pattern as `metricsStore`). Eliminates per-frame `{ calls, geometries, triangles, textures }` object allocation and Zustand dispatch at 60fps.
- **`robotStore`** — removed `dhTransforms` field. Consumers that need raw DH transforms should read `robotSnapshots[FRANKA_ID].dhTransforms`.
- **`ManipulatorSystem.ts`** — node registry functions (`registerNodes`, `applyAngles`, `getNodeMap`) moved to `src/rendering/utils/nodeRegistry.ts`. `ManipulatorSystem.ts` now only contains the Zustand manipulator store.

### Removed
- `src/rendering/robots/FrankaArm.tsx` — primitive procedural arm renderer (superseded by GLB `MovingRobot`).
- `src/rendering/robots/DifferentialDriveRobot.tsx` — primitive diff-drive renderer (superseded by GLB).
- `src/rendering/hooks/useRobotMotion.ts` — unused hook (legacy from before the unified input path).
- `src/store/robotMotionStore.ts` — unused store (legacy from before `useRobotMotion` was removed).

### Fixed
- `solveIK` no longer calls the allocating `computeFK` (returns `Mat4[]`) inside the iteration loop. The in-place `computeFKInto` is used instead.

---

## Previous sessions (from TASK_BACKLOG.md completed items)

### 2026-06-14

- T-020: `computeFKInto` + pre-allocated buffers eliminate ~97% of FK allocations per tick.
- T-009: Gamepad input — `GamepadController` + `mapAnalogToCommands`, deadzone 0.15, 14 tests.
- PERF-6: Unified dual RAF loops into single R3F `useFrame` via `inputControllerSingleton`.
- T-021: GLB model (`ridgeback_franka.glb`) wired into `SceneRoot` via `MovingRobot`.
- T-001/INC-2: IK solver (DLS Jacobian) implemented and wired to `SET_IK_TARGET` command.
- T-015: Runtime schema validation for robot JSON configs (`validateFrankaConfig`, `validateDiffDriveConfig`).
- T-014: `EventBus` wired into `SimulationEngine`; `tick` + `reset` events emitted.
- T-011/SCALE-2: Robot ID constants extracted from JSON configs; magic strings eliminated.

### 2026-06-13

- T-003: End-effector quaternion extracted via Shepperd's method (`mat3ToQuat`).
- T-004/T-005: 51 unit tests for FK and DiffDrive kinematics.
- T-006/PERF-1: `FrankaArmMesh` matrix allocation eliminated (imperative `group.matrix.set`).
- T-007/BUG-2: FPS metric fixed to use wall-clock delta, not simulation frame time.
- T-008/PERF-4: `TrajectorySystem` ring buffer replaces O(n) `splice` trimming.
- T-012/BUG-4: `InputMapper` speed constants read from robot JSON config.
- INC-3: `DifferentialDrive.dhTransforms` computes real world-space transform.
