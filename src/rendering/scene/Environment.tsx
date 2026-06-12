import { Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useSceneStore } from '@store/sceneStore'

export function Environment() {
  const showGrid = useSceneStore((s) => s.showGrid)

  return (
    <>
      {showGrid && (
        <Grid
          args={[20, 20]}
          position={[0, 0, 0]}
          cellColor="#444"
          sectionColor="#666"
          fadeDistance={25}
          infiniteGrid
        />
      )}

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={['#ff4060', '#80cc40', '#4080ff']} labelColor="white" />
      </GizmoHelper>
    </>
  )
}
