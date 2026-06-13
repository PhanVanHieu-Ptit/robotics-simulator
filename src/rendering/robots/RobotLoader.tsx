import { Component, Suspense, useEffect, type ReactNode } from 'react'
import { useRobotLoader } from '@rendering/hooks/useRobotLoader'
import type { LoadedRobot, RobotModelConfig } from '@rendering/hooks/useRobotLoader'

export interface RobotLoaderProps {
  config: RobotModelConfig
  onLoad?: (robot: LoadedRobot) => void
  onError?: (error: Error) => void
  position?: [number, number, number]
  scale?: number
  visible?: boolean
}

// ── Placeholders ────────────────────────────────────────────────────────────

function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#4a9eff" wireframe transparent opacity={0.5} />
    </mesh>
  )
}

function ErrorPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#ff4444" wireframe />
    </mesh>
  )
}

// ── Error boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  onError?: (error: Error) => void
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class RobotErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) return <ErrorPlaceholder />
    return this.props.children
  }
}

// ── Inner mesh (lives inside Suspense — safe to call useRobotLoader) ─────────

function RobotMesh({ config, onLoad, position, scale, visible = true }: RobotLoaderProps) {
  const robot = useRobotLoader(config)

  useEffect(() => {
    onLoad?.(robot)
  }, [robot, onLoad])

  return (
    <primitive
      object={robot.scene}
      position={position ?? config.position ?? [0, 0, 0]}
      scale={scale ?? config.scale ?? 1}
      visible={visible}
    />
  )
}

// ── Public component ────────────────────────────────────────────────────────

/**
 * Loads a robot GLB model inside the R3F scene.
 *
 * - Shows a blue wireframe cube while the GLB is loading.
 * - Shows a red wireframe cube if loading fails and calls `onError`.
 * - Calls `onLoad` with the resolved robot once the scene is ready.
 * - Supports any model registered in ROBOT_MODELS, or a custom RobotModelConfig.
 */
export function RobotLoader(props: RobotLoaderProps) {
  return (
    <RobotErrorBoundary onError={props.onError}>
      <Suspense fallback={<LoadingPlaceholder />}>
        <RobotMesh {...props} />
      </Suspense>
    </RobotErrorBoundary>
  )
}
