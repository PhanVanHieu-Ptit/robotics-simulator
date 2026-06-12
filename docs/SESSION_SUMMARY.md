# Session Summary

> One-paragraph orientation for a new agent entering this codebase.

## What This Project Is

A browser-based 3D robotics simulator built with React 18 + TypeScript + Three.js (@react-three/fiber). It visualizes two robots — a 7-DOF Franka Panda arm and a differential-drive mobile base — in real time. Forward kinematics, trajectory recording, and keyboard/UI control work. Inverse kinematics, collision detection, and path planning are **stubbed but not implemented**.

## Current State (as of 2026-06-12)

| Area | Status |
|------|--------|
| Forward Kinematics (Franka) | Working — standard DH, 7 joints |
| Differential Drive | Working — unicycle model |
| 3D Rendering | Working — R3F canvas, meshes, overlays |
| UI Controls | Working — sliders, drive buttons, toolbar |
| Keyboard Input | Working — WASD/arrow keys |
| Trajectory Visualization | Working — polyline, ring buffer |
| Inverse Kinematics | **Stub — throws on call** |
| Collision Detection | **Stub — no-op system** |
| Path Planning | **Stub — no-op system** |
| Gamepad Input | **Stub — no-op controller** |
| Tests | **None committed** (infrastructure ready) |

## Key Invariants Every Agent Must Know

1. `src/simulation/` is **framework-free** — no React, no Three.js, no browser APIs.
2. The engine is a **module-level singleton** — only one simulation world at a time.
3. **RAF loops never trigger React re-renders directly** — state is mirrored into `ref` via Zustand vanilla `subscribe()`.
4. System execution order is **InputSystem → KinematicsSystem → TrajectorySystem**; wrong order silently breaks physics.
5. Robot commands are **discriminated unions** — `type` field is the only dispatch key.

## Files an Agent Must Read Before Any Task

See [README.md](README.md) for the authoritative pre-task reading list.

## Known Blockers

- IK solver missing → `IKCommand` type exists but goes nowhere
- End-effector quaternion always `[0,0,0,1]` (BUG-1)
- Visual link lengths hardcoded separately from DH params (INC-1)
- No test files committed yet despite full test infrastructure
