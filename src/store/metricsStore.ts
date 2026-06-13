// Plain-JS pub-sub for simTime/frameTime/wallFps — intentionally NOT a Zustand store.
// These update at 60fps; putting them in Zustand would cause useSyncExternalStore
// to re-check all subscribers every frame, producing spurious re-renders in React 18.
type MetricsListener = (simTime: number, frameTime: number, wallFps: number) => void

const listeners = new Set<MetricsListener>()
let _simTime = 0
let _frameTime = 0
let _wallFps = 0

export const metricsStore = {
  get simTime()   { return _simTime },
  get frameTime() { return _frameTime },
  get wallFps()   { return _wallFps },

  update(simTime: number, frameTime: number, wallDeltaSec: number): void {
    _simTime = simTime
    _frameTime = frameTime
    _wallFps = wallDeltaSec > 0 ? 1 / wallDeltaSec : 0
    listeners.forEach(l => l(simTime, frameTime, _wallFps))
  },

  subscribe(fn: MetricsListener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
