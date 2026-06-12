import { Canvas } from '@react-three/fiber'
import { Suspense, type CSSProperties, type ReactNode } from 'react'
import { CameraController } from './CameraController'
import { Lighting, type LightingProps } from './Lighting'

interface PerspectiveCameraConfig {
  position?: [number, number, number]
  fov?: number
  near?: number
  far?: number
}

export interface SceneProps {
  children?: ReactNode
  /** Perspective camera initial config — overridden per-preset by CameraController */
  camera?: PerspectiveCameraConfig
  /** Lighting overrides passed through to <Lighting /> */
  lighting?: LightingProps
  /** Enable shadow casting (default: true) */
  shadows?: boolean
  /** CSS background color of the canvas (default: '#0f0f14') */
  background?: string
  /**
   * Device-pixel-ratio clamp.  Defaults to [1, 1.5] so Retina screens render
   * at 1.5× instead of 2×, cutting GPU fill by ~44 %.
   */
  dpr?: number | [number, number]
  style?: CSSProperties
  className?: string
}

const DEFAULT_CAMERA: Required<PerspectiveCameraConfig> = {
  position: [3, 3, 3],
  fov: 50,
  near: 0.1,
  far: 200,
}

/**
 * Reusable 3D scene wrapper.
 *
 * Provides a Canvas with a perspective camera, OrbitControls, and lights.
 * Any R3F content can be passed as children.
 *
 * Performance notes:
 *   - dpr is capped to 1.5 by default (big win on HiDPI displays)
 *   - powerPreference: 'high-performance' hints the browser to use the dGPU
 *   - antialias is on; disable via gl prop if FPS is a concern
 */
export function Scene({
  children,
  camera,
  lighting,
  shadows = true,
  background = '#0f0f14',
  dpr = [1, 1.5],
  style,
  className,
}: SceneProps) {
  const cam = { ...DEFAULT_CAMERA, ...camera }

  return (
    <Canvas
      shadows={shadows}
      camera={{
        position: cam.position,
        fov: cam.fov,
        near: cam.near,
        far: cam.far,
      }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      dpr={dpr}
      performance={{ min: 0.5 }}
      style={{ background, width: '100%', height: '100%', ...style }}
      className={className}
    >
      <Suspense fallback={null}>
        <CameraController />
        <Lighting {...lighting} />
        {children}
      </Suspense>
    </Canvas>
  )
}
