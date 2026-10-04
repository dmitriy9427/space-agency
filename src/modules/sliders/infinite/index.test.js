import { describe, expect, it } from 'vitest'
import { gsap } from '../../../core/gsap.js'
import { triggerIntersection } from '../../../../test/setup.js'
import { createCtx, mount, pointer, wait } from '../../../../test/helpers.js'
import { createDomRenderer } from './dom-renderer.js'
import { init, init3d } from './index.js'

const html = `<div>
  <div data-infinite-viewport tabindex="0" data-render="infinite" data-photos="p01,p02,p03,p04,p05,p06"></div>
  <button data-prev></button><p data-infinite-title></p><span data-infinite-counter></span><button data-next></button>
</div>`

/** Прогнать тикер GSAP на `seconds` вперёд. */
const advance = (seconds) => {
  for (let i = 0; i < seconds * 60; i++) gsap.ticker.tick()
}

describe('sliders/infinite', () => {
  it('подписи сразу, кнопки и стрелки двигают ленту', async () => {
    const el = mount(html)
    const slider = init(el, createCtx())

    expect(el.classList.contains('is-ready')).toBe(true)
    expect(el.querySelector('[data-infinite-counter]').textContent).toBe('01 / 06')
    expect(el.querySelectorAll('[data-infinite-slide]')[0].classList.contains('is-active')).toBe(true)

    triggerIntersection(el, true)
    el.querySelector('[data-next]').click()
    expect(slider.engine.targetIndex).toBe(1)
    el.querySelector('[data-infinite-viewport]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(slider.engine.targetIndex).toBe(2)
    el.querySelector('[data-prev]').click()
    el.querySelector('[data-infinite-viewport]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(slider.engine.targetIndex).toBe(0)

    el.querySelectorAll('[data-infinite-slide]')[3].click()
    expect(slider.engine.targetIndex).toBe(3)
    await wait(30)
    slider.destroy()
    expect(el.classList.contains('is-ready')).toBe(false)
  })

  it('горизонтальное колесо тянет ленту, вертикальное — нет', async () => {
    const el = mount(html)
    const slider = init(el, createCtx())
    const viewport = el.querySelector('[data-infinite-viewport]')
    const vertical = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    const horizontal = new WheelEvent('wheel', { deltaX: 120, cancelable: true })

    viewport.dispatchEvent(vertical)
    expect(vertical.defaultPrevented).toBe(false)
    viewport.dispatchEvent(horizontal)
    expect(horizontal.defaultPrevented).toBe(true)
    expect(slider.engine.dragging).toBe(true)
    await wait(200)
    expect(slider.engine.dragging).toBe(false)
    slider.destroy()
  })

  it('перетаскивание мышью через Observer', async () => {
    const el = mount(html)
    const slider = init(el, createCtx())
    const viewport = el.querySelector('[data-infinite-viewport]')

    triggerIntersection(el, true)
    pointer(viewport, 'pointerdown', { clientX: 300, clientY: 10 })
    expect(slider.engine.dragging).toBe(true)
    pointer(viewport, 'pointermove', { clientX: 200, clientY: 10 })
    await wait(40)
    advance(0.1)
    expect(slider.engine.position).toBeLessThan(0)
    pointer(viewport, 'pointerup', { clientX: 200, clientY: 10 })
    advance(0.1)
    expect(slider.engine.dragging).toBe(false)
    slider.destroy()
  })

  it('init3d без WebGL откатывается на DOM-версию', async () => {
    const el = mount(html)
    const slider = await init3d(el, createCtx())

    expect(el.classList.contains('is-gl')).toBe(false)
    expect(el.classList.contains('is-ready')).toBe(true)
    slider.destroy()
  })

  it('мало слайдов — пустой экземпляр', () => {
    const el = mount('<div><div data-infinite-viewport data-render="infinite" data-photos="p01,p02"></div></div>')

    expect(init(el, createCtx()).engine).toBeUndefined()
  })
})

describe('sliders/infinite/dom-renderer', () => {
  it('ставит transform, прячет дальние слайды и убирает всё в dispose', () => {
    const slides = Array.from({ length: 6 }, () => {
      const slide = document.createElement('div')

      slide.innerHTML = '<div data-infinite-art></div>'
      return slide
    })
    const renderer = createDomRenderer(slides)
    const engine = { speed: 0.5, offset: (i) => i * 300 }

    renderer.resize(800, 300)
    renderer.render(engine)
    expect(slides[0].style.transform).toContain('translate3d(250.0px')
    expect(slides[0].style.transform).toContain('skewX(-5.00deg)')
    expect(slides[5].style.visibility).toBe('hidden')
    expect(slides[1].style.getPropertyValue('--dim')).not.toBe('')
    renderer.dispose()
    expect(slides[0].style.transform).toBe('')
  })
})
