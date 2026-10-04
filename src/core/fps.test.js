import { describe, expect, it, vi } from 'vitest'
import { createFpsMeter, isDebug, mountFpsOverlay } from './fps.js'

describe('core/fps', () => {
  it('считает среднее FPS и худший кадр по окну', () => {
    const meter = createFpsMeter(3)

    expect(meter.fps).toBe(0)
    expect(meter.worst).toBe(0)
    meter.push(10)
    meter.push(10)
    meter.push(40)
    meter.push(10)
    expect(meter.fps).toBe(50)
    expect(meter.worst).toBe(40)
    meter.push(0)
    expect(meter.fps).toBe(50)
  })

  it('isDebug читает ?debug', () => {
    expect(isDebug('?debug')).toBe(true)
    expect(isDebug('?a=1')).toBe(false)
    expect(isDebug()).toBe(false)
  })

  it('оверлей подключается к тикеру и снимается', () => {
    const ticker = { add: vi.fn(), remove: vi.fn() }
    const remove = mountFpsOverlay({ ticker }, () => 'x')
    const tick = ticker.add.mock.calls[0][0]

    for (let i = 0; i < 10; i++) tick()
    expect(document.querySelector('.fps').textContent).toMatch(/fps/)
    remove()
    expect(ticker.remove).toHaveBeenCalledWith(tick)
    expect(document.querySelector('.fps')).toBeNull()
  })
})
