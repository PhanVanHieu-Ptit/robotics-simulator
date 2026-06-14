import { SimulationConfig } from '@config/simulation'

export class SimulationClock {
  private _simTime = 0
  private _speedMultiplier: number = SimulationConfig.defaultSpeed

  get simTime(): number {
    return this._simTime
  }

  get speedMultiplier(): number {
    return this._speedMultiplier
  }

  get fixedDt(): number {
    return SimulationConfig.fixedDt
  }

  setSpeed(multiplier: number): void {
    this._speedMultiplier = Math.max(0.25, Math.min(4, multiplier))
  }

  /** Advances sim time by scaled delta. Returns the effective dt used. */
  advance(rawDelta: number): number {
    const dt = Math.min(rawDelta, SimulationConfig.maxDt) * this._speedMultiplier
    this._simTime += dt
    return dt
  }

  reset(): void {
    this._simTime = 0
  }
}
