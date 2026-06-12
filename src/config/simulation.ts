export const SimulationConfig = {
  fixedDt: 1 / 60,          // seconds — 60 Hz physics tick
  maxDt: 0.1,               // clamp to prevent spiral-of-death
  defaultSpeed: 1,
  speedOptions: [0.25, 0.5, 1, 2, 4] as const,
  maxTrajectoryLength: 2000, // ring-buffer cap for end-effector path
} as const

export type SpeedOption = (typeof SimulationConfig.speedOptions)[number]
