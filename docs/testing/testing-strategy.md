# Testing Strategy — Robotics Simulator

## 1. Philosophy

The simulator has three distinct computational zones with different testing needs:

| Zone | Description | Test approach |
|------|-------------|---------------|
| **Simulation core** | Pure TypeScript ECS — no React, no Three.js | Pure unit tests. Full coverage is cheap and catches physics regressions. |
| **State management** | Zustand stores — side-effect-free | Unit tests against store actions/selectors directly. |
| **React + R3F layer** | Hooks, components, rendering | Narrow integration tests; avoid testing Three.js internals. E2E for the user-visible golden path only. |

Key principle: **test the contracts between layers, not the internals of a layer.** The critical contracts are:

1. `SimulationEngine.tick()` → calls `onSnapshot()` with a valid `WorldSnapshot`
2. `onSnapshot()` → `robotStore.applySnapshot()` updates all store fields correctly
3. `robotStore.dhTransforms` → `FrankaArmMesh` applies each transform to the correct mesh group
4. `KeyboardController` → `InputMapper` → `CommandQueue` → `robot.applyCommand()`
5. `ForwardKinematicsSystem.registerNodes()` → `computeFK()` reads correct node

---

## 2. Risk-Based Priority Map

Ranked highest risk first. Test these first; skip low-risk items when time is short.

### P0 — Must have (simulation correctness)

| Module | Why it is P0 |
|--------|-------------|
| `ForwardKinematics.ts` — `computeFK`, `dhTransform`, `mat4Multiply` | Pure math. A wrong DH matrix silently produces wrong joint poses everywhere. |
| `SimulationClock.ts` — `advance`, `setSpeed` | Wrong time scaling cascades through every physics system. |
| `TrajectorySystem.ts` — `PositionRingBuffer`, deadband | Data loss or corruption in the trajectory buffer is invisible until rendering breaks. |
| `DifferentialDrive.ts` — `step` | Bicycle kinematics used for the moving robot; wrong math causes wrong path. |
| `DifferentialDriveSystem.ts` — `tick`, acceleration ramp | Separate from the robot class; smooth ramp + angle wrap. |
| `FrankaArm.ts` — `applyCommand`, joint clamping | Joint limits protect hardware; unclamped values can break FK chain. |
| `robotStore.ts` — `applySnapshot` | The single write point for all robot state; if this is wrong, rendering is wrong. |

### P1 — Should have (integration correctness)

| Module | Why it is P1 |
|--------|-------------|
| `SimulationEngine.ts` — full tick cycle | Verifies ECS system ordering and snapshot propagation end-to-end. |
| `InputSystem.ts` — command routing | Wrong robot receives command → silent misbehavior. |
| `InputMapper.ts` — linear/angular mapping | Physics constants used here must be stable. |
| `KeyboardController.ts` — mount/unmount | Listener leaks cause duplicate key events. |
| `useSimulation` hook | Engine lifecycle (create → tick → reset → recreate). |
| `robotSelectors.ts` — `useJointLimitWarnings` | Derived state used in UI warnings. |
| `traverseHierarchy.ts` — joint detection regex | Wrong joint detection breaks entire FK pipeline. |

### P2 — Nice to have (UI + edge cases)

| Module | Why it is P2 |
|--------|-------------|
| `ManipulatorSystem.ts` — `applyAngles` | Assumes Y-axis; easy to verify with a mock THREE.Object3D. |
| `sceneStore.ts` — localStorage persistence | Regression-prone across upgrades. |
| `SimulationWorld.ts` — `flushCommands`, `reset` | Container logic; low complexity but used by every system. |
| `EventBus.ts` — subscribe/emit/clear | Used by future systems; small but critical. |
| `useRobotMotion` hook | Kinematics-rendering sync; integration test with mocked `useFrame`. |
| UI components — `JointSlider`, `VectorDisplay` | Smoke tests only; no logic. |
| `PerformanceMonitor` | Display-only; snapshot test sufficient. |

---

## 3. What Must Have Unit Tests

All of the following are pure TypeScript with zero React/Three.js dependencies — they are the easiest and most valuable tests in the codebase.

### 3.1 Kinematics math

**`src/simulation/kinematics/ForwardKinematics.ts`**

