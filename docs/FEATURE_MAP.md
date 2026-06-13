# Feature Map

> Maps user-visible features to implementation files. Use to locate code when a feature needs changing.

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Working |
| 🔶 | Partial / scaffolded |
| ❌ | Stub / not implemented |

---

## Simulation Control

| Feature | Status | Primary Files |
|---------|--------|---------------|
| Play simulation | ✅ | `Toolbar.tsx`, `useSimulation.ts`, `SimulationEngine.ts` |
| Pause simulation | ✅ | `Toolbar.tsx`, `useSimulation.ts`, `simulationStore.ts` |
| Stop / reset | ✅ | `Toolbar.tsx`, `useSimulation.ts`, `Command.ts` (`RESET`) |
| Step single frame | ✅ | `Toolbar.tsx`, `SimulationEngine.ts` |
| Speed control (0.25×–4×) | ✅ | `ConfigPanel.tsx`, `simulationStore.ts`, `SimulationClock.ts` |
| Fixed 60 Hz physics tick | ✅ | `SimulationEngine.ts`, `src/config/simulation.ts` |

---

## Franka Panda Arm

| Feature | Status | Primary Files |
|---------|--------|---------------|
| 7-DOF forward kinematics | ✅ | `ForwardKinematics.ts`, `FrankaArm.ts` |
| Joint sliders (manual control) | ✅ | `JointPanel.tsx`, `JointSlider.tsx`, `useRobotCommands.ts` |
| Joint limit enforcement | ✅ | `FrankaArm.ts` (`applyCommand`) |
| Joint limit warnings (UI) | ✅ | `JointSlider.tsx`, `robotSelectors.ts` |
| End-effector position display | ✅ | `JointPanel.tsx`, `VectorDisplay.tsx` |
| End-effector orientation | ❌ | `FrankaArm.ts` — quaternion hardcoded to `[0,0,0,1]` (BUG-1) |
| Inverse kinematics | ❌ | `InverseKinematics.ts` (throws), `ik.worker.ts` (stub) |
| Velocity / torque dynamics | ❌ | `FrankaArm.ts` — instant position control only |

---

## Differential Drive Robot

| Feature | Status | Primary Files |
|---------|--------|---------------|
| Unicycle kinematics | ✅ | `DifferentialDrive.ts` |
| Keyboard drive (WASD / arrows) | ✅ | `KeyboardController.ts`, `InputMapper.ts`, `useInputController.ts` |
| Drive buttons (UI) | ✅ | `ControlPanel.tsx`, `useRobotCommands.ts` |
| Wheel joint angle tracking | ✅ | `DifferentialDrive.ts` |
| Speed clamping | ✅ | `DifferentialDrive.ts` (applyCommand) |
| Gamepad input | ❌ | `GamepadController.ts` (stub) |
| Collision avoidance | ❌ | `CollisionSystem.ts` (no-op) |

---

## 3D Visualization

| Feature | Status | Primary Files |
|---------|--------|---------------|
| Franka arm mesh (7 links + joints) | ✅ | `rendering/robots/FrankaArm.tsx` |
| Differential drive mesh (chassis + wheels) | ✅ | `rendering/robots/DifferentialDriveRobot.tsx` |
| FK transform applied to meshes | ✅ | `FrankaArm.tsx` (`matrix` prop per joint group) |
| Coordinate frame overlays (RGB axes) | ✅ | `overlays/CoordinateFrame.tsx` |
| End-effector trajectory line | ✅ | `overlays/TrajectoryLine.tsx`, `TrajectorySystem.ts` |
| Grid floor | ✅ | `Environment.tsx` |
| Gizmo helper (corner axes) | ✅ | `Environment.tsx` |
| Shadow casting | ✅ | `SceneRoot.tsx` (`shadows`), `Environment.tsx` |
| Bounding box overlays | 🔶 | `sceneStore` toggle exists; rendering not implemented |
| Camera presets | ✅ | `CameraController.tsx`, `sceneStore.ts` |
| Orbit controls | ✅ | `CameraController.tsx` (`OrbitControls` from drei) |
| GLB model loading (RobotLoader) | 🔶 | `rendering/robots/RobotLoader.tsx`, `rendering/hooks/useRobotLoader.ts` — component built, not yet wired into SceneRoot (T-021) |

---

## Scene Configuration (Persistent)

| Feature | Status | Primary Files |
|---------|--------|---------------|
| Toggle grid | ✅ | `ConfigPanel.tsx`, `sceneStore.ts`, `Environment.tsx` |
| Toggle coordinate frames | ✅ | `ConfigPanel.tsx`, `sceneStore.ts`, `CoordinateFrame.tsx` |
| Toggle trajectory line | ✅ | `ConfigPanel.tsx`, `sceneStore.ts`, `TrajectoryLine.tsx` |
| Toggle bounding boxes | 🔶 | Toggle works; no renderer yet |
| Persist scene prefs across reload | ✅ | `sceneStore.ts` (`persist` to localStorage) |

---

## Performance Monitoring

| Feature | Status | Primary Files |
|---------|--------|---------------|
| SIM time display | ✅ | `PerformanceMonitor.tsx`, `simulationStore.ts` |
| Frame time display | ✅ | `PerformanceMonitor.tsx` |
| FPS display | 🔶 | `PerformanceMonitor.tsx` — computed from tick time, not wall-clock (BUG-2) |

---

## Testing Infrastructure

| Feature | Status | Primary Files |
|---------|--------|---------------|
| Vitest + jsdom environment | ✅ | `vite.config.ts`, `src/test/setup.ts` |
| WebGL mock for Three.js | ✅ | `src/test/setup.ts` |
| Test utilities (@testing-library) | ✅ | `package.json` |
| Actual test files | ❌ | None committed yet |

---

## Planned / Future Features (not scaffolded)

| Feature | Notes |
|---------|-------|
| Torque/velocity arm dynamics | Need physics integrator (e.g., spring-damper per joint) |
| Multi-robot interaction | Requires removing hard-coded robot IDs and scene mounts |
| RRT/PRM path planning | Worker stub exists; algorithm needed |
| BVH collision detection | System stub exists; needs geometry and broadphase |
| Replay mode | `SimMode` type includes `'replay'`; no implementation |
| Auto mode | `SimMode` type includes `'auto'`; no implementation |
