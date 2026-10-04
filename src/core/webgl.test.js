import { describe, expect, it, vi } from 'vitest'
import { createRenderLoop, observeSize, releaseRenderer } from './webgl.js'

describe('core/webgl', () => {
  it('createRenderLoop: старт/стоп и рендер только когда надо', () => {
    const ticker = { add: vi.fn(), remove: vi.fn() }
    const render = vi.fn()
    let allowed = false
    const loop = createRenderLoop({ ticker }, render, () => allowed)

    loop.start()
    loop.start()
    expect(ticker.add).toHaveBeenCalledTimes(1)
    expect(loop.running).toBe(true)

    const tick = ticker.add.mock.calls[0][0]

    tick(1, 16)
    expect(render).not.toHaveBeenCalled()
    allowed = true
    tick(1, 16)
    expect(render).toHaveBeenCalledWith(1, 0.016)
    loop.stop()
    loop.stop()
    expect(ticker.remove).toHaveBeenCalledTimes(1)
    expect(loop.running).toBe(false)
  })

  it('observeSize сразу сообщает размер', () => {
    const el = document.createElement('div')
    const onResize = vi.fn()
    const stop = observeSize(el, onResize)

    expect(onResize).toHaveBeenCalledWith({ width: 0, height: 0 })
    stop()
  })

  it('observeSize без ResizeObserver читает размер один раз', () => {
    const original = globalThis.ResizeObserver
    const onResize = vi.fn()

    globalThis.ResizeObserver = undefined
    try {
      observeSize(document.createElement('div'), onResize)()
    } finally {
      globalThis.ResizeObserver = original
    }
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('releaseRenderer освобождает контекст и убирает canvas', () => {
    const canvas = document.createElement('canvas')

    document.body.appendChild(canvas)

    const renderer = { dispose: vi.fn(), forceContextLoss: vi.fn(), domElement: canvas }

    releaseRenderer(renderer)
    expect(renderer.dispose).toHaveBeenCalled()
    expect(renderer.forceContextLoss).toHaveBeenCalled()
    expect(canvas.isConnected).toBe(false)
  })
})
