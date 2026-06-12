import { OrbitControls } from '@react-three/drei'
import { useSceneStore } from '@store/sceneStore'

export function CameraController() {
  const preset = useSceneStore((s) => s.cameraPreset)

  // Camera preset positions
  const positions: Record<typeof preset, [number, number, number]> = {
    perspective: [3, 3, 3],
    top:         [0, 6, 0.01],
    front:       [0, 1, 5],
    side:        [5, 1, 0],
  }

  return (
    <OrbitControls
      makeDefault
      target={[0, 0.5, 0]}
      // Re-position when preset changes via key
      key={preset}
      // @ts-expect-error drei position prop
      position={positions[preset]}
      enableDamping
      dampingFactor={0.05}
      minDistance={1}
      maxDistance={20}
    />
  )
}
