# Product Backlog — Robotics Simulator

**Last updated:** 2026-06-13  
**Product:** Browser-based 3D robotics simulator (Franka Panda + Differential Drive)  
**Audience:** Robotics students, researchers, and engineers exploring kinematics interactively

---

## Strategic Context

The simulator's core loop is already compelling: play with joint sliders, drive the base, watch the 3D scene update live. The gap between its current state and a demo-quality research tool is primarily three things — **IK** (closes the control loop), **real model visuals** (GLB wiring), and **collision/planning** (makes scenarios meaningful). Performance and bug fixes are the foundation everything else rests on.

**ROI scoring:**  
`User Value (1–5)` + `Business/Portfolio Value (1–5)` − `Complexity (1–5)`  
Higher = do sooner.

---

## NOW — Ship in the current sprint (quick wins + critical quality)

These items are near-complete, block downstream work, or have outsized user impact relative to effort.

---

### N-1 · Wire GLB RobotLoader into SceneRoot

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-021 |
| **User value** | ★★★★★ — Replaces blocky primitive meshes with the real `ridgeback_franka.glb` model. Transforms the simulator from a prototype into a credible, shareable demo. |
| **Business value** | ★★★★★ — Single highest-impact portfolio improvement per hour of effort. The component (`RobotLoader.tsx`) and hook (`useRobotLoader.ts`) are fully built; this is a two-line mount in `SceneRoot.tsx`. |
| **Complexity** | XS — Component is built. Mount it alongside or replacing primitive meshes in `SceneRoot.tsx`. |
| **Dependencies** | None. |
| **ROI** | **10 / 10** — Maximum value, minimum effort. Do this first. |
| **Files** | [src/rendering/scene/SceneRoot.tsx](../src/rendering/scene/SceneRoot.tsx), [src/rendering/robots/RobotLoader.tsx](../src/rendering/robots/RobotLoader.tsx) |

---

### N-2 · Fix end-effector quaternion (BUG-1)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-003, BUG-1 |
| **User value** | ★★★★☆ — Orientation is half of a pose. Any user who relies on end-effector data (for IK, overlays, or export) gets wrong results silently. Coordinate-frame overlay spinning is also misleading. |
| **Business value** | ★★★★☆ — Unblocks IK implementation entirely. A 7-DOF arm simulator with a wrong quaternion is technically incomplete. |
| **Complexity** | S — Extract 3×3 rotation block from final DH transform; add `mat3ToQuat()` utility (~20 lines). |
| **Dependencies** | None (self-contained in `FrankaArm.ts`). |
| **ROI** | **8 / 10** |
| **Files** | [src/simulation/robots/FrankaArm.ts](../src/simulation/robots/FrankaArm.ts) — `buildState()` |

---

### N-3 · Fix Matrix4 per-frame allocation (PERF-1)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-006, PERF-1 |
| **User value** | ★★★★☆ — 420 object allocations/second triggers GC pauses that cause visible frame stutter, especially on lower-end hardware. |
| **Business value** | ★★★★☆ — Frame-rate stability is table stakes for a 3D simulator. GC jank at 60 Hz signals engineering debt to any reviewer. |
| **Complexity** | S — Pre-allocate a `Matrix4[]` in a `useRef`, mutate in-place via `.set(...)` inside `useFrame`. |
| **Dependencies** | None. |
| **ROI** | **8 / 10** |
| **Files** | [src/rendering/robots/FrankaArm.tsx](../src/rendering/robots/FrankaArm.tsx) |

---

### N-4 · Fix FPS display to use wall-clock (BUG-2)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-007, BUG-2 |
| **User value** | ★★★☆☆ — Users currently see "500 FPS" which is meaningless and erodes trust in all performance metrics. |
| **Business value** | ★★★☆☆ — A demo with visibly wrong metrics looks unfinished. One-line fix: read `1 / delta` from R3F's `useFrame`. |
| **Complexity** | XS |
| **Dependencies** | None. |
| **ROI** | **7 / 10** |
| **Files** | [src/ui/panels/PerformanceMonitor.tsx](../src/ui/panels/PerformanceMonitor.tsx), [src/rendering/hooks/useSimulationFrame.ts](../src/rendering/hooks/useSimulationFrame.ts) |

---