```
dhTransform(param, theta)
  ✓ identity when a=d=alpha=thetaOffset=theta=0
  ✓ pure Z rotation when only theta varies
  ✓ pure X rotation when only alpha varies
  ✓ translation along X when only a is non-zero
  ✓ translation along Z when only d is non-zero
  ✓ combined DH transform matches known analytical result

mat4Multiply(a, b)
  ✓ identity × identity = identity
  ✓ non-commutative: A × B ≠ B × A
  ✓ associative: (A × B) × C = A × (B × C)

computeFK(dhParams, angles)
  ✓ empty params returns empty transforms
  ✓ single joint: transform = dhTransform(params[0], angles[0])
  ✓ N joints: transforms[i] is cumulative (not local) — transforms[i] = T0·T1·…·Ti
  ✓ 7-DOF Franka at zero angles: EE position matches known home pose (reference from literature)
  ✓ joint angle change propagates only to downstream transforms
```

### 3.2 Simulation clock

**`src/simulation/core/SimulationClock.ts`**

```
advance(rawDelta)
  ✓ simTime increases by dt × speedMultiplier
  ✓ rawDelta > maxDt is clamped to maxDt × speedMultiplier
  ✓ rawDelta of 0 does not advance time
  ✓ called 3× at fixedDt → simTime ≈ 3 × fixedDt

setSpeed(multiplier)
  ✓ values below 0.25 clamped to 0.25
  ✓ values above 4 clamped to 4
  ✓ 0.5× speed: same delta produces half the time advance

reset()
  ✓ simTime returns to 0
  ✓ speedMultiplier is preserved
```

### 3.3 Ring buffer and trajectory deadband

**`src/simulation/systems/TrajectorySystem.ts`** — `PositionRingBuffer`

```
PositionRingBuffer
  ✓ push to empty buffer: length = 1
  ✓ push up to capacity: length = capacity
  ✓ push beyond capacity: length stays at capacity (oldest overwritten)
  ✓ writeTo(array): linearises oldest-first
  ✓ writeTo after overflow: no stale entries
  ✓ clear(): length = 0

TrajectorySystem.tick()
  ✓ movement < 1 mm: buffer not updated
  ✓ movement ≥ 1 mm: new pose appended
  ✓ trajectories sync'd to robot.trajectoryBuffer
```

### 3.4 Robot models

**`src/simulation/robots/FrankaArm.ts`**

```
applyCommand — SET_JOINT
  ✓ valid index + angle within limits: angle stored
  ✓ angle above upper limit: clamped to upper limit
  ✓ angle below lower limit: clamped to lower limit
  ✓ wrong robotId: angle unchanged
  ✓ index out of range: no crash

applyCommand — DRIVE
  ✓ ignored by FrankaArm (no-op)

step(dt)
  ✓ returns RobotState with id = 'franka_panda'
  ✓ dhTransforms has length = 7
  ✓ endEffectorPose is non-null after step
  ✓ jointStates[i].angle matches last applied command

reset()
  ✓ all angles return to initialAngles
  ✓ dhTransforms recomputed from initialAngles
```

**`src/simulation/robots/DifferentialDrive.ts`**

```
applyCommand — DRIVE
  ✓ linear and angular stored
  ✓ linear above maxLinearVel clamped
  ✓ angular above maxAngularVel clamped

step(dt)
  ✓ stationary at dt=0: pose unchanged
  ✓ pure forward motion: x increases, y/theta unchanged
  ✓ pure rotation: theta changes, position approximately unchanged
  ✓ combined motion: bicycle model curvature (theta changes first, then x/y)
  ✓ wheel joint angles advance proportionally to linear velocity
  ✓ theta wraps within [-π, π]
```

### 3.5 Differential drive physics system

**`src/simulation/systems/DifferentialDriveSystem.ts`**

```
tick(dt)
  ✓ targetV = 0 after key release: v ramps to 0 over multiple ticks
  ✓ targetV = LINEAR_SPEED: v ramps up, never exceeds LINEAR_SPEED
  ✓ theta wrap: crosses π boundary and flips to -π
  ✓ frame-rate independence: 10× (dt/10) ≈ 1× dt (within 1% tolerance)
```

