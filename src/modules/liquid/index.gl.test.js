import { describe, expect, it, vi } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { triggerIntersection } from '../../../test/setup.js'
import { createCtx, mount, pointer } from '../../../test/helpers.js'

vi.mock('../../core/env.js', async (importOriginal) => ({ ...(await importOriginal()), supportsWebGL: () => true }))
vi.mock('../../core/media.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadImage: async (src) => ({ src, naturalWidth: 1920, naturalHeight: 1080 }),
}))

const renderers = []
let unsupported = false

vi.mock('./ripple.scene.js', () => ({
  createRippleRenderer: (container, image) => {
    if (unsupported) return null

    const renderer = { image, steps: [], frames: 0, resize: vi.fn(), step: (drops) => renderer.steps.push(drops), render: () => renderer.frames++, dispose: vi.fn() }

    renderers.push(renderer)
    return renderer
  },
}))

const { init } = await import('./index.js')

const html = '<section><div data-liquid-stage><img data-liquid-photo src="/photos/p16.jpg" alt=""></div></section>'

describe('liquid (обвязка, WebGL замокан)', () => {
  it('курсор и клик дают капли, кадры только на экране', async () => {
    const el = mount(html)
    const liquid = await init(el, createCtx())
    const gl = renderers.at(-1)
    const stage = el.querySelector('[data-liquid-stage]')

    expect(el.classList.contains('is-gl')).toBe(true)
    expect(gl.image.src).toMatch(/\/photos\/p16\.jpg$/)
    expect(gl.resize).toHaveBeenCalled()

    gsap.ticker.tick()
    expect(gl.frames).toBe(0)

    triggerIntersection(el, true)
    pointer(stage, 'pointermove', { clientX: 10, clientY: 10 })
    pointer(stage, 'pointermove', { clientX: 40, clientY: 20 })
    pointer(stage, 'pointerdown', { clientX: 40, clientY: 20 })
    expect(liquid.queue.size).toBeGreaterThan(1)

    gsap.ticker.tick()
    expect(gl.frames).toBeGreaterThan(0)
    expect(gl.steps.flat().some((drop) => drop.strength === 0.8)).toBe(true)
    expect(liquid.queue.size).toBe(0)

    pointer(stage, 'pointerleave')
    triggerIntersection(el, false)

    const frames = gl.frames

    gsap.ticker.tick()
    expect(gl.frames).toBe(frames)

    liquid.destroy()
    expect(gl.dispose).toHaveBeenCalled()
    expect(el.classList.contains('is-gl')).toBe(false)
  })

  it('без float-текстур — обычное фото', async () => {
    unsupported = true
    try {
      const el = mount(html)
      const liquid = await init(el, createCtx())

      expect(el.classList.contains('is-gl')).toBe(false)
      liquid.destroy()
    } finally {
      unsupported = false
    }
  })

  it('без фото в разметке — пустой экземпляр', async () => {
    const instance = await init(mount('<section></section>'), createCtx())

    expect(instance.queue).toBeUndefined()
  })
})
