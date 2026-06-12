# Component Registry

> All React and R3F components. Columns: file path, props/inputs, store dependencies, purpose.

---

## Layout Components (`src/ui/layout/`)

| Component | File | Store Reads | Notes |
|-----------|------|-------------|-------|
| `AppLayout` | `layout/AppLayout.tsx` | none | Root flex container; mounts `InputGate` |
| `Toolbar` | `layout/Toolbar.tsx` | `simulationStore` (isRunning, isPaused), `useSimulation` | Play/Pause/Stop/Step/Reload buttons + status tag |
| `Sidebar` | `layout/Sidebar.tsx` | none | Tabbed container (Joints, Drive, Config) |

---

## Panel Components (`src/ui/panels/`)

| Component | File | Store Reads | Notes |
|-----------|------|-------------|-------|
| `JointPanel` | `panels/JointPanel.tsx` | `robotStore` (jointAngles, endEffectorPose), `simulationStore` (isRunning) | 7 joint sliders + EE display |
| `ControlPanel` | `panels/ControlPanel.tsx` | `simulationStore` (isRunning, isPaused) | ↑↓←→ drive buttons; sends `DRIVE` command on pointerdown |
| `ConfigPanel` | `panels/ConfigPanel.tsx` | `sceneStore`, `simulationStore` (speed) | All scene toggles + speed select + camera presets |
| `PerformanceMonitor` | `panels/PerformanceMonitor.tsx` | `simulationStore` (simTime, frameTime) | SIM time, frame time, FPS display; BUG-2: FPS not wall-clock |

---

## Atomic UI Components (`src/ui/components/`)

| Component | File | Props | Notes |
|-----------|------|-------|-------|
| `JointSlider` | `components/JointSlider.tsx` | `index`, `angle`, `min`, `max`, `onChange` | Ant Design Slider; degree display; orange if near limit |
| `VectorDisplay` | `components/VectorDisplay.tsx` | `label`, `vector: [x,y,z]`, `precision?` | Formatted 3D vector; precision defaults to 3 |

---

## 3D Scene Components (`src/rendering/scene/`)

| Component | File | Store Reads | Notes |
|-----------|------|-------------|-------|
| `Scene` | `scene/Scene.tsx` | none | Reusable Canvas wrapper; accepts `camera`, `lighting`, `dpr`, `shadows`, `background` props; DPR capped to `[1, 1.5]` for FPS |
| `Lighting` | `scene/Lighting.tsx` | none | Ambient + directional (with shadow map) + fill point light; fully prop-typed |
| `SceneRoot` | `scene/SceneRoot.tsx` | none | Composes `<Scene>` with all simulation 3D children |
| `Environment` | `scene/Environment.tsx` | `sceneStore` (showGrid) | `<Grid>` + `<GizmoHelper>` scene decorations (lights removed, now in `Lighting`) |
| `CameraController` | `scene/CameraController.tsx` | `sceneStore` (cameraPreset) | OrbitControls + preset positions (perspective / top / front / side) |

---

## Robot Mesh Components (`src/rendering/robots/`)

| Component | File | Store Reads | Notes |
|-----------|------|-------------|-------|
| `FrankaArmMesh` | `robots/FrankaArm.tsx` | `robotStore` (dhTransforms, jointAngles) | 7 joint groups; uses `matrix` prop + `matrixAutoUpdate={false}` |
| `DiffDriveRobot` | `robots/DifferentialDriveRobot.tsx` | `robotStore` (basePose, jointAngles[0,1]) | 3 subscriptions (PERF-2); chassis + 2 wheels |

### Shared Primitives (`src/rendering/robots/shared/`)

| Component | File | Props | Notes |
|-----------|------|-------|-------|
| `Joint` | `shared/Joint.tsx` | `radius?`, `color?` | Sphere geometry; represents revolute joint |
| `Link` | `shared/Link.tsx` | `length`, `radius?`, `color?` | Cylinder geometry; represents rigid link |

---

## Overlay Components (`src/rendering/overlays/`)

| Component | File | Store Reads | Notes |
|-----------|------|-------------|-------|
| `CoordinateFrames` | `overlays/CoordinateFrame.tsx` | `robotStore` (dhTransforms), `sceneStore` (showCoordinateFrames) | RGB axis lines per joint frame |
| `TrajectoryLine` | `overlays/TrajectoryLine.tsx` | `robotStore` (trajectories), `sceneStore` (showTrajectory) | `<Line>` from `@react-three/drei` |

---

## Rendering Hooks (`src/rendering/hooks/`)

| Hook | File | Notes |
|------|------|-------|
| `useSimulationFrame` | `hooks/useSimulationFrame.ts` | Drives `engine.tick(delta)` from R3F `useFrame`; updates stores via `onSnapshot` |
| `useRobotGeometry` | `hooks/useRobotGeometry.ts` | Memoized Three.js geometries to avoid per-render allocation |

---

## Input Hooks (`src/input/hooks/`)

| Hook | File | Notes |
|------|------|-------|
| `useInputController` | `hooks/useInputController.ts` | Mounts `KeyboardController`, runs RAF loop, mirrors store to `activeRef` |

---

## App Hooks (`src/hooks/`)

| Hook | File | Returns | Notes |
|------|------|---------|-------|
| `useSimulation` | `hooks/useSimulation.ts` | `{ start, pause, resume, stop, step, isRunning, isPaused }` | Engine lifecycle; exposes `getEngine()` |
| `useRobotCommands` | `hooks/useRobotCommands.ts` | `{ dispatch }` | Routes commands to `world.enqueueCommand()` |

---

## Component Hierarchy (abbreviated)

```
App
└─ AppLayout
   ├─ InputGate (invisible; mounts KeyboardController)
   ├─ Toolbar
   ├─ Sidebar
   │   ├─ JointPanel
   │   │   └─ JointSlider (×7)
   │   ├─ ControlPanel
   │   └─ ConfigPanel
   │       └─ PerformanceMonitor
   └─ main
       └─ SceneRoot
           └─ Scene (Canvas + camera + lights + OrbitControls)
               ├─ CameraController
               ├─ Lighting
               ├─ SimulationLoop (useSimulationFrame)
               ├─ Environment (Grid + Gizmo)
               ├─ FrankaArmMesh
               │   ├─ Joint (×7)
               │   └─ Link (×7)
               ├─ DiffDriveRobot
               ├─ TrajectoryLine
               └─ CoordinateFrames
```