### 3.6 Input mapping

**`src/input/InputMapper.ts`**

```
mapInputToCommands(input)
  ✓ all false → []
  ✓ forward: linear = +LINEAR_SPEED
  ✓ backward: linear = -LINEAR_SPEED
  ✓ forward + backward simultaneously: net = 0, command still emitted? (define expected behaviour)
  ✓ left: angular = +ANGULAR_SPEED
  ✓ right: angular = -ANGULAR_SPEED
  ✓ returns DriveCommand with type 'DRIVE'
```

### 3.7 Event bus

**`src/simulation/core/EventBus.ts`**

```
  ✓ subscriber receives emitted event
  ✓ multiple subscribers all receive the event
  ✓ unsubscribe: subscriber no longer receives events
  ✓ off(): remove by handler reference
  ✓ clear(): all handlers removed
  ✓ emit with no subscribers: no crash
```

### 3.8 State stores

**`src/store/simulationStore.ts`**

```
  ✓ setRunning(true): isRunning = true
  ✓ setPaused(true) without setRunning: isPaused = true (define valid combos)
  ✓ setSpeed with valid option: speed updated
  ✓ setMode: mode updated
```

**`src/store/robotStore.ts`**

```
applySnapshot(snapshot)
  ✓ jointAngles updated from snapshot
  ✓ dhTransforms updated from snapshot
  ✓ endEffectorPose updated from snapshot
  ✓ basePose updated from snapshot
  ✓ trajectories[robotId] updated from snapshot
  ✓ unknown robotId: other robot data unchanged
  ✓ missing robotId in snapshot: store fields not reset to null

reset()
  ✓ all fields return to initial values
```

**`src/store/selectors/robotSelectors.ts`**

```
useJointLimitWarnings(robotId)
  ✓ angle within 0.05 rad of upper limit: warning = true
  ✓ angle within 0.05 rad of lower limit: warning = true
  ✓ angle safely inside limits: warning = false
```

### 3.9 SimulationWorld

**`src/simulation/world/SimulationWorld.ts`**

```
  ✓ addRobot: robot retrievable by id
  ✓ enqueueCommand: command in flushCommands()
  ✓ flushCommands: queue emptied after call
  ✓ reset: calls robot.reset() on all robots
  ✓ getTrajectories: returns all robot trajectory buffers
```

---

## 4. What Should Have Integration Tests

Integration tests wire two or more real modules together with minimal mocking. They catch contract mismatches that unit tests miss.

### 4.1 Full simulation tick cycle

Wire `SimulationEngine` + `SimulationWorld` + all systems + `FrankaArm` + `DifferentialDrive`. Call `engine.tick()` and verify the `onSnapshot` callback receives a fully-formed `WorldSnapshot`.

```
✓ tick() calls onSnapshot exactly once per call
✓ snapshot.simTime increases each tick
✓ snapshot.robots has keys 'franka_panda' and 'diff_drive'
✓ franka_panda dhTransforms length = 7
✓ DRIVE command applied before tick: diff_drive basePose.x changes
✓ SET_JOINT command applied before tick: franka jointAngles[i] changes
✓ RESET command: all poses return to initial
✓ 60 ticks at fixedDt=1/60: simTime ≈ 1.0s (±1ms)
```

### 4.2 Command pipeline: keyboard → robot

Wire `KeyboardController` + `InputMapper` + `useRobotCommands` mock + `SimulationWorld` + `InputSystem`.

```
✓ synthetic keydown W → InputMapper produces DRIVE command
✓ DRIVE command dispatched → world.commandQueue contains it
✓ InputSystem.tick() → robot receives DRIVE command
✓ keydown W then keyup W → stop command dispatched (linear=0)
```

### 4.3 robotStore.applySnapshot → rendering read

Wire `robotStore.applySnapshot()` with a known snapshot, then read the store selectors:

```
✓ applySnapshot with known dhTransforms → dhTransforms in store match
✓ applySnapshot with known basePose → basePose in store matches
✓ applySnapshot → useJointLimitWarnings() returns correct booleans
✓ applySnapshot called twice: second write overwrites first completely
```

### 4.4 traverseHierarchy + ManipulatorSystem.registerNodes