### N-5 · Write unit tests for FK + DiffDrive kinematics

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-004, T-005 |
| **User value** | ★★☆☆☆ — Invisible to end-users but prevents silent regressions in the core simulation math. |
| **Business value** | ★★★★★ — Test infrastructure is fully configured (Vitest + jsdom + WebGL mock). Zero test files is a red flag. Known FK test vectors from Franka docs exist. Critical before any IK or planning work begins. |
| **Complexity** | S — `src/simulation/` is pure TypeScript, no mocking required. |
| **Dependencies** | None. |
| **ROI** | **7 / 10** |
| **Files** | [src/simulation/kinematics/ForwardKinematics.ts](../src/simulation/kinematics/ForwardKinematics.ts), [src/simulation/robots/DifferentialDrive.ts](../src/simulation/robots/DifferentialDrive.ts) |

---

## NEXT — Major capability unlocks (next 2–4 sprints)

These deliver significant new user capability and are sequenced to build on NOW work.

---

### X-1 · Implement Inverse Kinematics (FABRIK or Jacobian pseudo-inverse)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-001, T-002 |
| **User value** | ★★★★★ — Transforms the simulator from "watch joints move" to "move the end-effector to a target." This is the single feature that makes the arm feel like a real robot. IK target (`sceneStore.ikTarget`) already exists in the store. |
| **Business value** | ★★★★★ — IK is the flagship capability for a 7-DOF arm simulator. Without it, the Franka arm is a forward-only demo. The worker scaffold (`ik.worker.ts`) and Comlink pattern are pre-documented. |
| **Complexity** | L — FABRIK is iterative but straightforward (~200 lines). Jacobian pseudo-inverse requires SVD (~300 lines). Worker wiring adds ~50 lines. |
| **Dependencies** | N-2 (correct end-effector quaternion), N-5 (FK tests to validate IK against). |
| **ROI** | **9 / 10** |
| **Files** | [src/simulation/kinematics/InverseKinematics.ts](../src/simulation/kinematics/InverseKinematics.ts), [src/workers/ik.worker.ts](../src/workers/ik.worker.ts), [src/simulation/systems/InputSystem.ts](../src/simulation/systems/InputSystem.ts) |

---

### X-2 · Gamepad input support

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-009 |
| **User value** | ★★★★☆ — Driving a mobile base with a gamepad analog stick is vastly more natural than WASD. Expands the audience to anyone with a controller. |
| **Business value** | ★★★☆☆ — Differentiating feature for interactive demos. `GamepadController.ts` stub exists; `navigator.getGamepads()` is standard browser API. |
| **Complexity** | M — Controller detection, button/axis mapping, dead-zone handling, and integration into the command queue (~150 lines). |
| **Dependencies** | T-011 (add `robotId` to `DriveCommand` — required before gamepad can target a specific robot). |
| **ROI** | **6 / 10** |
| **Files** | [src/input/GamepadController.ts](../src/input/GamepadController.ts), [src/input/InputMapper.ts](../src/input/InputMapper.ts) |

---

### X-3 · IK target picker UI (click-to-move)

| Attribute | Detail |
|-----------|--------|
| **Ref** | New |
| **User value** | ★★★★★ — Lets users click a point in the 3D scene and watch the arm solve to it. This is the most intuitive interaction possible for an IK demo. |
| **Business value** | ★★★★★ — The visual "wow moment" for any demo. Requires X-1 (IK) first. `sceneStore.ikTarget` already exists as a `Vector3 \| null`. |
| **Complexity** | M — Ray-casting from mouse click onto a plane/mesh in R3F, storing the hit point as `ikTarget`, dispatching `IKCommand`. |
| **Dependencies** | X-1 (IK solver must work). |
| **ROI** | **8 / 10** |
| **Files** | [src/store/sceneStore.ts](../src/store/sceneStore.ts), [src/rendering/scene/SceneRoot.tsx](../src/rendering/scene/SceneRoot.tsx) |

---

### X-4 · Replace TrajectorySystem splice with ring buffer (PERF-4)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-008, PERF-4 |
| **User value** | ★★★☆☆ — Prevents trajectory rendering from degrading over long sessions. O(n) splice at 2000-entry cap fires every tick once full. |
| **Business value** | ★★★☆☆ — Correctness issue masquerading as a performance issue. Ring buffer is a 1-class refactor with no API change. |
| **Complexity** | M — Implement `RingBuffer<T>` class; replace `trajectoryBuffer: Pose3D[]` array usage. |
| **Dependencies** | N-5 (trajectory unit tests should be added before refactoring). |
| **ROI** | **6 / 10** |
| **Files** | [src/simulation/systems/TrajectorySystem.ts](../src/simulation/systems/TrajectorySystem.ts) |

---

