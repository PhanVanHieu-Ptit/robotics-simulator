# Session Summary

> One-paragraph orientation for a new agent entering this codebase.

## What This Project Is

A browser-based 3D robotics simulator built with React 18 + TypeScript + Three.js (@react-three/fiber). It visualizes two robots — a 7-DOF Franka Panda arm and a differential-drive mobile base — in real time. Forward kinematics, trajectory recording, and keyboard/UI control work. Inverse kinematics, collision detection, and path planning are **stubbed but not implemented**.

## Current State (as of 2026-06-13)

| Area | Status |
|------|--------|
| Forward Kinematics (Franka) | Working — standard DH, 7 joints; EE quaternion extracted via Shepperd |
| Differential Drive | Working — unicycle model; keyboard speed now from config |
| 3D Rendering | Working — R3F canvas, meshes, overlays |
| UI Controls | Working — sliders, drive buttons, toolbar |
| Keyboard Input | Working — WASD/arrow keys at config-defined max speeds |
| Trajectory Visualization | Working — polyline, ring buffer |
| Performance Monitor | Working — FPS now real wall-clock (was physics tick time) |
| GLB Model Loading | Built — `RobotLoader` + `useRobotLoader`; not yet wired into scene (T-021) |
| Inverse Kinematics | **Stub — throws on call** |
| Collision Detection | **Stub — no-op system** |
| Path Planning | **Stub — no-op system** |
| Gamepad Input | **Stub — no-op controller** |
| Tests | 196 passing — FK (28), DiffDrive (20), FrankaArm (25), systems, stores, integration |

## Key Invariants Every Agent Must Know

1. `src/simulation/` is **framework-free** — no React, no Three.js, no browser APIs.
2. The engine is a **module-level singleton** — only one simulation world at a time.
3. **RAF loops never trigger React re-renders directly** — state is mirrored into `ref` via Zustand vanilla `subscribe()`.
4. System execution order is **InputSystem → KinematicsSystem → TrajectorySystem**; wrong order silently breaks physics.
5. Robot commands are **discriminated unions** — `type` field is the only dispatch key.

## Files an Agent Must Read Before Any Task

See [README.md](README.md) for the authoritative pre-task reading list.

## Known Blockers

- IK solver missing → `IKCommand` type exists but goes nowhere (T-001, T-002)
- Visual link lengths hardcoded separately from DH params (INC-1, T-010)
- `DRIVE` commands broadcast to all robots, not just diff_drive (BUG-3, T-011)
- `toThreeMatrix()` allocates new Matrix4 every frame — GC pressure (PERF-1, T-006)
