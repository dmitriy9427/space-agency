import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { createCtx, mount } from '../../../test/helpers.js'

// WebGL «есть», а three-сцену заменяем фейком: проверяем обвязку, а не рендер.
vi.mock('../../core/env.js', async (importOriginal) => ({ ...(await importOriginal()), supportsWebGL: () => true }))

const scenes = []

vi.mock('./rocket.scene.js', () => ({
  RocketScene: class {
    constructor(canvas, quality) {
      this.canvas = canvas
      this.quality = quality
      this.calls = { render: 0, update: 0 }
      this.separation = 0
      this.boosted = 0
      this.drawCalls = 7
      scenes.push(this)
    }
    setFlight(flight) {
      this.flight = flight
    }
    setPointer(x, y) {
      this.pointer = { x, y }
    }
    setScroll(scroll, thrust) {
      this.thrust = thrust
    }
    setSeparation(value) {
      this.separation = value
    }
    boost(strength) {
      this.boosted = strength
    }
    resize(w, h) {
      this.size = [w, h]
    }
    update() {
      this.calls.update++
    }
    render() {
      this.calls.render++
    }
    dispose() {
      this.disposed = true
    }
  },
}))

const { init, SEPARATION_SCENE } = await import('./index.js')

const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(1))

describe('rocket (обвязка, WebGL замокан)', () => {
  beforeEach(() => (scenes.length = 0))

  it('рисует кадры, слушает шину и чисто снимается', async () => {
    const canvas = mount('<canvas></canvas><section data-flight="hero"></section><section data-flight="story"></section>')
    const ctx = createCtx()

    ctx.bus.emit('story:scene', SEPARATION_SCENE)

    const rocket = await init(canvas, ctx)
    const scene = scenes[0]

    expect(ctx.rocket).toBe(scene)
    expect(scene.size).toEqual([0, 0])
    expect(rocket.timeline.map((p) => p.state)).toHaveLength(2)

    // replay: история уже была на сцене разделения до загрузки ракеты.
    finish()
    expect(scene.separation).toBe(1)

    ctx.bus.emit('story:scene', 0)
    finish()
    expect(scene.separation).toBe(0)

    ctx.bus.emit('launch')
    expect(scene.boosted).toBeGreaterThan(1)

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: window.innerWidth, clientY: 0 }))
    gsap.ticker.tick()
    expect(scene.calls.render).toBeGreaterThan(0)
    expect(scene.flight).toBeTruthy()

    rocket.destroy()
    expect(scene.disposed).toBe(true)
    expect(ctx.rocket).toBeNull()
  })

  const noseY = (flight) => Math.cos((flight.roll * Math.PI) / 180)
  const html = '<canvas></canvas><section data-flight="hero"></section><section data-flight="final"></section>'

  it('пуск: место по сценарию, нос сразу вверх', async () => {
    // Прокрутка «в конце страницы»: по сценарию ракета здесь носом вниз (точка final).
    const ctx = createCtx({ getScroll: () => 99999 })
    const rocket = await init(mount(html), ctx)
    const scene = scenes[0]
    const frame = () => {
      gsap.ticker.tick()
      return scene.flight
    }
    const scripted = { ...frame() }

    expect(noseY(scripted)).toBeCloseTo(-1)

    ctx.bus.emit('launch')
    expect(scene.boosted).toBeGreaterThan(1)

    const flying = frame()

    expect(noseY(flying)).toBeCloseTo(1) // нос вверх
    expect(flying.x).toBe(scripted.x) // место — то же, что по сценарию
    expect(flying.y).toBe(scripted.y)
    expect(flying.thrust).toBeGreaterThan(scripted.thrust)
    expect(typeof ctx.flightTimeline).toBe('function')
    rocket.destroy()
  })

  it('крутим вверх — нос вверх, крутим вниз — обратно к сценарию; reduced — нос не трогаем', async () => {
    let scroll = 50000
    const ctx = createCtx({ getScroll: () => scroll })
    const rocket = await init(mount(html), ctx)
    const scene = scenes[0]
    // Несколько кадров с прокруткой на `step` px за кадр.
    const run = (step, frames = 2000) => {
      for (let i = 0; i < frames; i++) {
        scroll += step
        gsap.ticker.tick()
      }
      return scene.flight
    }

    expect(noseY(run(0, 3))).toBeCloseTo(-1) // стоим: сценарий, нос вниз
    expect(noseY(run(-40))).toBeGreaterThan(0.95) // едем вверх: нос плавно поворачивается вверх
    expect(noseY(run(0, 300))).toBeGreaterThan(0.95) // остановились: направление помним
    expect(noseY(run(40))).toBeLessThan(-0.95) // снова вниз: обычный сценарий
    rocket.destroy()

    scenes.length = 0
    scroll = 50000

    const still = await init(mount(html), createCtx({ reduced: true, getScroll: () => scroll }))

    for (let i = 0; i < 60; i++) {
      scroll -= 40
      gsap.ticker.tick()
    }
    expect(noseY(scenes[0].flight)).toBeCloseTo(-1)
    still.destroy()
  })

  it('не рисует, пока экран закрыт непрозрачной секцией', async () => {
    const canvas = mount('<canvas></canvas><section data-occlude></section>')
    const cover = document.querySelector('[data-occlude]')

    cover.getBoundingClientRect = () => ({ top: -10, bottom: window.innerHeight + 10 })

    const rocket = await init(canvas, createCtx({ reduced: true }))
    const scene = scenes[0]

    gsap.ticker.tick()
    expect(scene.calls.render).toBe(0)

    cover.getBoundingClientRect = () => ({ top: 200, bottom: window.innerHeight + 10 })
    gsap.ticker.tick()
    expect(scene.calls.render).toBe(1)
    rocket.destroy()
  })
})
