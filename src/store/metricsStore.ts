// Plain-JS pub-sub for simTime/frameTime — intentionally NOT a Zustand store.
// simTime and frameTime update at 60fps; putting them in Zustand would cause
// useSyncExternalStore to re-check all subscribers every frame, producing
// spurious Toolbar re-renders in React 18 concurrent mode.
type MetricsListener = (simTime: number, frameTime: number) => void

const listeners = new Set<MetricsListener>()
let _simTime = 0
let _frameTime = 0

export const metricsStore = {
  get simTime()   { return _simTime },
  get frameTime() { return _frameTime },

  update(simTime: number, frameTime: number): void {
    _simTime = simTime
    _frameTime = frameTime
    listeners.forEach(l => l(simTime, frameTime))
  },

  subscribe(fn: MetricsListener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
