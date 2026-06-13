import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { SpeedOption } from '@config/simulation'

export type SimMode = 'manual' | 'auto' | 'replay'

interface SimulationState {
  isRunning: boolean
  isPaused: boolean
  speed: SpeedOption
  mode: SimMode
}

interface SimulationActions {
  setRunning: (running: boolean) => void
  setPaused: (paused: boolean) => void
  setSpeed: (speed: SpeedOption) => void
  setMode: (mode: SimMode) => void
}

export type SimulationStore = SimulationState & SimulationActions

export const useSimulationStore = create<SimulationStore>()(
  subscribeWithSelector((set) => ({
    isRunning: false,
    isPaused: false,
    speed: 1,
    mode: 'manual',

    setRunning: (isRunning) => set({ isRunning }),
    setPaused:  (isPaused)  => set({ isPaused }),
    setSpeed:   (speed)     => set({ speed }),
    setMode:    (mode)      => set({ mode }),
  })),
)
