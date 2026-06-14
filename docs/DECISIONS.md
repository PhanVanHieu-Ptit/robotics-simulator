# DECISIONS.md

Captures non-obvious architectural choices. Where evidence is indirect, marked **[inferred]**.

---

## D1 — Module-Level Singleton Engine (not React context)

**Decision**: `_engine` is a module-level `let` in `useSimulation.ts`, exposed via `getEngine()`.

**Why**: A React context would cause every context consumer to re-render when the engine ticks. The singleton avoids that entirely. Components access the engine imperatively via `getEngine()` with no React subscription.

**Trade-off**: Makes multi-world testing harder; the engine cannot be garbage-collected during a session; component tests must call `getEngine()` defensively.

---

## D2 — Zustand Vanilla Subscribe in RAF Loops

**Decision**: `useSimulationFrame` and `useInputController` both mirror `isRunning/isPaused` into a plain `ref` via `useSimulationStore.subscribe()` (not `useSimulationStore()`).

**Why**: Using a React hook inside `useFrame` or a RAF callback would trigger component re-renders on every store change, causing infinite update loops.

**Evidence**: Comment in `useSimulationFrame.ts`: _"eliminating the 'Maximum update depth exceeded' cascade"_.

---

## D3 — ECS System Pipeline (not OOP dispatch)

**Decision**: Simulation behaviour lives in stateless `System` classes iterated by `SimulationEngine`, not in method polymorphism on `Robot`.

**Why**: Makes it easy to add cross-cutting concerns (e.g., collision checking all robots against all obstacles) without modifying robot classes. System order is the explicit contract.

**Trade-off**: Ordering bugs are silent; wrong order produces wrong physics with no error.

---

## D4 — Instant Position Control for Franka

**Decision**: `FrankaArm.step()` calls `buildState()` immediately — there is no velocity/torque integration for the arm.

**Why**: Simplifies the MVP. The comment acknowledges the debt: _"Future: add velocity/torque control with proper 2nd-order integration."_

**Implication**: Joint sliders feel instant. Realistic dynamics require replacing `step()` with a proper integrator.

---

## D5 — Robot Config in JSON

**Decision**: Robot parameters (DH params, joint limits, initial angles, drive constraints) are in `src/config/robots/*.json`, not TypeScript.

**Why**: JSON is serializable, diffable, and can be loaded at runtime without compilation. Allows future support for loading arbitrary robot descriptions from disk or URL.

**Risk**: No schema validation at the JSON boundary. Type safety relies on TypeScript's `import ... from 'file.json'` inference, which accepts the shape unchecked.

---

## D6 — Three Zustand Slices (not one store)

**Decision**: Simulation state, robot state, and scene toggles are separate Zustand stores.

**Why [inferred]**: Prevents components subscribing to robot pose from re-rendering when scene toggles change, and vice versa. The `persist` middleware on `sceneStore` only persists user preferences, not volatile simulation state.

---

## D7 — Workers Scaffolded but Unimplemented

**Decision**: `ik.worker.ts` and `planner.worker.ts` exist with documented Comlink patterns but throw immediately.

**Why**: Establishes the intended integration contract before the algorithms are written. The stubs prevent accidental main-thread implementation of IK/planning.

---

## D8 — TrajectorySystem Deadband Filter

**Decision**: TrajectorySystem skips appending if the squared distance moved is less than `1e-6` (= 1 mm movement threshold).

**Why**: Prevents the trajectory buffer from filling up with duplicate poses when the robot is stationary, wasting memory and rendering bandwidth.

---

## D9 — `subscribeWithSelector` on All Stores

**Decision**: All stores use `subscribeWithSelector` middleware even though the vanilla `subscribe` pattern could work without it.

**Why [inferred]**: Enables future fine-grained subscriptions (e.g., subscribing to only `simTime` without re-running on `isRunning` changes). Costs nothing at the call site.

---

## D11 — Scene as Reusable Canvas Wrapper (DPR-capped)

