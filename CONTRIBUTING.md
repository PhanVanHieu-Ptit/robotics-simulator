# Contributing

## Prerequisites

- Node.js ≥ 20 (LTS)
- npm ≥ 9

## Dev setup

```bash
npm install
npm run dev      # Vite dev server at http://localhost:5173
```

## Before submitting a PR

All of these must pass locally:

```bash
npm run type-check    # tsc --noEmit
npm run lint          # ESLint
npm run format:check  # Prettier
npm run test:run      # Vitest — all tests must pass
npm run build         # production build must succeed
```

CI runs the same checks on every push and pull request.

## Coding conventions

### Architectural boundaries (strictly enforced)

1. `src/simulation/` is **framework-free**. No `import` of React, Three.js, browser APIs, or Zustand. This layer must be testable with plain Node.
2. `src/rendering/` may use Three.js and R3F but must not import `src/ui/` internals.
3. `src/store/` may import simulation types (type-only) and config. Not Three.js.
4. `src/input/` may import simulation command types and config. Not React or Three.js.

Violating these boundaries is a PR blocker.

### TypeScript

- Strict mode is on (`noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`).
- Use `type` imports for type-only imports (`consistent-type-imports` is enforced by ESLint).
- No `any` unless there's a documented reason.

### Comments

- Write comments only for non-obvious **WHY**, not WHAT.
- No multi-line docblock prose for trivial functions.

### Performance hot paths

- The R3F `useFrame` callback runs at 60fps. Avoid heap allocations inside it.
- Use pre-allocated buffers (see `computeFKInto`, `solveIK`) in the simulation inner loop.
- Zustand `set()` triggers all subscribers — use direct DOM mutation or plain pub-sub for 60fps metrics (`metricsStore`, `rendererStore`).

### Commands

Robot commands are **discriminated unions** keyed by `type`. To add a new command:
1. Add the type to `src/simulation/types/Command.ts`.
2. Handle it in the appropriate robot's `applyCommand()`.
3. Add an `InputSystem` routing branch if it targets a specific robot by ID.

### Tests

- Unit tests live in `src/**/__tests__/` (or `__integration__/`).
- All new simulation logic requires tests. New React hooks are optional but encouraged.
- Mock the minimum — prefer real implementations with controlled inputs.
- `robot.trajectoryBuffer` is no longer maintained by `TrajectorySystem`. Use `TrajectorySystem.getTrajectorySnapshot()` in tests that check trajectory output.

## PR checklist

- [ ] All CI checks pass (type-check, lint, format, tests, build)
- [ ] New simulation logic has unit tests
- [ ] No heap allocations added to `useFrame` hot path
- [ ] Architectural boundaries respected (no React/Three.js in `src/simulation/`)
- [ ] KNOWN_ISSUES.md updated if a known issue is fixed or introduced
- [ ] CHANGELOG.md updated with a user-visible entry