Create a minimal THREE.Object3D hierarchy with named nodes matching the joint regex, then wire `traverseHierarchy` → `registerNodes` → `applyAngles`.

```
✓ traverseHierarchy: nodes named 'joint_1', 'joint_2' detected as jointCandidates
✓ nodes NOT named 'joint_*' not classified as joint candidates
✓ registerNodes: all joint nodes present in nodeMap
✓ applyAngles({uuid: angle}): Object3D.rotation.y set to angle
✓ unregistered uuid: no crash
```

### 4.5 sceneStore persistence

```
✓ toggle showGrid → localStorage updated
✓ fresh store initialisation reads showGrid from localStorage
✓ corrupt localStorage value: store falls back to default
```

---

## 5. What Should Have E2E Tests

E2E tests run the full app in a real browser. They are slow and brittle; keep the suite small and focused on user-visible behaviour that cannot be verified at a lower level.

### Tool recommendation: Playwright

Playwright's ability to intercept Three.js canvas frames is limited, but it can verify UI state transitions, WebGL canvas mount, and user interactions with the sidebar controls.

### E2E test cases

```
App boots
  ✓ Canvas element is mounted and not blank (screenshot regression)
  ✓ Toolbar buttons are visible (Play, Pause, Stop)
  ✓ Sidebar is visible

Simulation controls
  ✓ Click Play → isRunning = true (verify by checking Pause button becomes enabled)
  ✓ Click Pause → isPaused = true (Play button becomes enabled again)
  ✓ Click Stop → simulation returns to initial state
  ✓ Speed selector: select 2× → label updates

Manipulator controls
  ✓ Move joint slider → joint angle display updates
  ✓ Joint at limit → warning indicator appears

Scene toggles
  ✓ Toggle "Show Grid" off → grid not visible (screenshot regression)
  ✓ Toggle "Show Trajectory" → trail appears after movement

Keyboard input
  ✓ Press W → differential drive robot moves forward (EE position changes in telemetry)
  ✓ Release W → robot decelerates and stops
```

---

## 6. Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| `src/simulation/kinematics/` | **95%** | Pure math; deterministic; wrong = silent pose corruption |
| `src/simulation/core/` | **90%** | Engine/clock/eventbus — small, pure, critical |
| `src/simulation/systems/` | **85%** | Systems are stateless; easy to cover; collision/planner stubs excluded |
| `src/simulation/robots/` | **85%** | Robot models are the other half of the physics contract |
| `src/store/` | **80%** | Stores are pure reducers; selectors are derived math |
| `src/input/` | **80%** | InputMapper is trivial; KeyboardController needs lifecycle tests |
| `src/rendering/hooks/` | **60%** | `useSimulationFrame` is a one-liner; `useRobotMotion` needs mocked `useFrame` |
| `src/rendering/` (components) | **40%** | Rendering correctness is visual; smoke tests only |
| `src/ui/` | **40%** | UI is thin; avoid testing Ant Design internals |
| **Overall** | **70%** | Weighted toward simulation core |

---

## 7. Recommended Tooling

### Already available (in package.json)

| Tool | Use |
|------|-----|
| **Vitest 2.x** | Test runner for all unit and integration tests |
| **@testing-library/react** | Hook tests via `renderHook`, component smoke tests |
| **@testing-library/jest-dom** | DOM assertion matchers |
| **jsdom** | DOM environment for non-Three.js tests |

### Add these

| Tool | Why |
|------|-----|
| **`@vitest/coverage-v8`** | Native V8 coverage — faster than c8, works with Vitest 2.x. Run with `vitest --coverage`. |
| **`three`** (already installed) | Import real `THREE.Object3D` in integration tests; no mock needed for geometry/rotation tests. |
| **Playwright** | E2E tests. Install with `npx playwright install`. |
| **`msw` (optional)** | If you add a backend API later; mock service worker for fetch-level mocking. |

### Do NOT add

- Jest — redundant with Vitest; causes config conflicts
- Enzyme — unmaintained; RTL is sufficient
- Cypress — slower than Playwright for this use case; no canvas support advantage

---

## 8. Folder Structure

