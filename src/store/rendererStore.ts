// Plain-JS pub-sub for GPU draw-call stats — intentionally NOT a Zustand store.
// These update at 60fps; putting them in Zustand would allocate a new object and
// fire useSyncExternalStore on every subscriber each frame.
// Same pattern as metricsStore.

type RendererListener = (calls: number, geometries: number, triangles: number, textures: number) => void

const listeners = new Set<RendererListener>()
let _calls      = 0
let _geometries = 0
let _triangles  = 0
let _textures   = 0

export const rendererStore = {
  get calls()      { return _calls },
  get geometries() { return _geometries },
  get triangles()  { return _triangles },
  get textures()   { return _textures },

  update(calls: number, geometries: number, triangles: number, textures: number): void {
    _calls      = calls
    _geometries = geometries
    _triangles  = triangles
    _textures   = textures
    listeners.forEach((l) => l(calls, geometries, triangles, textures))
  },

  subscribe(fn: RendererListener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
