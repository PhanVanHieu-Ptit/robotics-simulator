import { Fragment } from 'react'
import { useFrame } from '@react-three/fiber'
import { Scene } from './Scene'
import { Environment } from './Environment'
import { Trail } from '../overlays/Trail'
import { CoordinateFrames } from '../overlays/CoordinateFrame'
import { EndEffectorFrame } from '../overlays/EndEffectorFrame'
import { useSimulationFrame } from '../hooks/useSimulationFrame'
import { rendererStore } from '@store/rendererStore'
import { ManipulatorRenderer } from '@ui/panels/ManipulatorControls'
import { ROBOT_SCENE_REGISTRY } from '../robots/robotRegistry'

function SimulationLoop() {
  useSimulationFrame()
  return null
}

// Reads gl.info each frame and pushes to rendererStore so PerformancePanel
// can display live GPU stats without living inside the Canvas context.
function RendererProbe() {
  useFrame(({ gl }) => {
    rendererStore.update(
      gl.info.render.calls,
      gl.info.memory.geometries,
      gl.info.render.triangles,
      gl.info.memory.textures,
    )
  })
  return null
}

export function SceneRoot() {
  return (
    <Scene>
      <SimulationLoop />
      <RendererProbe />
      <ManipulatorRenderer />
      <EndEffectorFrame />
      <Environment />
      {ROBOT_SCENE_REGISTRY.map(({ id, Component }) => (
        <Fragment key={id}>
          <Component />
          <Trail robotId={id} />
        </Fragment>
      ))}
      <CoordinateFrames />
    </Scene>
  )
}
