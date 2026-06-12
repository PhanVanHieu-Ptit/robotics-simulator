# Testing Strategy

## Infrastructure (Ready, No Tests Written Yet)

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 2.1.8 | Test runner (Vite-native, fast) |
| @testing-library/react | 16.1.0 | React component testing |
| @testing-library/user-event | 14.5.2 | DOM interaction simulation |
| @testing-library/jest-dom | 6.6.3 | DOM matchers |
| jsdom | 25.0.1 | Browser environment for Node |
| WebGL mock | `src/test/setup.ts` | Three.js can instantiate without real GPU |

Run commands:

```bash
npm run test          # watch mode
npm run test:run      # single run (CI)
npm run test:ui       # Vitest UI
npm run test:coverage # coverage report (v8 provider)
```

Coverage output: `coverage/` directory (text + json + html reporters).

---

## What to Test (Priority Order)

### 1. Pure Simulation Logic (no React, easiest to test)

These run in Node without any mocking — highest value, lowest friction.

| Module | What to Assert | File |
|--------|---------------|------|
| `ForwardKinematics` | Known FK test vectors for Franka home pose | `src/simulation/kinematics/ForwardKinematics.ts` |
| `DifferentialDrive.step()` | Unicycle integration (straight line, arc, zero input) | `src/simulation/robots/DifferentialDrive.ts` |
| `FrankaArm.applyCommand()` | Clamping to joint limits | `src/simulation/robots/FrankaArm.ts` |
| `InputMapper` | `DRIVE` command output for each key combination | `src/input/InputMapper.ts` |
| `TrajectorySystem` | Ring buffer cap enforcement + deadband filtering | `src/simulation/systems/TrajectorySystem.ts` |
| `SimulationClock` | Speed multiplier scaling | `src/simulation/core/SimulationClock.ts` |

### 2. Store Behavior

| Store | What to Assert |
|-------|---------------|
| `simulationStore` | State transitions: idle → running → paused → stopped |
| `sceneStore` | Persistence round-trip (localStorage serialize/deserialize) |
| `robotStore` | `setJointAngles` updates `jointAngles` correctly |

### 3. Selectors

| Selector | What to Assert |
|----------|---------------|
| `useJointLimitWarnings` | Returns `true` when angle within 0.05 rad of limit |
| `useEEPositionLabel` | Formats position to 3 decimal places |

### 4. Component Rendering (lower priority)

| Component | What to Assert |
|-----------|---------------|
| `JointSlider` | Renders correct label, calls `onChange` with radian value |
| `VectorDisplay` | Formats vector to specified precision |
| `PerformanceMonitor` | Displays simTime and frameTime from store |
| `Toolbar` | Play/Pause buttons visible and clickable |

---

## Test File Naming Convention

```
src/
  simulation/
    kinematics/
      ForwardKinematics.test.ts   ← co-locate with source
    robots/
      FrankaArm.test.ts
      DifferentialDrive.test.ts
  store/
    simulationStore.test.ts
  ui/
    components/
      JointSlider.test.tsx
```

---

## FK Test Vector (Known Good)

Franka Panda home pose (initial angles `[0, -0.785, 0, -2.356, 0, 1.571, 0.785]`):

> [INFERRED] The exact expected end-effector position at home configuration is approximately `[0.307, 0, 0.487]` meters based on Franka documentation. Verify against robot.state.endEffectorPose on first run to capture ground truth.

---

## Mocking Notes

- **Three.js Canvas**: Already mocked in `src/test/setup.ts` via `HTMLCanvasElement.getContext`. No additional setup needed for component tests.
- **Engine singleton**: Tests that call `getEngine()` need to reset module state between tests. Use `vi.resetModules()` or wrap engine access in a resetable factory.
- **RAF loops**: `useInputController` and `useSimulationFrame` use `requestAnimationFrame`. Vitest + jsdom fake timers can control RAF: `vi.useFakeTimers()`.
- **localStorage**: jsdom provides a working localStorage implementation — no mock needed for `sceneStore` persistence tests.

---

## Coverage Targets (Suggested)

| Layer | Target |
|-------|--------|
| `src/simulation/` | 80%+ (pure logic, easy to test) |
| `src/store/` | 70%+ |
| `src/ui/components/` | 60%+ |
| `src/rendering/` | 30%+ (Three.js heavy, integration-style) |

---

## CI Integration

> [INFERRED] No CI config exists. When added, use `npm run test:run` (exits after one pass) rather than `npm run test` (watch mode blocks CI).