```
src/
└── simulation/
    ├── kinematics/
    │   ├── ForwardKinematics.ts
    │   └── __tests__/
    │       └── ForwardKinematics.test.ts       ← P0 unit
    ├── core/
    │   ├── SimulationClock.ts
    │   ├── EventBus.ts
    │   └── __tests__/
    │       ├── SimulationClock.test.ts          ← P0 unit
    │       └── EventBus.test.ts                 ← P1 unit
    ├── systems/
    │   ├── TrajectorySystem.ts
    │   ├── DifferentialDriveSystem.ts
    │   ├── InputSystem.ts
    │   └── __tests__/
    │       ├── TrajectorySystem.test.ts         ← P0 unit
    │       ├── DifferentialDriveSystem.test.ts  ← P0 unit
    │       └── InputSystem.test.ts              ← P1 unit
    ├── robots/
    │   ├── FrankaArm.ts
    │   ├── DifferentialDrive.ts
    │   └── __tests__/
    │       ├── FrankaArm.test.ts                ← P0 unit
    │       └── DifferentialDrive.test.ts        ← P0 unit
    └── __integration__/
        └── simulation-tick.test.ts             ← P1 integration

src/
├── store/
│   ├── robotStore.ts
│   ├── simulationStore.ts
│   ├── sceneStore.ts
│   └── __tests__/
│       ├── robotStore.test.ts                  ← P0 unit
│       ├── simulationStore.test.ts             ← P1 unit
│       ├── sceneStore.test.ts                  ← P2 unit
│       └── robotSelectors.test.ts             ← P1 unit
├── input/
│   ├── InputMapper.ts
│   ├── KeyboardController.ts
│   └── __tests__/
│       ├── InputMapper.test.ts                 ← P1 unit
│       └── KeyboardController.test.ts          ← P1 unit
├── rendering/
│   └── utils/
│       ├── traverseHierarchy.ts
│       └── __tests__/
│           └── traverseHierarchy.test.ts       ← P1 integration
└── __integration__/
    ├── command-pipeline.test.ts                ← P1 integration
    └── snapshot-store.test.ts                  ← P1 integration

e2e/
├── playwright.config.ts
└── tests/
    ├── app-boot.spec.ts
    ├── simulation-controls.spec.ts
    ├── manipulator.spec.ts
    └── keyboard-input.spec.ts
```

---

## 9. Vitest Configuration

Update `vite.config.ts` (or `vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/simulation/**',
        'src/store/**',
        'src/input/**',
      ],
      exclude: [
        'src/simulation/systems/CollisionSystem.ts',
        'src/simulation/systems/PathPlannerSystem.ts',
        'src/simulation/kinematics/InverseKinematics.ts',
        'src/workers/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
      },
    },
  },
})
```

---

## 10. Example Test Cases

### Example A — `ForwardKinematics.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { dhTransform, computeFK, mat4Multiply } from '../ForwardKinematics'
import type { DHParam } from '../DHParameters'

const IDENTITY: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]

describe('dhTransform', () => {
  it('returns identity for all-zero params', () => {
    const param: DHParam = { a: 0, d: 0, alpha: 0, thetaOffset: 0 }
    const T = dhTransform(param, 0)
    T.forEach((v, i) => expect(v).toBeCloseTo(IDENTITY[i], 10))
  })

  it('pure Z rotation when only theta varies', () => {
    const param: DHParam = { a: 0, d: 0, alpha: 0, thetaOffset: 0 }
    const T = dhTransform(param, Math.PI / 2)
    expect(T[0]).toBeCloseTo(0, 10)   // cos(π/2)
    expect(T[1]).toBeCloseTo(-1, 10)  // -sin(π/2)
    expect(T[4]).toBeCloseTo(1, 10)   // sin(π/2)
    expect(T[5]).toBeCloseTo(0, 10)   // cos(π/2)
    expect(T[10]).toBeCloseTo(1, 10)  // no change in Z
  })
})

