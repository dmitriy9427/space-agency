import { describe, expect, it, vi } from 'vitest'
import { gsap } from '../../../core/gsap.js'
import { triggerIntersection } from '../../../../test/setup.js'
import { createCtx, mount, pointer, wait } from '../../../../test/helpers.js'

vi.mock('../../../core/env.js', async (importOriginal) => ({ ...(await importOriginal()), supportsWebGL: () => true }))

vi.mock('../../../core/media.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadImage: async (src) => ({ src, naturalWidth: 800, naturalHeight: 600 }),
}))

const renderers = []

vi.mock('./shader.scene.js', () => ({
  createShaderRenderer: (container, images) => {
    const renderer = {
      images,
      pair: null,
      progress: 0,
      frames: 0,
      setPair(from, to) {
        renderer.pair = [from, to]
      },
      setProgress(progress, dir) {
        renderer.progress = progress
        renderer.direction = [...dir]
      },
      setMouse: vi.fn(),
      setAccent: vi.fn(),
      resize: vi.fn(),
      render() {
        renderer.frames++
      },
      dispose: vi.fn(),
    }

    renderers.push(renderer)
    return renderer
  },
}))

const { init } = await import('./index.js')

const html = `<div>
  <div data-shader-stage tabindex="0" data-render="shader" data-photos="p01,p02,p03"></div>
  <h4 data-shader-title></h4><p data-shader-text></p><span data-shader-counter></span>
  <button data-prev></button><button data-next></button>
</div>`

const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(1))

describe('sliders/shader (обвязка, WebGL замокан)', () => {
  it('кнопки ведут переход шейдером, кадры только на экране', async () => {
    const el = mount(html)
    const slider = await init(el, createCtx())
    const gl = renderers.at(-1)

    expect(el.classList.contains('is-gl')).toBe(true)
    expect(gl.images).toHaveLength(3)
    expect(gl.pair).toEqual([0, 0])

    el.querySelector('[data-next]').click()
    expect(gl.pair).toEqual([0, 1])
    expect(gl.direction).toEqual([-1, 0])
    expect(gl.setAccent).toHaveBeenCalled()
    el.querySelector('[data-next]').click() // во время перехода игнорируется
    finish()
    expect(slider.index).toBe(1)
    expect(gl.pair).toEqual([1, 1])

    triggerIntersection(el, true)
    gsap.ticker.tick()
    expect(gl.frames).toBeGreaterThan(0)

    // Стрелка вниз — следующий по вертикали: граница едет вверх.
    el.querySelector('[data-shader-stage]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    finish() // направление уходит в шейдер на первом кадре твина
    expect(gl.direction).toEqual([0, 1])
    expect(slider.index).toBe(2)

    pointer(el.querySelector('[data-shader-stage]'), 'pointermove', { clientX: 5, clientY: 5 })
    expect(gl.setMouse).toHaveBeenCalled()
    slider.destroy()
    expect(gl.dispose).toHaveBeenCalled()
  })

  it('вертикальный жест: тянем вверх — следующий снизу', async () => {
    const el = mount(html)
    const slider = await init(el, createCtx())
    const gl = renderers.at(-1)
    const stage = el.querySelector('[data-shader-stage]')

    Object.defineProperty(stage, 'clientHeight', { value: 1000 })
    pointer(stage, 'pointerdown', { clientX: 10, clientY: 800 })
    pointer(stage, 'pointermove', { clientX: 10, clientY: 400 })
    await wait(40)
    expect(gl.direction).toEqual([0, 1])
    expect(gl.pair).toEqual([0, 1])
    pointer(stage, 'pointerup', { clientX: 10, clientY: 400 })
    finish()
    expect(slider.index).toBe(1)
    slider.destroy()
  })

  it('перетаскивание тянет границу, короткий жест откатывается', async () => {
    const el = mount(html)
    const slider = await init(el, createCtx())
    const gl = renderers.at(-1)
    const stage = el.querySelector('[data-shader-stage]')

    Object.defineProperty(stage, 'clientWidth', { value: 1000 })
    pointer(stage, 'pointerdown', { clientX: 500, clientY: 10 })
    pointer(stage, 'pointermove', { clientX: 420, clientY: 10 })
    await wait(40)
    expect(gl.progress).toBeGreaterThan(0)
    // Тянули влево — граница едет влево (dir = [-1, 0]), открываем следующий.
    expect(gl.direction).toEqual([-1, 0])
    pointer(stage, 'pointerup', { clientX: 420, clientY: 10 })
    finish()
    expect(slider.index).toBe(0)
    slider.destroy()
  })

  it('во время перехода жест игнорируется целиком — переход не прерывается и не откатывается', async () => {
    const el = mount(html)
    const slider = await init(el, createCtx())
    const gl = renderers.at(-1)
    const stage = el.querySelector('[data-shader-stage]')

    Object.defineProperty(stage, 'clientWidth', { value: 1000 })
    el.querySelector('[data-next]').click() // переход 0 → 1 начался
    gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(0.5))
    expect(gl.progress).toBeCloseTo(0.5, 1)

    // Свайп в обратную сторону посреди анимации — ничего не должен менять.
    pointer(stage, 'pointerdown', { clientX: 300, clientY: 10 })
    pointer(stage, 'pointermove', { clientX: 700, clientY: 10 })
    await wait(40)
    pointer(stage, 'pointerup', { clientX: 700, clientY: 10 })
    expect(gl.pair).toEqual([0, 1])
    expect(gl.direction).toEqual([-1, 0])

    finish()
    expect(slider.index).toBe(1)
    slider.destroy()
  })
})

