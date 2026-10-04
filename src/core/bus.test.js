import { describe, expect, it, vi } from 'vitest'
import { createBus } from './bus.js'

describe('core/bus', () => {
  it('доставляет события подписчикам и отписывает', () => {
    const bus = createBus()
    const fn = vi.fn()
    const off = bus.on('ping', fn)

    bus.emit('ping', 1)
    off()
    bus.emit('ping', 2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
  })

  it('ошибка одного подписчика не мешает другим', () => {
    const bus = createBus()
    const ok = vi.fn()

    vi.spyOn(console, 'error').mockImplementation(() => {})
    bus.on('x', () => {
      throw new Error('bad')
    })
    bus.on('x', ok)
    bus.emit('x')
    expect(ok).toHaveBeenCalled()
  })

  it('replay отдаёт последнее значение позднему подписчику', () => {
    const bus = createBus()
    const late = vi.fn()
    const plain = vi.fn()

    bus.emit('story:scene', 3)
    bus.on('story:scene', plain)
    bus.on('story:scene', late, { replay: true })
    expect(plain).not.toHaveBeenCalled()
    expect(late).toHaveBeenCalledWith(3)
    expect(bus.last('story:scene')).toBe(3)
  })

  it('replay без прошлых событий ничего не вызывает; clear всё сбрасывает', () => {
    const bus = createBus()
    const fn = vi.fn()

    bus.on('a', fn, { replay: true })
    expect(fn).not.toHaveBeenCalled()
    bus.emit('a', 1)
    bus.clear()
    bus.emit('a', 2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(bus.last('a')).toBe(2)
  })
})