describe('computeFK', () => {
  it('each transform is cumulative, not local', () => {
    const params: DHParam[] = [
      { a: 0, d: 0.1, alpha: 0, thetaOffset: 0 },
      { a: 0, d: 0.1, alpha: 0, thetaOffset: 0 },
    ]
    const transforms = computeFK(params, [0, 0])
    // transforms[1] = T0 × T1 = translation [0, 0, 0.2]
    expect(transforms[1][11]).toBeCloseTo(0.2, 5)
  })
})
```

### Example B — `robotStore.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useRobotStore } from '../robotStore'
import type { WorldSnapshot } from '../../simulation/types/WorldSnapshot'

const makeSnapshot = (overrides = {}): WorldSnapshot => ({
  simTime: 1.0,
  frameTime: 0.016,
  robots: {
    franka_panda: {
      id: 'franka_panda',
      jointStates: Array(7).fill({ angle: 0.1, velocity: 0, torque: 0 }),
      basePose: { x: 0, y: 0, theta: 0 },
      endEffectorPose: { position: [0.3, 0.4, 0.5], quaternion: [0, 0, 0, 1] },
      dhTransforms: Array(7).fill(Array(16).fill(0)),
    },
  },
  trajectories: { franka_panda: [] },
  ...overrides,
})

beforeEach(() => {
  useRobotStore.getState().reset()
})

describe('applySnapshot', () => {
  it('updates jointAngles from snapshot', () => {
    useRobotStore.getState().applySnapshot(makeSnapshot())
    const angles = useRobotStore.getState().jointAngles
    expect(angles).toHaveLength(7)
    expect(angles[0]).toBe(0.1)
  })

  it('does not reset other robots when only one robot present in snapshot', () => {
    // pre-populate a second robot
    useRobotStore.setState({ robotSnapshots: { diff_drive: { basePose: { x: 5, y: 0, theta: 0 } } as any } })
    useRobotStore.getState().applySnapshot(makeSnapshot())
    expect(useRobotStore.getState().robotSnapshots['diff_drive']).toBeDefined()
  })
})
```

### Example C — `simulation-tick.test.ts` (integration)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { SimulationEngine } from '../../simulation/core/SimulationEngine'
import { SimulationWorld } from '../../simulation/world/SimulationWorld'
import { SimulationClock } from '../../simulation/core/SimulationClock'
import { FrankaArm } from '../../simulation/robots/FrankaArm'
import { DifferentialDrive } from '../../simulation/robots/DifferentialDrive'
import { InputSystem } from '../../simulation/systems/InputSystem'
import { KinematicsSystem } from '../../simulation/systems/KinematicsSystem'
import { TrajectorySystem } from '../../simulation/systems/TrajectorySystem'
import frankaConfig from '../../config/robots/franka_panda.json'
import driveConfig from '../../config/robots/differential_drive.json'

function buildEngine(onSnapshot = vi.fn()) {
  const world = new SimulationWorld()
  world.addRobot(new FrankaArm(frankaConfig))
  world.addRobot(new DifferentialDrive(driveConfig))
  const clock = new SimulationClock()
  const systems = [new InputSystem(), new KinematicsSystem(), new TrajectorySystem()]
  return new SimulationEngine(world, clock, systems, onSnapshot)
}

describe('SimulationEngine full tick cycle', () => {
  it('calls onSnapshot exactly once per tick', () => {
    const onSnapshot = vi.fn()
    const engine = buildEngine(onSnapshot)
    engine.tick(1 / 60)
    expect(onSnapshot).toHaveBeenCalledOnce()
  })

  it('snapshot contains both robots', () => {
    const onSnapshot = vi.fn()
    const engine = buildEngine(onSnapshot)
    engine.tick(1 / 60)
    const snapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots).toHaveProperty('franka_panda')
    expect(snapshot.robots).toHaveProperty('diff_drive')
  })

  it('DRIVE command moves diff_drive after tick', () => {
    const onSnapshot = vi.fn()
    const engine = buildEngine(onSnapshot)
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0 })
    engine.tick(1 / 60)
    const snapshot = onSnapshot.mock.calls[0][0]
    expect(snapshot.robots['diff_drive'].basePose.x).toBeGreaterThan(0)
  })

  it('simTime advances by fixedDt each tick', () => {
    const onSnapshot = vi.fn()
    const engine = buildEngine(onSnapshot)
    engine.tick(1 / 60)
    engine.tick(1 / 60)
    const snapshot = onSnapshot.mock.calls[1][0]
    expect(snapshot.simTime).toBeCloseTo(2 / 60, 5)
  })

  it('RESET command returns all poses to initial', () => {
    const onSnapshot = vi.fn()
    const engine = buildEngine(onSnapshot)
    engine.world.enqueueCommand({ type: 'DRIVE', linear: 1.5, angular: 0 })
    engine.tick(1 / 60)
    engine.world.enqueueCommand({ type: 'RESET' })
    engine.tick(1 / 60)
    const snapshot = onSnapshot.mock.calls[1][0]
    expect(snapshot.robots['diff_drive'].basePose.x).toBeCloseTo(0, 5)
  })
})
```

