# PROJECT_CONTEXT.md

## What This Is

A browser-based robotics simulator visualizing two robots in real time:

- **Franka Panda** — 7-DOF serial manipulator arm (position-controlled, standard DH kinematics)
- **Differential Drive** — 2-wheeled mobile base (unicycle kinematic model)

The primary use case is interactive exploration: drag joint sliders, drive the base with WASD, observe the 3-D scene update live.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 + TypeScript 5 (strict) |
| 3-D rendering | Three.js via `@react-three/fiber` v8 |
| 3-D helpers | `@react-three/drei` |
| State management | Zustand v5 (`subscribeWithSelector`, `persist`) |
| UI components | Ant Design v5 (dark theme) |
| Build | Vite 6 + `@vitejs/plugin-react` |
| Test | Vitest + `@testing-library/react` + jsdom |
| Linting | ESLint 9 flat config + `typescript-eslint` |
| Formatting | Prettier |

---

## Repository Layout

```
public/
└── models/              # Static GLB assets served by Vite (ridgeback_franka.glb)
src/
├── simulation/          # Pure-TS simulation core (no React, no Three)
│   ├── core/            # Engine, Clock, EventBus
│   ├── kinematics/      # DH parameters, FK, IK (stub)
│   ├── robots/          # FrankaArm, DifferentialDrive (implement Robot interface)
│   ├── systems/         # ECS-style tick systems
│   ├── types/           # Command, RobotState, WorldSnapshot
│   └── world/           # SimulationWorld, Obstacle
├── rendering/           # R3F scene, robot meshes, overlays
│   ├── robots/          # FrankaArmMesh, DiffDriveRobot, RobotLoader (GLB-based)
│   ├── scene/           # SceneRoot (Canvas), CameraController, Environment
│   ├── overlays/        # TrajectoryLine, CoordinateFrame
│   └── hooks/           # useSimulationFrame, useRobotGeometry, useRobotLoader
├── store/               # Zustand slices (simulation, robot, scene)
├── ui/                  # Ant Design panels, layout, components
├── input/               # KeyboardController, InputMapper, useInputController
├── hooks/               # useSimulation, useRobotCommands (engine bridge)
├── config/              # SimulationConfig, robot JSON configs
└── workers/             # ik.worker.ts, planner.worker.ts (stubs, not yet wired)
```

---

## Current Feature State

| Feature | Status |
|---|---|
| Forward kinematics (Franka, DH) | Working |
| FK via GLB hierarchy (Three.js) | Working — `ForwardKinematicsSystem`, EE pose at ~10 Hz to sidebar |
| Base kinematics (DiffDrive) | Working |
| Keyboard drive input | Working |
| Joint slider control (GLB joints) | Working — `ManipulatorControls` + `ManipulatorSystem` |
| Trajectory / trail visualization | Working — `Trail` component (ring-buffer backed) |
| Coordinate frame overlay | Working |
| End-effector frame overlay | Working — `EndEffectorFrame`, updated imperatively each frame |
| GLB model loading (ridgeback_franka) | **Working** — `MovingRobot` in `SceneRoot` (T-021) |
| Inverse kinematics (DLS Jacobian) | **Working** — `solveIK()` in `InverseKinematics.ts`; `SET_IK_TARGET` wired |
| EventBus | Working — `tick` + `reset` events emitted; `getEventBus()` exported |
| Collision detection | **Stub — no-op** |
| Path planning | **Stub — no-op** |
| Gamepad input | **Stub — no-op** |
| IK worker (Comlink) | **Stub** — main-thread IK is functional; worker offload is future |
| Planner worker (Comlink) | **Stub — throws** |

---

## Planned Architecture (Not Yet Implemented)

- **IK**: FABRIK or Jacobian pseudo-inverse in `workers/ik.worker.ts` via Comlink
- **Planning**: RRT/PRM in `workers/planner.worker.ts` via Comlink
- **Collision**: BVH broadphase against `SimulationWorld.obstacles`, optionally backed by `@react-three/rapier`
- **Physics**: Torque/velocity control for Franka (currently instant position tracking)
