# AI Agent Behavior Guide

> Rules and conventions an AI coding agent must follow when working in this codebase.

## Pre-Task Checklist

Before writing any code, read these files in order:

1. [SESSION_SUMMARY.md](SESSION_SUMMARY.md) — current project state
2. [TASK_BACKLOG.md](TASK_BACKLOG.md) — verify task exists and is not blocked
3. [ARCHITECTURE.md](ARCHITECTURE.md) — system design and invariants
4. Relevant source file(s) for the task area

---

## Strict Rules

### Simulation Core (`src/simulation/`)

- **NO React imports.** No `useState`, `useEffect`, no JSX.
- **NO Three.js imports.** No `Vector3`, `Matrix4`, `Quaternion`.
- **NO browser APIs.** No `window`, `document`, `localStorage`, `navigator`.
- All math must use plain TypeScript arrays and the `Mat4` type.

### State Updates

- **Never call Zustand setters from inside `src/simulation/`.** Stores are updated only via the `onSnapshot` callback in `SimulationEngine`.
- **Never subscribe to Zustand inside RAF loops directly.** Mirror state to a `ref` via vanilla `subscribe()` first.

### Command Dispatch

- All robot commands flow through `world.enqueueCommand()` → `InputSystem.tick()`.
- Never call `robot.applyCommand()` directly from React components.
- New command types must be added to the `Command` discriminated union in `src/simulation/types/Command.ts` AND handled in `InputSystem.tick()`.

### System Order

When adding a new ECS system, register it in `SimulationEngine` in this order:
```
InputSystem → KinematicsSystem → TrajectorySystem → [new system]
```
Systems that read state set by earlier systems must come after them.

### Robot IDs

- Franka arm ID: `'franka_panda'` (from config JSON)
- Diff drive ID: `'diff_drive'` (from config JSON)
- Do not hardcode these strings outside `src/config/robots/`. Use the loaded config object.

---

## Conventions

### Naming

| Pattern | Use for |
|---------|---------|
| `use*` | React hooks only |
| `*System` | ECS tick systems |
| `*Store` | Zustand stores |
| `*Controller` | Input controllers |
| `*Panel` | UI sidebar panels |

### Matrix Convention

- Row-major 4×4 homogeneous transform as `readonly number[]` of length 16.
- Layout: `[r00, r01, r02, tx, r10, r11, r12, ty, r20, r21, r22, tz, 0, 0, 0, 1]`
- Translation is at indices 3, 7, 11.

### Quaternion Convention

- Order: `[x, y, z, w]` (matches `Pose3D.quaternion`).

### Units

| Quantity | Unit |
|----------|------|
| Position | meters |
| Angle | radians |
| Angular velocity | rad/s |
| Linear velocity | m/s |
| Time | seconds |

---

## What NOT to Do

- Do not add React state (`useState`) to components that can read from Zustand instead.
- Do not allocate new `Matrix4` / `Vector3` objects inside render loops — mutate existing refs.
- Do not use `splice()` in hot paths — prefer ring-buffer indexing.
- Do not add `console.log` in production paths (RAF callbacks, `tick()`).
- Do not add features beyond what the task requires (no speculative abstractions).
- Do not write comments that describe what the code does — only write comments for non-obvious WHY.

---

## Post-Task Checklist

After writing code:

1. Run `npm run type-check` — zero errors required.
2. Run `npm run lint` — zero warnings required.
3. If a stub was implemented: remove `throw new Error("not implemented")` guard.
4. If a new command type was added: update `TASK_BACKLOG.md` (T-001/T-002 pattern) and `API_CONTRACTS.md`.
5. If a store field was added/changed: update `STATE_MANAGEMENT.md`.
6. If a component was added/changed: update `COMPONENT_REGISTRY.md`.
7. Mark the task as Completed in `TASK_BACKLOG.md`.

---

## Inferred Patterns

> [INFERRED] These are patterns observed in the codebase but not explicitly documented by the original author.

- R3F components use `matrixAutoUpdate={false}` + direct `matrix` prop to avoid Three.js auto-decompose overhead.
- Zustand slice files follow: define interface → create store → export typed hooks.
- `subscribeWithSelector` middleware is used on all stores defensively, even where unused today.
