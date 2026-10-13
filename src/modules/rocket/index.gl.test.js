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

  it('запуск: путь по сценарию, но носом вверх; после прибытия — обычный сценарий', async () => {
    const canvas = mount('<canvas></canvas><section data-flight="hero"></section><section data-flight="final"></section>')
    // Прокрутка «в конце страницы»: по сценарию ракета здесь носом вниз (точка final).
    const ctx = createCtx({ getScroll: () => 99999 })
    const rocket = await init(canvas, ctx)
    const scene = scenes[0]
    const frame = () => {
      gsap.ticker.tick()
      return scene.flight
    }
    const scripted = { ...frame() }

    expect(Math.cos((scripted.roll * Math.PI) / 180)).toBeCloseTo(-1)

    ctx.bus.emit('launch')
    expect(scene.boosted).toBeGreaterThan(1)

    const flying = frame()

    expect(Math.cos((flying.roll * Math.PI) / 180)).toBeCloseTo(1) // нос вверх
    expect(flying.x).toBe(scripted.x) // место — то же, что по сценарию
    expect(flying.y).toBe(scripted.y)
    expect(flying.thrust).toBeGreaterThan(scripted.thrust)

    ctx.bus.emit('launch:arrived')
    finish()
    expect(frame().roll).toBeCloseTo(scripted.roll)
    expect(typeof ctx.flightTimeline).toBe('function')
    rocket.destroy()
  })

  it('запуск прерван пользователем — нос плавно возвращается; reduced — нос не трогаем', async () => {
    const html = '<canvas></canvas><section data-flight="hero"></section><section data-flight="final"></section>'
    const ctx = createCtx({ getScroll: () => 99999 })
    const rocket = await init(mount(html), ctx)
    const scene = scenes[0]

    gsap.ticker.tick()

    const scripted = scene.flight.roll

    ctx.bus.emit('launch')
    ctx.bus.emit('launch:aborted')
    gsap.ticker.tick()
    finish()
    gsap.ticker.tick()
    expect(scene.flight.roll).toBeCloseTo(scripted)
    rocket.destroy()

    scenes.length = 0

    const reducedCtx = createCtx({ reduced: true, getScroll: () => 99999 })
    const still = await init(mount(html), reducedCtx)

    reducedCtx.bus.emit('launch')
    gsap.ticker.tick()
    expect(scenes[0].flight.roll).toBeCloseTo(scripted)
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
