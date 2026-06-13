import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import type { GLTF } from 'three-stdlib'
import type * as THREE from 'three'

export interface RobotModelConfig {
  readonly id: string
  readonly name: string
  /** URL path to the .glb file — must be under public/ for Vite to serve it. */
  readonly path: string
  readonly scale?: number
  readonly position?: readonly [number, number, number]
  readonly rotation?: readonly [number, number, number]
}

export interface LoadedRobot {
  /** Cloned scene graph — safe to place multiple instances in the same Canvas. */
  readonly scene: THREE.Group
  readonly gltf: GLTF
  readonly config: RobotModelConfig
}

/** Central registry of robot models. Add future models here. */
export const ROBOT_MODELS = {
  ridgeback_franka: {
    id: 'ridgeback_franka',
    name: 'Ridgeback Franka',
    path: '/models/ridgeback_franka.glb',
    scale: 1,
    position: [0, 0, 0] as const,
    rotation: [0, 0, 0] as const,
  },
} satisfies Record<string, RobotModelConfig>

export type RobotModelId = keyof typeof ROBOT_MODELS

/**
 * Loads a robot GLB via useGLTF (Suspense-based).
 *
 * Must be called inside a <Suspense> boundary.
 * Pass a stable config reference (e.g. ROBOT_MODELS.ridgeback_franka) to avoid
 * unnecessary re-cloning on every render.
 */
export function useRobotLoader(config: RobotModelConfig): LoadedRobot {
  const gltf = useGLTF(config.path)
  return useMemo(
    () => ({ scene: gltf.scene.clone(true), gltf, config }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gltf, config.path],
  )
}

/** Kick off background loading before the component mounts. */
useRobotLoader.preload = (config: RobotModelConfig): void => {
  useGLTF.preload(config.path)
}
