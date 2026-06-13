# PERF-005 — `PerformanceMonitor` Re-renders Every Physics Tick

**Status**: `RESOLVED` (fixed alongside `metricsStore` refactor)
**Severity**: Low

---

## Problem (Historical)

An earlier version of `PerformanceMonitor` subscribed to `simTime` and `frameTime` through Zustand, causing a full React reconciliation at 60 Hz — once per physics tick. A complex panel with many child nodes would have amplified this into noticeable jank.

---

## Root Cause

Zustand's `useSyncExternalStore`-based subscriptions schedule a React re-render whenever the selected state changes. `simTime` and `frameTime` change every tick at 60 Hz, so any component that subscribes to them re-renders 60 times/sec regardless of whether the DOM actually changes.

---

## How It Was Fixed

Two changes were made:

1. **`metricsStore` was extracted from Zustand** into a plain pub-sub module. It has no `useSyncExternalStore` integration and therefore never schedules React re-renders.

```ts
// src/store/metricsStore.ts — plain JS pub-sub, NOT Zustand
const listeners = new Set<MetricsListener>()
export const metricsStore = {
  update(simTime, frameTime) {
    listeners.forEach(l => l(simTime, frameTime))
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
}
```

2. **`PerformanceMonitor` uses DOM refs** instead of state. A `useEffect` subscribes once and writes directly to `span.textContent` on each update — no React involvement.

```ts
// src/ui/panels/PerformanceMonitor.tsx
useEffect(() => {
  return metricsStore.subscribe((simTime, frameTime) => {
    if (simRef.current)   simRef.current.textContent   = `${simTime.toFixed(2)}s`
    if (frameRef.current) frameRef.current.textContent = `${frameTime.toFixed(1)}ms`
    // ...
  })
}, [])
```

---

## Prevention

Any value that changes at ≥30 Hz should not flow through React state or Zustand. The pattern is:
1. Store the mutable value in a plain object or ref.
2. Subscribe once in `useEffect`.
3. Write to DOM nodes directly via `ref.current`.

Use React state only for values that change at human-interaction speed (clicks, toggles, config changes).

---

## Related Files

- [src/store/metricsStore.ts](../../src/store/metricsStore.ts) — plain pub-sub (current)
- [src/ui/panels/PerformanceMonitor.tsx](../../src/ui/panels/PerformanceMonitor.tsx) — DOM-ref pattern (current)
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — PERF-5