**Decision**: A dedicated `Scene.tsx` component wraps R3F `Canvas` and owns camera, lighting, and OrbitControls. `SceneRoot` composes `<Scene>` and passes content as children. `Environment` is now grid + gizmo only.

**Why**: Separates infrastructure concerns (camera, GPU settings) from scene content, making `Scene` reusable for future preview panels (robot config thumbnails, IK target picker). Centralises the DPR cap `[1, 1.5]` and `powerPreference: 'high-performance'` in one place.

**DPR rationale**: On a 2× Retina screen, uncapped DPR renders 4× as many pixels. Capping at 1.5× cuts GPU fill by ~44 % with barely perceptible quality loss at typical viewing distances.

**Trade-off**: Consumers cannot swap the camera type to `OrthographicCamera` without bypassing `Scene`. Acceptable for now; add an `ortho` prop variant if needed.

---

## D10 — sceneStore Persisted to localStorage

**Decision**: `sceneStore` uses Zustand's `persist` middleware with key `'robotics-sim-scene'`.

**Why**: Scene toggles (grid, coordinate frames, trajectory visibility) are user preferences that should survive page reload. Simulation runtime state (`simulationStore`, `robotStore`) is not persisted — it always starts fresh.

---

## D12 — Three.js Hierarchy as the FK Solver for GLB Models

**Decision**: `ForwardKinematicsSystem.ts` reads the end-effector pose by calling `eeNode.updateWorldMatrix(true, false)` and decomposing `matrixWorld`, rather than re-running the DH parameter chain.

**Why**: The GLB file encodes all kinematic geometry (link offsets, twist) as rest-pose local transforms in the node hierarchy. `applyAngles()` injects joint variables via `node.rotation.y = θ`, and Three.js computes the full FK product internally when the world matrix is requested. This eliminates any risk of DH ↔ mesh divergence and removes the need for a separate FK loop for the visual layer.

**Trade-off**: The EE pose from the GLB hierarchy will differ from the analytic DH pose if the GLB rest pose does not match the DH convention. The two FK paths (DH for the sim engine, Three.js for the display) are currently independent; a future unification could validate them against each other in tests.

---

## D13 — Module-Level Node Registry in ManipulatorSystem

**Decision**: `ManipulatorSystem.ts` keeps a module-level `nodeMap: Map<string, THREE.Object3D>` populated by `registerNodes()` on GLB load. Joint rotations are applied by `applyAngles()` which reads this map.

**Why**: Consistent with the D1 singleton pattern for the engine. The node map is only valid for the loaded GLB scene; calling `registerNodes()` again (on reload) clears and repopulates it. Keeps the Zustand `useManipulatorStore` free of Three.js objects.

**Trade-off**: The map is global — multiple simultaneous GLB instances would clobber each other. Acceptable for the current single-robot design; use a context or closure if multi-instance is needed.

---

## D14 — FK Display Throttled to 10 fps

**Decision**: `computeFK()` in `ForwardKinematicsSystem.ts` writes the EE pose to `useFKStore` only every 6 frames (`DISPLAY_STRIDE = 6`), giving ~10 Hz display updates at 60 fps.

**Why**: Writing to Zustand every frame triggers `useSyncExternalStore` reconciliation in every React component that subscribes to `useFKStore`, adding ~1 ms of React overhead per frame for the sidebar display. The 3D visualization group is updated imperatively every frame (no Zustand involved) so the visual stays smooth at full rate.

---

## D15 — EventBus Injected Optionally into SimulationEngine

**Decision**: `SimulationEngine` accepts `bus?: EventBus<SimulationEvents>` as the 5th constructor argument. The bus is created in `useSimulation.ts` as a module-level singleton alongside `_engine`.

**Why**: Makes the engine independently testable without requiring a bus (existing integration tests pass `buildEngine()` with no bus argument). Keeps the emission logic inside the engine where it belongs, while the bus instance lives at the app level where callers can access it via `getEventBus()`.

**Trade-off**: `collision` and `trajectoryUpdated` events are defined in `SimulationEvents` but not yet emitted — those systems are stubs. Emitting them is a one-liner addition once `CollisionSystem` is implemented.
