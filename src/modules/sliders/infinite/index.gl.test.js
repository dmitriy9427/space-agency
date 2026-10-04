import { describe, expect, it, vi } from 'vitest'
import { gsap } from '../../../core/gsap.js'
import { triggerIntersection } from '../../../../test/setup.js'
import { createCtx, mount } from '../../../../test/helpers.js'

vi.mock('../../../core/env.js', async (importOriginal) => ({ ...(await importOriginal()), supportsWebGL: () => true }))

vi.mock('../../../core/media.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadImage: async (src) => ({ src, naturalWidth: 800, naturalHeight: 600 }),
}))

const renderers = []

vi.mock('./infinite.scene.js', () => ({
  createGlRenderer: (container, images, quality, options) => {
    const renderer = { images, options, frames: 0, resize: vi.fn(), render: () => renderer.frames++, dispose: vi.fn() }

    renderers.push(renderer)
    return renderer
  },
}))

const { init3d } = await import('./index.js')

describe('sliders/infinite init3d (обвязка, WebGL замокан)', () => {
  it('загружает фото слайдов и отдаёт их рендереру с настройками', async () => {
    const el = mount(`<div data-curve="0.8">
      <div data-infinite-viewport data-render="infinite" data-photos="p01,p02,p03,p04"></div>
      <button data-next></button>
    </div>`)
    const slider = await init3d(el, createCtx({ quality: { tier: 'high', dpr: 1 } }))
    const gl = renderers[0]

    expect(el.classList.contains('is-gl')).toBe(true)
    expect(gl.images).toHaveLength(4)
    expect(gl.images[0].src).toMatch(/\/photos\/p01\.jpg$/)
    expect(gl.options).toEqual({ curve: 0.8, reflection: 0.35 })
    expect(gl.resize).toHaveBeenCalled()

    triggerIntersection(el, true)
    el.querySelector('[data-next]').click()
    gsap.ticker.tick()
    expect(gl.frames).toBeGreaterThan(0)

    slider.destroy()
    expect(gl.dispose).toHaveBeenCalled()
    expect(el.classList.contains('is-gl')).toBe(false)
  })

  it('на слабом устройстве отражение выключено', async () => {
    const el = mount('<div><div data-infinite-viewport data-render="infinite" data-photos="p01,p02,p03,p04"></div></div>')
    const slider = await init3d(el, createCtx())

    expect(renderers.at(-1).options.reflection).toBe(0)
    slider.destroy()
  })
})
