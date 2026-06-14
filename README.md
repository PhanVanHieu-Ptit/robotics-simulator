# robotics-simulator

A browser-based 3-D robotics simulator built with React 18 + TypeScript + Three.js. Visualises a 7-DOF **Franka Panda** arm and a **differential-drive mobile base** in real time, with forward/inverse kinematics, trajectory recording, and keyboard/gamepad control.

---

## Features

| Feature | Status |
|---|---|
| Forward kinematics (DH, 7-DOF Franka) | Working |
| FK via GLB hierarchy (Three.js) | Working |
| Inverse kinematics (DLS Jacobian) | Working |
| Differential-drive base kinematics | Working |
| GLB model rendering (`ridgeback_franka.glb`) | Working |
| Keyboard drive (WASD / Arrow keys) | Working |
| Gamepad drive (left-stick analog) | Working |
| Joint slider control | Working |
| Trajectory / trail visualisation | Working |
| End-effector frame overlay | Working |
| Performance monitor (FPS, frame time, GPU stats) | Working |
| Collision detection | Stub — not implemented |
| Path planning | Stub — not implemented |

---

## Prerequisites

- **Node.js** ≥ 20 (LTS recommended)
- **npm** ≥ 9

---

## Quick start

```bash
# Install dependencies
npm install

# Start the Vite dev server (http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in a modern browser (Chrome / Firefox / Edge recommended).

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and produce a production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run type-check` | Run `tsc --noEmit` (no output, errors only) |
| `npm run lint` | Run ESLint across the codebase |
| `npm run lint:fix` | Auto-fix lint issues where possible |
| `npm run format` | Format all source files with Prettier |
| `npm run format:check` | Verify formatting without writing changes |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run the full test suite once and exit |
| `npm run test:ui` | Open the Vitest browser UI |
| `npm run test:coverage` | Produce an HTML + JSON coverage report in `coverage/` |

---

## Project structure

```
src/
├── simulation/       # Pure-TS simulation core — no React, no Three.js
│   ├── core/         #   Engine, Clock, EventBus
│   ├── kinematics/   #   DH params, FK (computeFKInto), IK (DLS Jacobian)
│   ├── robots/       #   FrankaArm, DifferentialDrive (implement Robot interface)
│   ├── systems/      #   InputSystem, KinematicsSystem, TrajectorySystem (+ stubs)
│   ├── types/        #   Command, RobotState, WorldSnapshot
│   └── world/        #   SimulationWorld, Obstacle
├── rendering/        # React-Three-Fiber scene
│   ├── robots/       #   RobotLoader (GLB-based)
│   ├── scene/        #   SceneRoot (Canvas), CameraController, Environment
│   ├── overlays/     #   TrajectoryLine, CoordinateFrame, EndEffectorFrame
│   ├── hooks/        #   useSimulationFrame, useRobotGeometry, useRobotLoader
│   └── utils/        #   traverseHierarchy, nodeRegistry
├── store/            # Zustand stores
│   ├── robotStore.ts          #   joint angles, end-effector pose, base pose
│   ├── simulationStore.ts     #   running / paused / speed / mode
│   ├── manipulatorStore.ts    #   GLB joint descriptors
│   ├── rendererStore.ts       #   GPU draw-call stats
│   ├── metricsStore.ts        #   FPS / frame-time (plain pub-sub, no Zustand)
│   └── selectors/             #   robotSelectors (joint limit warnings, EE label)
├── ui/               # Ant Design panels and layout
│   ├── components/   #   ErrorBoundary
│   ├── layout/       #   AppLayout
│   └── panels/       #   ManipulatorControls, TelemetryPanel, PerformanceMonitor
├── input/            # KeyboardController, GamepadController, InputMapper
├── hooks/            # useSimulation, useRobotCommands
├── config/           # SimulationConfig, robot JSON configs, validation
└── workers/          # ik.worker.ts, planner.worker.ts (stubs, Comlink-ready)
public/
└── models/           # Static GLB assets (ridgeback_franka.glb)
docs/
├── PROJECT_CONTEXT.md   # Tech stack, repo layout, feature state
├── ARCHITECTURE.md      # Layering rules, data-flow diagram, invariants
├── KNOWN_ISSUES.md      # Confirmed bugs and their fix status
├── SESSION_SUMMARY.md   # One-paragraph orientation for new agents
└── TASK_BACKLOG.md      # Prioritised work items
```

---

## Architecture invariants

1. `src/simulation/` is **framework-free** — no React, no Three.js, no browser APIs.
2. The engine is a **module-level singleton** — only one simulation world at a time (SCALE-1).
3. Input is **sampled inside `useSimulationFrame`** (R3F `useFrame`) — the RAF loop is unified.
4. `dhTransforms` elements are **reused buffers** — consumers that need a stable snapshot across ticks must copy the values (`[...transform]`), not just capture the reference.
5. System execution order is **InputSystem → KinematicsSystem → TrajectorySystem**; wrong order silently breaks physics.
6. Robot commands are **discriminated unions** — the `type` field is the only dispatch key.
7. The scene renders the GLB model via `MovingRobot` in `SceneRoot`; `FRANKA_ID` and `DIFF_DRIVE_ID` constants come from the JSON config files.

---

## Controls

| Input | Action |
|---|---|
| `W` / `↑` | Drive forward |
| `S` / `↓` | Drive backward |
| `A` / `←` | Turn left |
| `D` / `→` | Turn right |
| Gamepad left stick | Analog drive (deadzone 0.15) |
| Joint sliders (sidebar) | Set Franka joint angles |
| IK target (sidebar) | Solve to end-effector pose |

---

## Running tests

```bash
npm run test:run          # one-shot, all 279 tests
npm run test              # watch mode
npm run test:coverage     # HTML report → coverage/index.html
```

Tests cover: FK (DH + in-place), IK solver, DiffDrive kinematics, EventBus, InputSystem, TrajectorySystem (ring buffer), stores, InputMapper, GamepadController, config validation.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, coding conventions, PR checklist, and architectural rules.
