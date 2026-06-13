# Quality Gates

Every task is **not complete** until all gates below pass. Run the verification commands before marking a task done.

---

## 1. TypeScript

**Command:** `npm run type-check`  
**Passes when:** exit code 0, zero errors in stdout.

```bash
npm run type-check
# must print nothing and exit 0
```

Acceptance criteria:
- `tsc --noEmit` exits 0.
- No `TS2xxx` errors in `src/`.
- No use of `@ts-ignore` or `@ts-expect-error` without an explanatory comment on the same line.
- `any` is permitted only in `src/workers/` (postMessage boundary). Elsewhere, `@typescript-eslint/no-explicit-any` fires as a warning and must be addressed unless an inline `// reason:` comment justifies the escape.

---

## 2. ESLint

**Command:** `npm run lint`  
**Passes when:** exit code 0, zero errors (warnings are allowed but must not increase).

```bash
npm run lint
# ✖ 0 problems
```

Acceptance criteria:
- `eslint .` exits 0 — zero **errors**, zero new **warnings** compared to the baseline on `main`.
- No new `no-console` violations (only `console.warn` / `console.error` are permitted).
- No `@typescript-eslint/no-unused-vars` errors (unused imports must be removed, not prefixed with `_` unless they are destructured parameters).
- `consistent-type-imports` rule is satisfied: all type-only imports use `import type`.
- `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` produce zero errors.

---

## 3. Build

**Command:** `npm run build`  
**Passes when:** exit code 0, `dist/` directory is created.

```bash
npm run build
# vite build ... ✓ built in Xs
```

Acceptance criteria:
- `tsc -b && vite build` exits 0.
- No chunk > 1 MB (Vite warns by default at 500 kB; three.js chunks are exempt from the 500 kB warning but the final bundle must not regress from the previous build by more than 10%).
- No broken dynamic `import()` paths (Vite will error at build time).
- `dist/index.html` references assets that exist in `dist/assets/`.

---

## 4. No Duplicated Code

**Passes when:** any logic extracted into a shared location when the same pattern appears three or more times.

Acceptance criteria:
- Utility functions used in more than two modules live in `src/simulation/` (pure math/logic) or a new `src/utils/` file, not copy-pasted.
- Component prop shapes used in multiple files are extracted into a shared type in the relevant module's `index.ts` or a `types.ts` sibling.
- No two R3F meshes define an identical material object inline — shared materials belong in `src/rendering/scene/` constants.
- Reviewer check: run `grep -rn "<suspect-pattern>" src/` and confirm the pattern does not appear in more than two unrelated files without a shared abstraction.

---

## 5. Accessibility

Applies to all `src/ui/` and `src/rendering/` work.

**Command:** No automated CLI tool is wired in yet. Manual checklist applies.

Acceptance criteria:
- Every interactive element (`Button`, `Slider`, `Select`) has an accessible label:
  - Ant Design components: use the `aria-label` prop when the label is not visible text.
  - Custom HTML elements: `<button>`, `<input>`, `<select>` must have either visible label text or `aria-label`.
- Keyboard navigation works for all Toolbar and Panel controls: Tab/Shift-Tab cycles focus, Enter/Space activates buttons.
- `JointSlider` (`src/ui/components/JointSlider.tsx`) exposes `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (Ant Design Slider does this automatically — verify it is not overridden).
- 3D canvas (`<canvas>`) has `aria-label="3D simulation viewport"` and `role="img"`.
- Color is never the sole means of conveying state (e.g., joint-limit warnings must show both color and an icon or text).

---

## 6. Loading States

Applies to any feature that fetches data, loads a robot config, or performs async work.

Acceptance criteria:
- Any operation taking > 200 ms shows a spinner or skeleton — use Ant Design `<Spin>` for panels and `<Skeleton>` for list items.
- `RobotLoader.tsx` (`src/rendering/robots/RobotLoader.tsx`) renders a fallback while the robot geometry is not yet ready (check the `<Suspense fallback>` boundary in `SceneRoot.tsx`).
- IK and path-planner workers (`src/workers/`) show a "computing…" indicator in `ManipulatorControls` while the worker is in flight; the UI remains interactive (not frozen).
- Stores must not expose intermediate half-updated state: batch zustand `setState` calls for multi-field updates.

---

## 7. Error States

Acceptance criteria:
- Robot config parse failures (malformed JSON in `src/config/robots/`) surface an Ant Design `<Alert type="error">` in `ConfigPanel`, not a blank panel or JS exception.
- IK worker returning `null` (no solution found) displays "No IK solution" in `ManipulatorControls` — not a silent no-op.
- `SimulationEngine` errors caught in `useSimulation.ts` must call `simulationStore.setError(message)` so the error propagates to the UI; they must not be swallowed with an empty `catch {}`.
- Any `try/catch` block that cannot recover must re-throw or call the error store — empty catch blocks are not permitted except for intentional no-ops, which must carry a comment.
- 3D canvas WebGL context-loss is handled: `<Canvas onContextLost>` triggers a visible "Renderer lost — refresh the page" notice.

---

## 8. Tests Updated

**Command:** `npm run test:run`  
**Passes when:** exit code 0 with zero failing tests, and coverage does not regress from the baselines below.

```bash
npm run test:run
# Test Files  N passed (N)
#      Tests  N passed (N)
```

Coverage baselines (from `npm run test:coverage`):

| Layer | File glob | Statement floor |
|-------|-----------|----------------|
| Simulation core | `src/simulation/core/**` | **95%** |
| Simulation kinematics | `src/simulation/kinematics/**` | **80%** |
| Simulation robots | `src/simulation/robots/**` | **85%** |
| Simulation systems | `src/simulation/systems/**` | **60%** |
| Simulation world | `src/simulation/world/**` | **85%** |
| Store | `src/store/**` | **40%** |
| Input | `src/input/**` | **20%** |
| UI components | `src/ui/components/**` | **0%** (floor; add tests when adding new components) |
| Rendering | `src/rendering/**` | **0%** (Three.js-heavy; integration-style, exempt for now) |

Additional test criteria:
- Every new pure function in `src/simulation/` has at least one unit test covering the happy path and one edge/boundary case.
- Every new Zustand store action has a test that asserts the resulting state shape.
- New `src/ui/components/` work adds at least a smoke test (renders without throwing) using `@testing-library/react`.
- Regression: if a bug fix is made, a test that would have caught the bug must be added.

---

## 9. Docs Updated

Acceptance criteria:
- Any new system, robot type, or significant module has its entry in [ARCHITECTURE.md](ARCHITECTURE.md) (data-flow and system execution order sections).
- New stores are listed in [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) with their shape and which components subscribe.
- New API contracts (worker message types, command discriminants) are added to [API_CONTRACTS.md](API_CONTRACTS.md).
- New UI panels or components are listed in [COMPONENT_REGISTRY.md](COMPONENT_REGISTRY.md).
- Changed test strategy (new coverage targets, new test categories) is reflected in [TESTING_STRATEGY.md](TESTING_STRATEGY.md).
- `DECISIONS.md` gets a new entry for any architectural decision that was non-obvious (pattern chosen, library adopted, invariant established).

---

## Pre-PR Checklist

Run this in order before opening a pull request:

```bash
npm run type-check   # gate 1
npm run lint         # gate 2
npm run build        # gate 3
npm run test:run     # gate 8 (pass/fail)
npm run test:coverage # gate 8 (coverage floors)
```

All five commands must exit 0. Gates 4–7 and gate 9 are reviewer-checked via the PR description.
