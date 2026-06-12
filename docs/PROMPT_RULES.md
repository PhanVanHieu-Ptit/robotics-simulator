# PROMPT_RULES.md

Rules for AI code generation in this codebase. Follow all of these before writing any code.

---

## Invariants — Never Violate

### INV-1: Simulation core has zero browser/React/Three dependencies
`src/simulation/**` must not import from React, Three.js, `@react-three/*`, Zustand, or DOM APIs. It runs in Node for tests.

### INV-2: Rendering components read state; they never write it
`src/rendering/**` reads Zustand stores and dispatches commands via `useRobotCommands()`. It never imports `SimulationEngine`, `SimulationWorld`, or any robot model directly.

### INV-3: Commands are the only write path into simulation
External code (UI, keyboard, IK targets) must go through `world.enqueueCommand(cmd)`. Direct mutation of `robot.state` or `_angles` from outside `Robot` is forbidden.

### INV-4: System ordering is the contract — document changes
If you add, remove, or reorder a System in `createEngine()`, update `ARCHITECTURE.md §System execution order` in the same commit.

### INV-5: All TypeScript is strict — no `any`, no `as unknown as`
`noUncheckedIndexedAccess` is on. Array access returns `T | undefined`. Handle it. The only existing `as unknown as` is in `ForwardKinematics.ts` for the `Mat4` tuple cast — do not add more.

### INV-6: New robots require a JSON config file
Robot parameters belong in `src/config/robots/<id>.json`. Hardcoded numeric literals for DH params, joint limits, or kinematic constants in `.ts` files are rejected.

---

## Anti-Patterns — Avoid in New Code

### AP-1: Do not add new hard-coded robot ID strings outside config
Robot IDs (`'franka_panda'`, `'diff_drive'`) are already scattered as string literals in `robotStore.ts` and `DifferentialDriveRobot.tsx`. Do not spread this further. When adding a new robot, derive the ID from the imported JSON config.

### AP-2: Do not create new `new THREE.Matrix4()` inside React render
`toThreeMatrix()` in `FrankaArm.tsx` allocates a new object every render frame. For new mesh components, prefer `ref.current.matrix.set(...)` on a pre-allocated matrix or use `useMemo`.

### AP-3: Do not use multiple store selectors for the same robot in one component
`DiffDriveRobot` calls `useRobotStore` three times. Each subscription is a separate re-render trigger. Select a single derived object instead.

### AP-4: Do not implement IK or planning on the main thread
Both must go through `workers/ik.worker.ts` / `workers/planner.worker.ts` via Comlink. Inline IK loops will block the render loop at 60 Hz.

### AP-5: Do not use `splice` for ring-buffer trimming
`TrajectorySystem` uses `splice(0, n)` which is O(n). New buffer-backed data structures should use a proper ring buffer with head/tail pointers.

### AP-6: Do not add EventBus wiring without updating all subscribers
`EventBus<SimulationEvents>` is defined but never instantiated or connected to the engine. If you wire it, you must also handle `collision` and `trajectoryUpdated` events in at least one consumer, or the emit calls are dead code.

---

## Patterns — Use These

### PAT-1: Add new systems by implementing `System` interface
```ts
export class MySystem implements System {
  tick(world: SimulationWorld, dt: number): void { ... }
}
```
Then register it in `createEngine()` at the correct pipeline position.

### PAT-2: Store subscriptions in render-loop hooks must use `ref` pattern
```ts
const activeRef = useRef(false)
useEffect(() => {
  const unsub = useStore.subscribe((s) => { activeRef.current = s.someFlag })
  return unsub
}, [])
```
Never call `useStore()` inside `useFrame` or a `requestAnimationFrame` callback.

### PAT-3: New UI panels subscribe via fine-grained selectors
```ts
// Good
const simTime = useSimulationStore((s) => s.simTime)

// Bad — subscribes to entire store, re-renders on any change
const store = useSimulationStore()
```

### PAT-4: Commands use the discriminated union `Command` type
When adding a new command type, add it to `src/simulation/types/Command.ts` and handle it in `InputSystem.tick()`. Do not add command handling directly in robot `applyCommand` without a corresponding `Command` type.

### PAT-5: Memoize Three.js geometries with `useMemo`
```ts
const geometry = useMemo(
  () => new THREE.CylinderGeometry(r, r, length, 16),
  [length, r],
)
```
See `useRobotGeometry.ts` for the established pattern.

### PAT-6: Robot configs are imported as typed JSON
```ts
import frankaConfig from '@config/robots/franka_panda.json'
// Use frankaConfig.id, frankaConfig.dhParams, etc. — no string literals
```

---

## Test Conventions

- Unit tests live adjacent to source files or in `src/test/`
- Simulation core is testable without jsdom — avoid `environment: 'jsdom'` for `src/simulation/**` tests
- Robot models should be tested by calling `applyCommand()` + `step(dt)` and asserting `robot.state`
- Do not mock `SimulationEngine` — test systems directly with a real `SimulationWorld`

---

## What Is Currently Broken by Design

| Symbol | File | Behavior |
|---|---|---|
| `solveIK()` | `InverseKinematics.ts` | `throw Error` — expected |
| `ik.worker.ts:solve()` | `workers/ik.worker.ts` | `throw Error` — expected |
| `planner.worker.ts:plan()` | `workers/planner.worker.ts` | `throw Error` — expected |
| `CollisionSystem.tick()` | `systems/CollisionSystem.ts` | no-op — expected |
| `PathPlannerSystem.tick()` | `systems/PathPlannerSystem.ts` | no-op — expected |
| `GamepadController` | `input/GamepadController.ts` | returns zero input — expected |

Do not add try/catch to suppress these throws. They are intentional sentinels.
