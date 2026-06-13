# Troubleshooting Knowledge Base

Searchable index of every confirmed bug, performance hazard, and structural inconsistency in this codebase. Each entry documents the symptom, root cause, concrete fix, and how to avoid regressions.

## How to Search

- **By symptom**: `grep -r "FPS\|quaternion\|splice\|RAF" docs/errors/`
- **By file**: each document lists related files in the front-matter
- **By ID**: IDs match the backlog (`KNOWN_ISSUES.md`, `TASK_BACKLOG.md`)

---

## Status Legend

| Badge | Meaning |
|-------|---------|
| `OPEN` | Bug is present in current code |
| `RESOLVED` | Fix is merged into main |

---

## Bugs

| ID | Title | Severity | Status | File |
|----|-------|----------|--------|------|
| [BUG-001](BUG-001-ee-quaternion-identity.md) | End-effector quaternion always `[0,0,0,1]` | Medium | `OPEN` | `src/simulation/robots/FrankaArm.ts` |
| [BUG-002](BUG-002-fps-metric-wrong.md) | FPS display reads tick time, not wall-clock | Low | `OPEN` | `src/ui/panels/PerformanceMonitor.tsx` |
| [BUG-003](BUG-003-drive-command-broadcast.md) | `DRIVE` commands broadcast to all robots | Low | `OPEN` | `src/simulation/systems/InputSystem.ts` |
| [BUG-004](BUG-004-input-speed-mismatch.md) | Keyboard speed constants diverge from robot config | Low | `OPEN` | `src/input/InputMapper.ts` |

## Performance

| ID | Title | Severity | Status | File |
|----|-------|----------|--------|------|
| [PERF-001](PERF-001-matrix4-allocation.md) | `toThreeMatrix()` allocates every frame | High | `OPEN` | `src/rendering/robots/FrankaArm.tsx` |
| [PERF-002](PERF-002-zustand-subscriptions.md) | Multiple Zustand subscriptions in DiffDriveRobot | Medium | `RESOLVED` | `src/rendering/robots/DifferentialDriveRobot.tsx` |
| [PERF-003](PERF-003-buildstate-allocations.md) | `FrankaArm.buildState()` allocates on every tick | Medium | `OPEN` | `src/simulation/robots/FrankaArm.ts` |
| [PERF-004](PERF-004-trajectory-ring-buffer.md) | TrajectorySystem O(n) splice at buffer cap | Medium | `RESOLVED` | `src/simulation/systems/TrajectorySystem.ts` |
| [PERF-005](PERF-005-performance-monitor-rerenders.md) | PerformanceMonitor re-renders every physics tick | Low | `RESOLVED` | `src/ui/panels/PerformanceMonitor.tsx` |
| [PERF-006](PERF-006-dual-raf-loops.md) | Two independent RAF loops (simulation + input) | Low | `OPEN` | `src/input/hooks/useInputController.ts` |

## Scalability Risks

| ID | Title | Severity | Status | File |
|----|-------|----------|--------|------|
| [SCALE-001](SCALE-001-engine-singleton.md) | Module-level engine singleton blocks testing | Medium | `OPEN` | `src/hooks/useSimulation.ts` |
| [SCALE-002](SCALE-002-hardcoded-robot-ids.md) | Robot IDs are string literals scattered across files | Medium | `OPEN` | multiple |
| [SCALE-003](SCALE-003-static-scene-root.md) | SceneRoot hard-codes all robot meshes | Low | `OPEN` | `src/rendering/scene/SceneRoot.tsx` |
| [SCALE-004](SCALE-004-eventbus-disconnected.md) | `EventBus` is defined but never wired into the engine | Low/High | `OPEN` | `src/simulation/core/EventBus.ts` |

## Inconsistencies

| ID | Title | Severity | Status | File |
|----|-------|----------|--------|------|
| [INC-001](INC-001-link-lengths-hardcoded.md) | Visual link lengths diverge from DH params | Low | `OPEN` | `src/rendering/robots/FrankaArm.tsx` |
| [INC-002](INC-002-ikcommand-unhandled.md) | `IKCommand` in union but no dispatch branch | Medium | `OPEN` | `src/simulation/systems/InputSystem.ts` |
| [INC-003](INC-003-dhtransforms-identity.md) | `DifferentialDrive.dhTransforms` always identity | Low | `OPEN` | `src/simulation/robots/DifferentialDrive.ts` |

---

## Stubs (Not Yet Implemented)

These are not bugs — they are intentional stubs that throw or no-op. See `TASK_BACKLOG.md` for implementation tasks.

| Feature | Entry Point | Task |
|---------|-------------|------|
| Inverse Kinematics | `src/simulation/kinematics/InverseKinematics.ts` → `solveIK()` | T-001 |
| Collision Detection | `src/simulation/systems/CollisionSystem.ts` | T-016 |
| Path Planning | `src/simulation/systems/PathPlannerSystem.ts` | T-017 |
| Gamepad Input | `src/input/GamepadController.ts` | T-009 |
