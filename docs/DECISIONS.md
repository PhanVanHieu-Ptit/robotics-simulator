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
