# ARCHITECTURE.md

## Core Design

The codebase enforces a strict unidirectional data flow:

```
Input (keyboard/gamepad/UI)
  ↓ Command (discriminated union)
SimulationWorld.commandQueue
  ↓ flushed each tick
Systems (Input → Kinematics → Trajectory)
  ↓ mutate Robot.state in-place
WorldSnapshot (immutable)
  ↓ onSnapshot callback
Zustand stores (robotStore, simulationStore)
  ↓ reactive subscriptions
React components / R3F meshes
```

The simulation core (`src/simulation/`) is a pure TypeScript module with **no React, no Three.js, no browser APIs**. It can be tested in Node.

---

## SimulationEngine

`SimulationEngine` is an immutable data bag: constructor injects `world`, `clock`, `systems[]`, and `onSnapshot`. It has no singleton state of its own. The singleton lives in `useSimulation.ts` as a module-level `let _engine`.

```
SimulationEngine.tick(rawDelta?)
  → clock.advance(rawDelta)       // scales by speedMultiplier, clamps maxDt
  → for each System: system.tick(world, dt)
  → onSnapshot({ simTime, frameTime, robots, trajectories })
```

**System execution order** (defined in `useSimulation.ts → createEngine()`):

1. `InputSystem` — drains `world.commandQueue`, dispatches commands to robots
2. `KinematicsSystem` — calls `robot.step(dt)` on every robot
3. `TrajectorySystem` — appends end-effector positions to ring buffers

---

## ECS-Like System Pattern

`System` is a single-method interface:

```ts
interface System { tick(world: SimulationWorld, dt: number): void }
```

Systems read/write through `SimulationWorld` only. They do not hold state themselves (stateless systems). Order matters and is the only coupling point.

---

## Robot Model

```
Robot (interface)
  ├── FrankaArm     — 7-DOF, DH parameter FK, instant position control
  └── DifferentialDrive  — unicycle model, midpoint Euler integration
```

Each robot owns a mutable `trajectoryBuffer: Pose3D[]` managed by `TrajectorySystem`. Robot IDs are sourced from JSON config files (`src/config/robots/`).

---

## State Management

Three Zustand stores, each with `subscribeWithSelector`:

| Store | Purpose | Middleware |
|---|---|---|
| `simulationStore` | isRunning, isPaused, speed, simTime, frameTime | `subscribeWithSelector` |
| `robotStore` | jointAngles, basePose, dhTransforms, eePos, trajectories | `subscribeWithSelector` |
| `sceneStore` | toggles (grid, trajectory, bboxes), cameraPreset, ikTarget | `subscribeWithSelector` + `persist` |

**The render loop never triggers React re-renders via `useFrame`.** Instead:
- `useSimulationFrame` mirrors store booleans into a plain `ref` via Zustand's vanilla `subscribe()`
- `useInputController` does the same for its RAF loop

This pattern avoids the "Maximum update depth exceeded" cascade that would occur if `useFrame` subscribed to Zustand via React hooks.

---

## 3D Scene Infrastructure (`src/rendering/scene/`)

The rendering layer separates infrastructure from content:

```
Scene.tsx              — Canvas + PerspectiveCamera + OrbitControls + Lighting
  ├─ CameraController  — OrbitControls with preset positions; reads sceneStore.cameraPreset
  └─ Lighting.tsx      — Typed ambient + directional (shadow map) + fill light; prop-driven
Environment.tsx        — Grid helper + GizmoHelper; reads sceneStore.showGrid
SceneRoot.tsx          — Composes <Scene> with all simulation content as children
```

---

## GLB Model Loading

Robot meshes can alternatively be loaded from `.glb` files rather than constructed from primitives.

**Asset serving:** GLB files must reside under `public/` so Vite's dev server serves them at the root URL. The `ridgeback_franka.glb` (11 MB) is at `public/models/ridgeback_franka.glb` and is referenced as `/models/ridgeback_franka.glb`.

**`useRobotLoader(config)` — `src/rendering/hooks/useRobotLoader.ts`**

