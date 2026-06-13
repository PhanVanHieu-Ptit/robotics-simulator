import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface RendererStats {
  calls: number
  geometries: number
  triangles: number
  textures: number
}

interface RendererStore {
  stats: RendererStats
  updateStats: (stats: RendererStats) => void
}

export const useRendererStore = create<RendererStore>()(
  subscribeWithSelector((set) => ({
    stats: { calls: 0, geometries: 0, triangles: 0, textures: 0 },
    updateStats: (stats) => set({ stats }),
  })),
)