### X-5 · Fix DriveCommand robotId broadcast (BUG-3 + BUG-4)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-011, T-012, BUG-3, BUG-4 |
| **User value** | ★★★☆☆ — Currently harmless (only one drive robot) but will cause unintended multi-robot control bugs as soon as a second robot is added. Also: keyboard max speed never matches robot config. |
| **Business value** | ★★★★☆ — These two fixes are coupled (both in `Command.ts` / `InputMapper.ts`), low complexity, and required before gamepad or multi-robot work. |
| **Complexity** | S — Add `robotId` field to `DriveCommand`; read speeds from JSON config. |
| **Dependencies** | None. |
| **ROI** | **7 / 10** |
| **Files** | [src/simulation/types/Command.ts](../src/simulation/types/Command.ts), [src/input/InputMapper.ts](../src/input/InputMapper.ts), [src/simulation/systems/InputSystem.ts](../src/simulation/systems/InputSystem.ts) |

---

### X-6 · Wire EventBus into SimulationEngine

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-014, SCALE-4 |
| **User value** | ★★☆☆☆ — Not directly visible, but enables UI features like collision alerts and trajectory completion events. |
| **Business value** | ★★★★☆ — `EventBus` is fully defined with `tick`, `collision`, `trajectoryUpdated`, `reset` events. Collision and planning systems need it to signal outcomes. Required before collision detection is meaningful. |
| **Complexity** | S — Inject `EventBus` into `SimulationEngine` constructor; emit in `tick()` and on system events. |
| **Dependencies** | None (pure infrastructure). |
| **ROI** | **6 / 10** |
| **Files** | [src/simulation/core/EventBus.ts](../src/simulation/core/EventBus.ts), [src/simulation/core/SimulationEngine.ts](../src/simulation/core/SimulationEngine.ts) |

---

## LATER — High-value capabilities requiring significant scope

These items each require 1–3 weeks and have meaningful dependencies on NEXT items.

---

### L-1 · Collision detection (BVH broadphase)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-016 |
| **User value** | ★★★★★ — Without collision detection, path planning is simulation-only; users cannot set up meaningful obstacle avoidance scenarios. |
| **Business value** | ★★★★★ — The combination of IK + collision detection + path planning is the complete robotics simulation feature set. Consider `@react-three/rapier` for physics-grade collision. |
| **Complexity** | XL — BVH geometry building, broadphase queries, `Obstacle` world integration, response callbacks via EventBus. |
| **Dependencies** | X-1 (IK for arm pose), X-6 (EventBus for collision events), N-5 (tests for collision math). |
| **ROI** | **7 / 10** |
| **Files** | [src/simulation/systems/CollisionSystem.ts](../src/simulation/systems/CollisionSystem.ts), [src/simulation/world/Obstacle.ts](../src/simulation/world/Obstacle.ts) |

---

### L-2 · Path planning (RRT/PRM)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-017 |
| **User value** | ★★★★★ — Users can set a goal pose and watch the robot plan and execute a collision-free trajectory. This is the capstone interaction. |
| **Business value** | ★★★★★ — Closes the full robotics stack: FK → IK → Collision → Planning. Worker stub (`planner.worker.ts`) and Comlink pattern are pre-documented. |
| **Complexity** | XL — RRT tree sampling, configuration-space collision checking, path smoothing, integration with `PathPlannerSystem`. |
| **Dependencies** | L-1 (collision detection), X-1 (IK for goal configuration). |
| **ROI** | **6 / 10** |
| **Files** | [src/simulation/systems/PathPlannerSystem.ts](../src/simulation/systems/PathPlannerSystem.ts), [src/workers/planner.worker.ts](../src/workers/planner.worker.ts) |

---

### L-3 · Bounding box rendering

| Attribute | Detail |
|-----------|--------|
| **Ref** | `sceneStore` toggle exists; renderer missing |
| **User value** | ★★★☆☆ — The toggle is in the UI and confuses users when it has no effect. Also needed to visualize collision geometry. |
| **Business value** | ★★★☆☆ — Low effort (the toggle store state is wired), high visibility fix for the missing renderer. Required before collision detection is comprehensible. |
| **Complexity** | M — Add `<Box3Helper>` or custom shader overlay; subscribe to `sceneStore.showBoundingBoxes`. |
| **Dependencies** | None (can be done as geometry-only without collision detection). |
| **ROI** | **6 / 10** |
| **Files** | [src/rendering/scene/SceneRoot.tsx](../src/rendering/scene/SceneRoot.tsx), [src/store/sceneStore.ts](../src/store/sceneStore.ts) |

---

