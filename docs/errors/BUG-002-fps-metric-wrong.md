# BUG-002 — FPS Display Reads Tick Time, Not Wall-Clock FPS

**Status**: `OPEN`
**Severity**: Low
**Backlog**: T-007

---

## Problem

The FPS counter in `PerformanceMonitor` shows implausibly high numbers (e.g., "500 FPS") because it computes `1000 / frameTime` where `frameTime` is the duration of `SimulationEngine.tick()` — the physics computation time — not the actual elapsed time between rendered frames.

**Symptom**: FPS reads 200–1000 during normal operation; the colour threshold (red at <30) never triggers because the metric is unrelated to real render performance.

---

## Root Cause

`metricsStore.update(snapshot.simTime, snapshot.frameTime)` is called from the `SimulationEngine` tick callback. `snapshot.frameTime` is the engine's internal physics step duration in milliseconds — how long the systems took to run — not the wall-clock interval between `useFrame` calls.

```ts
// src/ui/panels/PerformanceMonitor.tsx — line 31
const fps = frameTime > 0 ? (1000 / frameTime).toFixed(0) : '—'
// frameTime ≈ 0.5ms  →  fps ≈ 2000   (nonsense)
```

R3F's `useFrame` callback receives the correct wall-clock `delta` in seconds, but this value is not forwarded to `metricsStore`.

---

## Fix

Capture the wall-clock delta inside `useSimulationFrame` and forward it as a separate metric.

```ts
// src/rendering/hooks/useSimulationFrame.ts
import { useFrame } from '@react-three/fiber'
import { getEngine } from '@hooks/useSimulation'
import { metricsStore } from '@store/metricsStore'

export function useSimulationFrame(): void {
  useFrame((_, delta) => {
    getEngine()?.tick(delta)
    // delta is seconds; convert to ms for display
    metricsStore.updateRenderDelta(delta * 1000)
  })
}
```

Extend `metricsStore` with `renderDelta` and compute FPS from it:

```ts
// src/store/metricsStore.ts
update(simTime: number, frameTime: number): void { ... }    // physics tick ms
updateRenderDelta(renderDeltaMs: number): void { ... }      // wall-clock ms

// fps = 1000 / renderDeltaMs
```

Update `PerformanceMonitor` to subscribe to `renderDeltaMs` for the FPS display.

---

## Prevention

- FPS should always be derived from `1 / wallClockDelta`, never from `1 / workDuration`.
- Keep physics tick duration and render frame rate as separate metrics — they measure different things.

---

## Related Files

- [src/ui/panels/PerformanceMonitor.tsx](../../src/ui/panels/PerformanceMonitor.tsx) — line 31, incorrect FPS formula
- [src/store/metricsStore.ts](../../src/store/metricsStore.ts) — `frameTime` semantics
- [src/rendering/hooks/useSimulationFrame.ts](../../src/rendering/hooks/useSimulationFrame.ts) — source of wall-clock delta
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — BUG-2
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-007
