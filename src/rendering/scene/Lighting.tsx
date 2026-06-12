import { useRef } from 'react'
import type { DirectionalLight as ThreeDirectionalLight } from 'three'

export interface LightingProps {
  ambientIntensity?: number
  directionalPosition?: [number, number, number]
  directionalIntensity?: number
  fillIntensity?: number
  shadows?: boolean
  shadowMapSize?: 512 | 1024 | 2048
}

export function Lighting({
  ambientIntensity = 0.4,
  directionalPosition = [5, 10, 5],
  directionalIntensity = 1,
  fillIntensity = 0.3,
  shadows = true,
  shadowMapSize = 2048,
}: LightingProps) {
  const dirRef = useRef<ThreeDirectionalLight>(null)

  return (
    <>
      <ambientLight intensity={ambientIntensity} />

      <directionalLight
        ref={dirRef}
        position={directionalPosition}
        intensity={directionalIntensity}
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      <pointLight position={[-5, 5, -5]} intensity={fillIntensity} />
    </>
  )
}