### L-4 · Arm dynamics (velocity/torque control)

| Attribute | Detail |
|-----------|--------|
| **Ref** | D4 |
| **User value** | ★★★☆☆ — Instant position control makes the arm feel unrealistic. Spring-damper dynamics add inertia, overshoot, and settling time — making it behave like a physical robot. |
| **Business value** | ★★★☆☆ — Educational value for robotics students learning control theory. Requires replacing `FrankaArm.step()` with a proper integrator. |
| **Complexity** | L — Per-joint state (velocity, acceleration), spring-damper model, integration loop, tunable gains. |
| **Dependencies** | N-5 (FK unit tests to validate dynamics don't break kinematics). |
| **ROI** | **5 / 10** |
| **Files** | [src/simulation/robots/FrankaArm.ts](../src/simulation/robots/FrankaArm.ts) |

---

### L-5 · Derive visual link lengths from DH params (INC-1)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-010, INC-1 |
| **User value** | ★★☆☆☆ — Invisible until DH params are changed and the mesh drifts out of sync. Causes subtle visual errors that are hard to trace. |
| **Business value** | ★★★☆☆ — Single source of truth principle. The fix is straightforward: read `frankaConfig.dhParams[i].d` at startup. |
| **Complexity** | S |
| **Dependencies** | None. |
| **ROI** | **5 / 10** |
| **Files** | [src/rendering/robots/FrankaArm.tsx](../src/rendering/robots/FrankaArm.tsx) — `LINK_LENGTHS` const |

---

### L-6 · JSON schema validation for robot configs (D5)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-015, D5 |
| **User value** | ★★☆☆☆ — Prevents cryptic runtime errors when a config is malformed. |
| **Business value** | ★★★☆☆ — Required before supporting user-loadable robot configs (Future). Add Zod or `ajv` schema at config load boundary. |
| **Complexity** | M |
| **Dependencies** | None. |
| **ROI** | **4 / 10** |
| **Files** | [src/config/robots/](../src/config/robots/), [src/simulation/robots/FrankaArm.ts](../src/simulation/robots/FrankaArm.ts) |

---

### L-7 · Performance: FrankaArm tick allocation reduction (PERF-3) + DiffDrive selector merge (PERF-2)

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-013, PERF-2, PERF-3 |
| **User value** | ★★★☆☆ — Reduces GC pressure at 60 Hz; especially noticeable on mobile/low-power devices. |
| **Business value** | ★★★☆☆ — Both are correctness-adjacent. Pre-allocate `Mat4[]` in FK; combine 3 Zustand selectors into 1 with `useShallow`. |
| **Complexity** | M (two independent changes that can be batched). |
| **Dependencies** | N-5 (FK tests validate no regression from mutation). |
| **ROI** | **5 / 10** |
| **Files** | [src/simulation/robots/FrankaArm.ts](../src/simulation/robots/FrankaArm.ts), [src/rendering/robots/DifferentialDriveRobot.tsx](../src/rendering/robots/DifferentialDriveRobot.tsx) |

---

## FUTURE — Strategic investments (post-MVP)

High complexity, significant scope, or dependent on the full LATER tier being complete.

---

### F-1 · Dynamic robot spawning

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-018, SCALE-3 |
| **User value** | ★★★★☆ — Users can add, remove, and configure robots at runtime. Multi-robot scenarios become possible. |
| **Business value** | ★★★★★ — Required to position the simulator as a general platform rather than a two-robot demo. |
| **Complexity** | XL — Robot registry, dynamic `SceneRoot` rendering, store generalization, config UI. |
| **Dependencies** | X-5 (robotId on commands), L-6 (config validation), L-1 (collision must be multi-body). |
| **ROI** | **6 / 10** |

---

### F-2 · Replay mode

| Attribute | Detail |
|-----------|--------|
| **Ref** | `SimMode` type includes `'replay'` |
| **User value** | ★★★★☆ — Record a control session and play it back. Invaluable for debugging robot behavior, creating demos, and sharing results. |
| **Business value** | ★★★★☆ — The `SimMode` union already includes `'replay'`. Requires trajectory serialization and a scrubber UI. |
| **Complexity** | L — Snapshot serialization, timeline store, playback engine, scrubber UI component. |
| **Dependencies** | Stable trajectory ring buffer (X-4). |
| **ROI** | **6 / 10** |

---

### F-3 · Multi-world / comparison view

| Attribute | Detail |
|-----------|--------|
| **Ref** | T-019, SCALE-1 |
| **User value** | ★★★☆☆ — Side-by-side comparison of two robot configurations or IK algorithms. Useful for research and teaching. |
| **Business value** | ★★★☆☆ — Requires breaking the engine singleton (`SCALE-1`). Significant architectural change. |
| **Complexity** | XL — Engine moved to React context, scene duplicated, state isolation, layout redesign. |
| **Dependencies** | F-1 (dynamic spawning), X-1 (IK — something worth comparing). |
| **ROI** | **4 / 10** |

---

### F-4 · Load robot config from URL / drag-and-drop

| Attribute | Detail |
|-----------|--------|
| **Ref** | D5 (design intent) |
| **User value** | ★★★★★ — Users bring their own URDF or DH-param JSON and simulate it immediately. Massively increases the tool's utility. |
| **Business value** | ★★★★★ — Transforms the simulator from a Franka viewer into a general kinematics playground. |
| **Complexity** | XL — URDF parser or JSON schema, dynamic DH config loading, mesh fallback, validation UI. |
| **Dependencies** | L-6 (JSON schema validation), F-1 (dynamic spawning). |
| **ROI** | **6 / 10** |

---

### F-5 · Dual RAF loop consolidation (PERF-6)

| Attribute | Detail |
|-----------|--------|
| **Ref** | PERF-6 |
| **User value** | ★★☆☆☆ — Eliminates command accumulation artifacts between simulation ticks and input loop ticks. |
| **Business value** | ★★★☆☆ — Architectural cleanup: drive input sampling from inside `useSimulationFrame` before `engine.tick()`. |
| **Complexity** | M — Merge the two RAF loops; test for input latency regression. |
| **Dependencies** | N-5 (tests to catch regressions). |
| **ROI** | **4 / 10** |

---

## Ranked Summary

| Rank | ID | Feature | ROI | Horizon |
|------|----|---------|-----|---------|
| 1 | N-1 | Wire GLB RobotLoader | 10/10 | NOW |
| 2 | X-3 | IK target picker UI (click-to-move) | 8/10 | NEXT |
| 3 | N-2 | Fix end-effector quaternion | 8/10 | NOW |
| 4 | N-3 | Fix Matrix4 allocation | 8/10 | NOW |
| 5 | X-1 | Implement IK solver | 9/10 | NEXT |
| 6 | N-4 | Fix FPS display | 7/10 | NOW |
| 7 | N-5 | Unit tests FK + DiffDrive | 7/10 | NOW |
| 8 | X-5 | Fix DriveCommand robotId + speed | 7/10 | NEXT |
| 9 | X-2 | Gamepad input | 6/10 | NEXT |
| 10 | X-4 | Ring buffer for trajectory | 6/10 | NEXT |
| 11 | X-6 | Wire EventBus | 6/10 | NEXT |
| 12 | L-1 | Collision detection (BVH) | 7/10 | LATER |
| 13 | L-2 | Path planning (RRT/PRM) | 6/10 | LATER |
| 14 | L-3 | Bounding box rendering | 6/10 | LATER |
| 15 | L-4 | Arm dynamics | 5/10 | LATER |
| 16 | L-5 | Link lengths from DH params | 5/10 | LATER |
| 17 | L-7 | Tick allocation + selector merge | 5/10 | LATER |
| 18 | L-6 | JSON schema validation | 4/10 | LATER |
| 19 | F-1 | Dynamic robot spawning | 6/10 | FUTURE |
| 20 | F-4 | Load config from URL | 6/10 | FUTURE |
| 21 | F-2 | Replay mode | 6/10 | FUTURE |
| 22 | F-3 | Multi-world comparison view | 4/10 | FUTURE |
| 23 | F-5 | Dual RAF loop consolidation | 4/10 | FUTURE |

---

## Dependency Graph

```
N-2 (quaternion fix)
  └→ X-1 (IK solver)
       └→ X-3 (IK target picker)
       └→ L-2 (path planning)

N-5 (unit tests)
  └→ X-4 (ring buffer refactor)
  └→ L-4 (arm dynamics)
  └→ L-7 (perf refactors)
  └→ F-5 (RAF consolidation)

X-5 (DriveCommand robotId)
  └→ X-2 (gamepad input)
  └→ F-1 (dynamic spawning)

X-6 (EventBus)
  └→ L-1 (collision detection)
       └→ L-2 (path planning)

L-1 (collision)
  └→ F-1 (dynamic spawning)

L-6 (JSON validation)
  └→ F-4 (load config from URL)

F-1 (dynamic spawning)
  └→ F-3 (multi-world)
  └→ F-4 (load config from URL)
```
