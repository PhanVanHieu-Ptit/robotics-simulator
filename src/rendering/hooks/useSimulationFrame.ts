import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSimulationStore } from '@store/simulationStore'
import { getEngine } from '@hooks/useSimulation'

/**
 * Drives the simulation engine from R3F's requestAnimationFrame loop.
 *
 * Critically, this hook does NOT call useSimulation() and does NOT subscribe
 * to the store via a React hook.  Instead it mirrors isRunning/isPaused into
 * a plain ref via Zustand's vanilla subscribe API.  That way SimulationLoop
 * (the component that uses this hook) is NEVER re-rendered by store changes —
 * eliminating the "Maximum update depth exceeded" cascade.
 */
export function useSimulationFrame(): void {
  const activeRef = useRef(false)

  useEffect(() => {
    // Seed from current state so the first frame is correct.
    const { isRunning, isPaused } = useSimulationStore.getState()
    activeRef.current = isRunning && !isPaused

    // Subscribe without triggering any React re-render.
    const unsub = useSimulationStore.subscribe((s) => {
      activeRef.current = s.isRunning && !s.isPaused
    })
    return unsub
  }, [])

  useFrame((_, delta) => {
    if (!activeRef.current) return
    getEngine()?.tick(delta)
  })
}
