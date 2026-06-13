# SCALE-001 — Module-Level Engine Singleton Blocks Testing and Multi-World

**Status**: `OPEN`
**Severity**: Medium
**Backlog**: T-019

---

## Problem

Only one `SimulationEngine` can exist at a time. Tests that create an engine share state unless `_engine` is manually nulled. A "split-screen comparison" view is impossible without a full refactor.

---

## Root Cause

```ts
// src/hooks/useSimulation.ts
let _engine: SimulationEngine | null = null   // module-level singleton

function createEngine(): SimulationEngine { ... }

function ensureEngine(): SimulationEngine {
  _engine ??= createEngine()    // silently reuses the old engine
  return _engine
}
```

Because `_engine` is a module-level variable, it persists across React renders, hot module reloads, and Jest test files (in the same worker process). A test that calls `createEngine()` implicitly inherits any state left by a previous test.

---

## Fix

Move engine ownership into React context or accept and document the constraint.

**Option A — React context** (recommended if multi-world is desired):

```ts
// src/context/SimulationContext.tsx
const SimulationContext = createContext<SimulationEngine | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<SimulationEngine | null>(null)
  engineRef.current ??= createEngine()

  return (
    <SimulationContext.Provider value={engineRef.current}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useEngine(): SimulationEngine {
  const engine = useContext(SimulationContext)
  if (!engine) throw new Error('useEngine must be inside SimulationProvider')
  return engine
}
```

Each `SimulationProvider` tree owns its own engine. Tests wrap their component under test in a fresh `SimulationProvider`.

**Option B — document the constraint** (minimal, if multi-world is not planned):

Add a `resetEngine()` export and call it in test `afterEach`:

```ts
export function resetEngine(): void { _engine = null }
```

Document in `ARCHITECTURE.md` that multi-world is unsupported by design.

---

## Prevention

Module-level mutable singletons are a testing anti-pattern. If a value needs to survive React re-renders, use `useRef`. If it needs to be shared across the tree, use React context. Reserve module-level state for truly global, immutable configuration.

---

## Related Files

- [src/hooks/useSimulation.ts](../../src/hooks/useSimulation.ts) — singleton definition
- [src/simulation/core/SimulationEngine.ts](../../src/simulation/core/SimulationEngine.ts) — engine class
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — SCALE-1
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-019