### Example D — `DifferentialDriveSystem.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { DifferentialDriveSystem } from '../DifferentialDriveSystem'

describe('DifferentialDriveSystem', () => {
  it('velocity ramps up toward target, not instant', () => {
    const sys = new DifferentialDriveSystem()
    sys.setTarget(1.5, 0)
    sys.tick(1 / 60)
    expect(sys.v).toBeGreaterThan(0)
    expect(sys.v).toBeLessThan(1.5)
  })

  it('wraps theta to [-π, π] on overflow', () => {
    const sys = new DifferentialDriveSystem()
    sys.setTheta(Math.PI - 0.01)
    sys.setTarget(0, 5.0)
    sys.tick(0.1)
    expect(sys.theta).toBeGreaterThanOrEqual(-Math.PI)
    expect(sys.theta).toBeLessThanOrEqual(Math.PI)
  })

  it('frame-rate independence: 10× smaller steps ≈ 1× large step', () => {
    const large = new DifferentialDriveSystem()
    large.setTarget(1.0, 0)
    large.tick(0.1)

    const small = new DifferentialDriveSystem()
    small.setTarget(1.0, 0)
    for (let i = 0; i < 10; i++) small.tick(0.01)

    expect(small.x).toBeCloseTo(large.x, 2)
  })
})
```

---

## 11. Known Gaps (do not test now, document for later)

| Gap | Reason to defer |
|-----|-----------------|
| `ForwardKinematicsSystem` full integration | Requires a real `THREE.Scene` with named nodes. Build a fixture GLB or programmatic scene mock — non-trivial. Add when FK bugs appear. |
| `FrankaArmMesh` rendering | Tests that Three.js group matrices match `dhTransforms` require R3F test harness. The math is already covered by `ForwardKinematics.test.ts`; rendering is visual. |
| `useRobotMotion` hook | Needs mocked `useFrame` from R3F. Possible with `vi.mock('@react-three/fiber')` but fragile. Defer until `useRobotMotion` logic is extracted into a plain class. |
| Worker stubs (`ik.worker.ts`, `planner.worker.ts`) | No logic to test yet. Add tests when implemented. |
| JSON robot config schema validation | Add `zod` schema when configs are consumed at runtime, not just startup. |
| E2E canvas screenshot diffs | Require stable GPU rendering; flaky in CI without dedicated GPU runner. Add last. |

---

## 12. Execution Plan

Run in this order to build coverage progressively:

1. **Week 1 — P0 unit tests** (simulation core + kinematics + stores)
   - `ForwardKinematics.test.ts`
   - `SimulationClock.test.ts`
   - `TrajectorySystem.test.ts`
   - `FrankaArm.test.ts`
   - `DifferentialDrive.test.ts`
   - `robotStore.test.ts`

2. **Week 2 — P1 unit + integration**
   - `DifferentialDriveSystem.test.ts`
   - `InputMapper.test.ts`
   - `KeyboardController.test.ts`
   - `EventBus.test.ts`
   - `simulation-tick.test.ts` (integration)
   - `command-pipeline.test.ts` (integration)

3. **Week 3 — P1 remaining + P2**
   - `simulationStore.test.ts`
   - `robotSelectors.test.ts`
   - `traverseHierarchy.test.ts`
   - `sceneStore.test.ts`
   - `SimulationWorld.test.ts`

4. **Week 4 — E2E**
   - Playwright setup
   - `app-boot.spec.ts`
   - `simulation-controls.spec.ts`

At this point you should be at ≥70% overall coverage with all P0 and P1 items covered.
