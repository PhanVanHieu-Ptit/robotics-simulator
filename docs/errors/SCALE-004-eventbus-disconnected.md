# SCALE-004 — `EventBus` Defined But Never Wired Into the Engine

**Status**: `OPEN`
**Severity**: Low (now) / High (when collision/trajectory events are needed)
**Backlog**: T-014

---

## Problem

`EventBus<SimulationEvents>` is implemented and exports a typed interface for `tick`, `collision`, `trajectoryUpdated`, and `reset` events. But no instance is ever created, and `SimulationEngine` never emits to any bus. Systems that need to react to engine events (UI panels, collision responders, audio triggers) have no mechanism to subscribe.

**Concrete blocker**: Collision detection (once implemented) needs to emit `collision` events so that `InputSystem` can halt robot motion. Without `EventBus`, collision results have no delivery path beyond polling the world state.

---

## Root Cause

```ts
// src/simulation/core/EventBus.ts — class exists but is never instantiated
export class EventBus<EventMap extends Record<string, unknown>> { ... }

export interface SimulationEvents {
  tick:               { dt: number; simTime: number }
  collision:          { robotId: string; obstacleId: string }
  trajectoryUpdated:  { robotId: string }
  reset:              undefined
}
// ↑ No export of a concrete instance; no reference in SimulationEngine
```

```ts
// src/simulation/core/SimulationEngine.ts — no EventBus field
export class SimulationEngine {
  constructor(world, clock, systems, onSnapshot) { ... }
  // ← no bus: EventBus<SimulationEvents>
}
```

---

## Fix

Inject `EventBus<SimulationEvents>` into the engine and emit at key lifecycle points:

```ts
// src/simulation/core/SimulationEngine.ts
import { EventBus } from './EventBus'
import type { SimulationEvents } from './EventBus'

export class SimulationEngine {
  readonly bus = new EventBus<SimulationEvents>()

  tick(dt: number): void {
    // ...run systems...
    this.bus.emit('tick', { dt, simTime: this._clock.simTime })
  }

  reset(): void {
    // ...reset world...
    this.bus.emit('reset', undefined)
  }
}
```

Expose `bus` via `getEngine()` so React hooks can subscribe:

```ts
// Usage in a UI hook
useEffect(() => {
  return getEngine()?.bus.on('collision', ({ robotId }) => {
    console.warn(`Collision detected for ${robotId}`)
  })
}, [])
```

---

## Prevention

If an abstraction is defined, it should be used immediately or deleted. Dead code that is "almost ready" is a maintenance burden because it implies completeness that does not exist. Either wire it now or remove it and add it back when there is a real consumer.

---

## Related Files

- [src/simulation/core/EventBus.ts](../../src/simulation/core/EventBus.ts) — implementation + `SimulationEvents` interface
- [src/simulation/core/SimulationEngine.ts](../../src/simulation/core/SimulationEngine.ts) — needs `bus` field
- [src/hooks/useSimulation.ts](../../src/hooks/useSimulation.ts) — `getEngine()` for external access
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — SCALE-4
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-014