- Wraps `useGLTF` from `@react-three/drei` (Suspense-based; suspends until loaded)
- Clones `gltf.scene` with `clone(true)` so multiple instances are independent
- Memoizes on `config.path` to avoid unnecessary re-clones
- Exposes `useRobotLoader.preload(config)` for eager background loading

**`ROBOT_MODELS` registry**

A `satisfies Record<string, RobotModelConfig>` const in `useRobotLoader.ts`. Adding a new robot model requires one entry here — no other files need changing.

**`RobotLoader` component — `src/rendering/robots/RobotLoader.tsx`**

```
RobotLoader
  └─ RobotErrorBoundary (class)   ← catches load errors; renders red wireframe cube; calls onError
       └─ Suspense                 ← shows blue wireframe cube while GLB loads
            └─ RobotMesh           ← calls useRobotLoader; fires onLoad via useEffect
                 └─ <primitive />  ← mounts the cloned scene graph
```

The nested `<Suspense>` overrides the outer `fallback={null}` in `Scene.tsx` for this subtree only.

**Performance settings applied in `Scene`:**
- `dpr={[1, 1.5]}` — caps pixel ratio; 44 % GPU fill reduction on 2× Retina vs uncapped
- `performance={{ min: 0.5 }}` — R3F adaptive performance: reduces DPR when frame time spikes
- `gl.stencil=false` — disables unused stencil buffer
- `gl.powerPreference='high-performance'` — hints browser to use dGPU

---

## Render → Simulation Bridge

```
useSimulation()          → controls engine lifecycle (start/pause/stop/step)
useRobotCommands()       → dispatch(cmd) → engine.world.enqueueCommand(cmd)
useSimulationFrame()     → drives engine.tick() from R3F's rAF
useInputController()     → maps keyboard state → commands via own RAF loop
```

`useRobotCommands` deliberately does not call `useSimulation()`. It accesses `getEngine()` directly to avoid any store subscription.

---

## Path Aliases

All imports use path aliases configured in both `vite.config.ts` and `tsconfig.app.json`:

| Alias | Maps to |
|---|---|
| `@simulation/*` | `src/simulation/*` |
| `@rendering/*` | `src/rendering/*` |
| `@store/*` | `src/store/*` |
| `@ui/*` | `src/ui/*` |
| `@input/*` | `src/input/*` |
| `@config/*` | `src/config/*` |
| `@hooks/*` | `src/hooks/*` |
| `@workers/*` | `src/workers/*` |

---

## Worker Strategy (Planned)

Both `ik.worker.ts` and `planner.worker.ts` are scaffolded to be exposed via **Comlink**. The pattern documented in the stubs:

```ts
const worker = new Worker(new URL('./ik.worker.ts', import.meta.url), { type: 'module' })
const api = Comlink.wrap<typeof import('./ik.worker.ts')>(worker)
const result = await api.solve(dhParams, currentAngles, target)
```

Neither is wired yet. `solveIK()` and `PathPlannerSystem.tick()` throw on invocation.

---

## FK Implementation

Standard DH convention (Craig, not Denavit-Hartenberg modified):

```
T_i = Rz(θ+offset) · Tz(d) · Tx(a) · Rx(α)
```

`computeFK()` returns **cumulative transforms** — `transforms[i]` is frame `i` in the base frame. The rendering layer reads these from `robotStore.dhTransforms` and applies them via `group.matrix` with `matrixAutoUpdate={false}`.

FK orientation is correctly tracked through the full chain. However, `endEffectorPose.quaternion` is always hardcoded to `[0,0,0,1]` (identity) — only position is extracted from the final transform.

---

## Differential Drive Kinematics

Midpoint Euler integration (second-order accuracy):

```
dθ  = ω · dt
dx  = v · cos(θ + dθ/2) · dt
dy  = v · sin(θ + dθ/2) · dt
```

Velocity is clamped to `maxLinearVel` / `maxAngularVel` on `applyCommand`.
