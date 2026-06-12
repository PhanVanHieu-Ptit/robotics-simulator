# API Contracts

> There is no HTTP API. This document covers the internal simulation API: command types, system interfaces, engine interface, and store interfaces.

## Command System (Discriminated Union)

All robot control flows through `Command` type in `src/simulation/types/Command.ts`.

### `DriveCommand`

```ts
{ type: 'DRIVE'; linear: number; angular: number }
```

| Field | Unit | Clamped By |
|-------|------|------------|
| `linear` | m/s | `DifferentialDrive.maxLinearVel` (2.0) |
| `angular` | rad/s | `DifferentialDrive.maxAngularVel` (π) |

> [INFERRED] `DRIVE` has no `robotId` — currently targets all robots. See BUG-3 / T-011.

---

### `JointCommand`

```ts
{ type: 'SET_JOINT'; robotId: string; index: number; angle: number }
```

| Field | Values | Notes |
|-------|--------|-------|
| `robotId` | `'franka_panda'` | Only Franka responds to this command |
| `index` | `0–6` | Joint index |
| `angle` | radians | Clamped to `dhParams[index]` limits |

---

### `IKCommand`

```ts
{ type: 'SET_IK_TARGET'; robotId: string; target: Pose3D }
```

> **Status: STUB** — `IKCommand` exists in the type union but is not handled by `InputSystem`. `solveIK()` throws. See T-001, T-002.

---

### `ResetCommand`

```ts
{ type: 'RESET' }
```

Calls `robot.reset()` on all robots. Restores initial joint angles and clears base pose.

---

## Engine Interface

File: `src/simulation/core/SimulationEngine.ts`

```ts
class SimulationEngine {
  tick(wallDt: number): void         // Called by R3F useFrame; applies speed multiplier
  addRobot(robot: Robot): void       // Registers robot + creates trajectory buffer
  removeRobot(id: string): void      // Deregisters robot
  get world(): SimulationWorld       // Access command queue and robot registry
  onSnapshot: (snap: WorldSnapshot) => void  // Callback; set by useSimulationFrame
}
```

Singleton access: `getEngine()` from `src/hooks/useSimulation.ts`.

---

## System Interface

File: `src/simulation/systems/System.ts`

```ts
interface System {
  tick(world: SimulationWorld, dt: number): void
}
```

All ECS systems implement this interface. Execution order in engine:
1. `InputSystem`
2. `KinematicsSystem`
3. `TrajectorySystem`

---

## Robot Interface

File: `src/simulation/robots/Robot.ts`

```ts
interface Robot {
  id: string
  applyCommand(cmd: Command): void   // Buffers target (does not mutate state)
  step(dt: number): void             // Physics integration; mutates robot.state
  reset(): void                      // Restore initial configuration
  get state(): RobotState            // Current snapshot (read-only)
  trajectoryBuffer: Pose3D[]         // End-effector path (mutated by TrajectorySystem)
}
```

---

## WorldSnapshot (Engine Output)

File: `src/simulation/types/WorldSnapshot.ts`

```ts
interface WorldSnapshot {
  simTime: number                              // Accumulated simulation seconds
  frameTime: number                            // Wall-clock ms for this tick
  robots: Record<string, RobotState>           // State per robot ID
  trajectories: Record<string, Pose3D[]>       // Path history per robot ID
}
```

Emitted every tick via `engine.onSnapshot`. Consumed by `useSimulationFrame` to update Zustand stores.

---

## Zustand Store Actions

### `simulationStore`

| Action | Signature | Effect |
|--------|-----------|--------|
| `setRunning` | `(v: boolean) => void` | Toggle engine running |
| `setPaused` | `(v: boolean) => void` | Toggle pause |
| `setSpeed` | `(s: SpeedOption) => void` | Set speed multiplier |
| `setSimTime` | `(t: number) => void` | Update sim clock |
| `setFrameTime` | `(ms: number) => void` | Update last tick duration |

### `robotStore`

| Action | Signature | Effect |
|--------|-----------|--------|
| `setJointAngles` | `(angles: number[]) => void` | Update Franka joint angles |
| `setDhTransforms` | `(mats: Mat4[]) => void` | Update FK transform array |
| `setEndEffectorPose` | `(pose: Pose3D) => void` | Update EE pose |
| `setBasePose` | `(pose: Pose2D) => void` | Update DiffDrive base |
| `setTrajectories` | `(Record<id, Pose3D[]>) => void` | Replace trajectory buffers |
| `setRobotSnapshot` | `(id, state) => void` | Store raw `RobotState` |

### `sceneStore`

| Action | Signature | Effect |
|--------|-----------|--------|
| `setShowGrid` | `(v: boolean) => void` | Toggle grid |
| `setShowCoordinateFrames` | `(v: boolean) => void` | Toggle axis overlays |
| `setShowTrajectory` | `(v: boolean) => void` | Toggle trajectory line |
| `setShowBoundingBoxes` | `(v: boolean) => void` | Toggle bounding boxes |
| `setCameraPreset` | `(p: CameraPreset) => void` | Change camera position |
| `setIkTarget` | `(pose: Pose3D \| null) => void` | Set IK goal |

---

## DH Parameter Schema

File: `src/config/robots/franka_panda.json`

```json
{
  "dhParams": [
    { "a": 0, "d": 0.333, "alpha": 0, "thetaOffset": 0 }
  ],
  "jointLimits": [
    { "min": -2.897, "max": 2.897 }
  ],
  "initialAngles": [0, -0.785, 0, -2.356, 0, 1.571, 0.785]
}
```

> [INFERRED] No runtime JSON schema validation — malformed config produces silent wrong behavior.

## Differential Drive Config Schema

File: `src/config/robots/differential_drive.json`

```json
{
  "wheelBase": 0.5,
  "wheelRadius": 0.1,
  "maxLinearVel": 2.0,
  "maxAngularVel": 3.14159
}
```
