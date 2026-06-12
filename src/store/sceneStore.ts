import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Pose3D } from '@simulation/types'

export type CameraPreset = 'perspective' | 'top' | 'front' | 'side'

interface SceneState {
  showGrid: boolean
  showCoordinateFrames: boolean
  showTrajectory: boolean
  showBoundingBoxes: boolean
  cameraPreset: CameraPreset
  ikTarget: Pose3D | null
}

interface SceneActions {
  toggleGrid: () => void
  toggleCoordinateFrames: () => void
  toggleTrajectory: () => void
  toggleBoundingBoxes: () => void
  setCameraPreset: (preset: CameraPreset) => void
  setIKTarget: (pose: Pose3D | null) => void
}

export const useSceneStore = create<SceneState & SceneActions>()(
  persist(
    (set) => ({
      showGrid: true,
      showCoordinateFrames: true,
      showTrajectory: true,
      showBoundingBoxes: false,
      cameraPreset: 'perspective',
      ikTarget: null,

      toggleGrid:             () => set((s) => ({ showGrid: !s.showGrid })),
      toggleCoordinateFrames: () => set((s) => ({ showCoordinateFrames: !s.showCoordinateFrames })),
      toggleTrajectory:       () => set((s) => ({ showTrajectory: !s.showTrajectory })),
      toggleBoundingBoxes:    () => set((s) => ({ showBoundingBoxes: !s.showBoundingBoxes })),
      setCameraPreset: (cameraPreset) => set({ cameraPreset }),
      setIKTarget:     (ikTarget)     => set({ ikTarget }),
    }),
    { name: 'robotics-sim-scene' },
  ),
)
