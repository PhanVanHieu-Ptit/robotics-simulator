import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../EventBus'

interface TestEvents {
  ping: { value: number }
  pong: string
  empty: undefined
}

describe('EventBus', () => {
  let bus: EventBus<TestEvents>

  beforeEach(() => {
    bus = new EventBus()
  })

  // ── on / emit ─────────────────────────────────────────────────────────────

  it('subscriber receives emitted payload', () => {
    const handler = vi.fn()
    bus.on('ping', handler)
    bus.emit('ping', { value: 42 })
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('multiple subscribers all receive the same event', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('ping', h1)
    bus.on('ping', h2)
    bus.emit('ping', { value: 1 })
    expect(h1).toHaveBeenCalledOnce()
    expect(h2).toHaveBeenCalledOnce()
  })

  it('emit with no subscribers does not throw', () => {
    expect(() => bus.emit('ping', { value: 0 })).not.toThrow()
  })

  it('handlers on different events do not cross-fire', () => {
    const pingHandler = vi.fn()
    const pongHandler = vi.fn()
    bus.on('ping', pingHandler)
    bus.on('pong', pongHandler)
    bus.emit('ping', { value: 5 })
    expect(pingHandler).toHaveBeenCalledOnce()
    expect(pongHandler).not.toHaveBeenCalled()
  })

  it('emitting twice calls handler twice', () => {
    const handler = vi.fn()
    bus.on('ping', handler)
    bus.emit('ping', { value: 1 })
    bus.emit('ping', { value: 2 })
    expect(handler).toHaveBeenCalledTimes(2)
  })

  // ── off ───────────────────────────────────────────────────────────────────

  it('off() removes the specific handler', () => {
    const handler = vi.fn()
    bus.on('ping', handler)
    bus.off('ping', handler)
    bus.emit('ping', { value: 1 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('off() with unknown handler does not throw', () => {
    const handler = vi.fn()
    expect(() => bus.off('ping', handler)).not.toThrow()
  })

  it('off() only removes the targeted handler, not others', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('ping', h1)
    bus.on('ping', h2)
    bus.off('ping', h1)
    bus.emit('ping', { value: 1 })
    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledOnce()
  })

  // ── on return value (unsubscribe fn) ─────────────────────────────────────

  it('on() returns an unsubscribe function that removes the handler', () => {
    const handler = vi.fn()
    const unsub = bus.on('ping', handler)
    unsub()
    bus.emit('ping', { value: 1 })
    expect(handler).not.toHaveBeenCalled()
  })

  // ── clear ─────────────────────────────────────────────────────────────────

  it('clear() removes all handlers across all events', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('ping', h1)
    bus.on('pong', h2)
    bus.clear()
    bus.emit('ping', { value: 1 })
    bus.emit('pong', 'hello')
    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('clear() allows re-subscribing afterwards', () => {
    const handler = vi.fn()
    bus.on('ping', handler)
    bus.clear()
    bus.on('ping', handler)
    bus.emit('ping', { value: 99 })
    expect(handler).toHaveBeenCalledOnce()
  })

  // ── undefined payload ─────────────────────────────────────────────────────

  it('supports undefined payload events', () => {
    const handler = vi.fn()
    bus.on('empty', handler)
    bus.emit('empty', undefined)
    expect(handler).toHaveBeenCalledWith(undefined)
  })
})
