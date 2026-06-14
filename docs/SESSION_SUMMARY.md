# Session Summary

> One-paragraph orientation for a new agent entering this codebase.

## What This Project Is

A browser-based 3D robotics simulator built with React 18 + TypeScript + Three.js (@react-three/fiber). It visualizes two robots — a 7-DOF Franka Panda arm and a differential-drive mobile base — in real time. Forward kinematics, inverse kinematics, trajectory recording, and keyboard/UI control work. Collision detection and path planning are **stubbed but not implemented**.

## Current State (as of 2026-06-14)

| Area | Status |
|------|--------|
| Forward Kinematics (Franka, DH) | Working — standard DH, 7 joints; EE quaternion extracted via Shepperd |
| FK via GLB hierarchy (Three.js) | Working — `ForwardKinematicsSystem`; EE pose throttled to 10 Hz for sidebar |
| Differential Drive | Working — unicycle model; `dhTransforms[0]` reflects real world pose |
| 3D Rendering | Working — GLB model (`ridgeback_franka.glb`) via `RobotLoader` in `SceneRoot` |
| UI Controls | Working — joint sliders (`ManipulatorControls`), drive buttons, toolbar |
| Keyboard Input | Working — WASD/arrow keys at config-defined max speeds |
| Trajectory / Trail | Working — `Trail` component, ring buffer (O(1) push) |
| End-Effector Frame | Working — `EndEffectorFrame` overlay, imperative update per frame |
| Performance Monitor | Working — FPS is real wall-clock; direct DOM mutation, zero React re-renders |
| Inverse Kinematics | **Working** — DLS Jacobian pseudo-inverse; `SET_IK_TARGET` command wired end-to-end |
| EventBus | Working — `tick` + `reset` events; `getEventBus()` for subscribers |
| Collision Detection | **Stub — no-op system** |
| Path Planning | **Stub — no-op system** |
| Gamepad Input | **Stub — no-op controller** |
| Tests | 230 passing — IK (8), FK (28), DiffDrive (23), FrankaArm (25), integration (39), systems, stores |

## Key Invariants Every Agent Must Know

1. `src/simulation/` is **framework-free** — no React, no Three.js, no browser APIs.
2. The engine is a **module-level singleton** — only one simulation world at a time.
3. **RAF loops never trigger React re-renders directly** — state is mirrored into `ref` via Zustand vanilla `subscribe()`.
4. System execution order is **InputSystem → KinematicsSystem → TrajectorySystem**; wrong order silently breaks physics.
5. Robot commands are **discriminated unions** — `type` field is the only dispatch key.
6. The scene now renders the GLB model via `MovingRobot` in `SceneRoot`; primitive `FrankaArmMesh` is still present but not mounted in the active scene.

## Files an Agent Must Read Before Any Task

See [README.md](README.md) for the authoritative pre-task reading list.

## Known Blockers

- No P0 blockers.
- Visual link lengths hardcoded separately from DH params (INC-1, T-010) — low priority, GLB is now primary renderer
- Robot JSON configs have no schema validation at parse time (T-015)
