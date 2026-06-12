# Database Schema

> This project has **no backend database**. It is a static client-side application.

## Persistent Storage

The only persistence is browser `localStorage` via Zustand's `persist` middleware.

### Key: `robotics-sim-scene`

Stores `sceneStore` state. Serialized as JSON.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showGrid` | `boolean` | `true` | Infinite grid visible |
| `showCoordinateFrames` | `boolean` | `true` | RGB axis lines per joint |
| `showTrajectory` | `boolean` | `true` | End-effector path polyline |
| `showBoundingBoxes` | `boolean` | `false` | Bounding box overlays |
| `cameraPreset` | `'perspective'\|'top'\|'front'\|'side'` | `'perspective'` | Active camera view |
| `ikTarget` | `Pose3D \| null` | `null` | IK goal pose (unused) |

**Not persisted:** `simulationStore` and `robotStore` — start fresh on every page load.

## In-Memory Runtime State

### Robot State (per robot, updated 60 Hz)

| Field | Type | Description |
|-------|------|-------------|
| `jointStates` | `JointState[]` | Angle, velocity, torque per joint |
| `basePose` | `Pose2D` | DiffDrive: x, y, theta |
| `endEffectorPose` | `Pose3D` | Position + quaternion of end-effector |
| `dhTransforms` | `Mat4[]` | Cumulative FK transforms (one per joint) |

### Trajectory Buffer (per robot)

| Field | Type | Capacity | Description |
|-------|------|----------|-------------|
| `trajectories[robotId]` | `Pose3D[]` | 2000 poses | Ring buffer; oldest pruned at cap |

The 1mm deadband (`1e-6 m²` squared-distance threshold) filters stationary poses.

## Assumptions / Unknowns

- [INFERRED] `localStorage` key name `'robotics-sim-scene'` is set in `src/store/sceneStore.ts`. If key changes, persisted state is silently dropped (no migration).
- No versioning on the persisted schema. Breaking changes to `sceneStore` fields require clearing `localStorage` or adding a migration step to the `persist` config.
