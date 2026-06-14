type Handler<T> = (payload: T) => void

export class EventBus<EventMap extends object> {
  private readonly handlers = new Map<keyof EventMap, Set<Handler<unknown>>>()

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as Handler<unknown>)
    return () => this.off(event, handler)
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>)
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.handlers.get(event)?.forEach((h) => h(payload))
  }

  clear(): void {
    this.handlers.clear()
  }
}

export interface SimulationEvents {
  tick: { dt: number; simTime: number }
  collision: { robotId: string; obstacleId: string }
  trajectoryUpdated: { robotId: string }
  reset: undefined
}
