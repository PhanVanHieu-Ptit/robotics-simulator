import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { SpeedOption } from '@config/simulation'

export type SimMode = 'manual' | 'auto' | 'replay'

interface SimulationState {
  isRunning: boolean
  isPaused: boolean
  speed: SpeedOption
  mode: SimMode
  simTime: number    // seconds
  frameTime: number  // ms
}

interface SimulationActions {
  setRunning: (running: boolean) => void
  setPaused: (paused: boolean) => void
  setSpeed: (speed: SpeedOption) => void
  setMode: (mode: SimMode) => void
  updateMetrics: (simTime: number, frameTime: number) => void
}

export type SimulationStore = SimulationState & SimulationActions

export const useSimulationStore = create<SimulationStore>()(
  subscribeWithSelector((set) => ({
    isRunning: false,
    isPaused: false,
    speed: 1,
    mode: 'manual',
    simTime: 0,
    frameTime: 0,

    setRunning: (isRunning) => set({ isRunning }),
    setPaused:  (isPaused)  => set({ isPaused }),
    setSpeed:   (speed)     => set({ speed }),
    setMode:    (mode)      => set({ mode }),
    updateMetrics: (simTime, frameTime) => set({ simTime, frameTime }),
  })),
)
