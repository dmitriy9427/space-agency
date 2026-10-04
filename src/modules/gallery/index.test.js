import { describe, expect, it } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { triggerIntersection } from '../../../test/setup.js'
import { createCtx, mount, pointer, wait } from '../../../test/helpers.js'
import { init } from './index.js'

const html = `<section style="--gallery-columns: 3">
  <div data-gallery-pin><div data-gallery-viewport tabindex="0"><div data-gallery-grid data-render="gallery" data-photos="p01,p02,p03,p04,p05,p06,p07,p08,p09"></div></div></div>
</section>`

const advance = (frames = 30) => {
  for (let i = 0; i < frames; i++) gsap.ticker.tick()
}

describe('gallery', () => {
  it('включается и снимается без следов', () => {
    const el = mount(html)
    const gallery = init(el, createCtx())
    const items = el.querySelectorAll('[data-gallery-item]')

    expect(el.classList.contains('is-active')).toBe(true)
    expect(items[0].querySelector('img')).not.toBeNull()
    expect(items[0].style.transform).toContain('translate3d')

    gallery.destroy()
    expect(el.classList.contains('is-active')).toBe(false)
    expect(items[0].style.transform).toBe('')
  })

  it('перетаскивание, стрелки и колесо двигают сетку', async () => {
    const el = mount(html)
    const gallery = init(el, createCtx())
    const viewport = el.querySelector('[data-gallery-viewport]')

    triggerIntersection(el, true)
    pointer(viewport, 'pointerdown', { clientX: 100, clientY: 100 })
    pointer(viewport, 'pointermove', { clientX: 40, clientY: 60 })
    // Observer собирает движения до кадра (debounce, нативный rAF).
    await wait(40)
    expect(el.classList.contains('is-dragging')).toBe(true)
    pointer(viewport, 'pointerup', { clientX: 40, clientY: 60 })
    expect(el.classList.contains('is-dragging')).toBe(false)

    // Клик сразу после перетаскивания гасится.
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })

    viewport.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)

    const key = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })

    viewport.dispatchEvent(key)
    expect(key.defaultPrevented).toBe(true)
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

    const wheel = new WheelEvent('wheel', { deltaX: 50, cancelable: true })

    viewport.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 50, cancelable: true }))

    gallery.moveBy(10, 10)
    pointer(viewport, 'pointerenter')
    advance()
    pointer(viewport, 'pointerleave')
    // В jsdom нет DragEvent — обычное событие с тем же именем.
    const dragstart = new Event('dragstart', { bubbles: true, cancelable: true })

    viewport.dispatchEvent(dragstart)
    expect(dragstart.defaultPrevented).toBe(true)
    triggerIntersection(el, false)
    advance(2)
    gallery.destroy()
  })

  it('при reduced motion без сжатия и наклона', () => {
    const el = mount(html)
    const gallery = init(el, createCtx({ reduced: true }))

    triggerIntersection(el, true)
    gallery.moveBy(500, 0)
    advance(2)
    expect(el.querySelector('[data-gallery-item]').style.transform).not.toContain('rotateX')
    expect(el.querySelector('[data-gallery-item]').style.transform).toContain('scale(1.0000)')
    gallery.destroy()
  })

  it('без сетки — пустой экземпляр', () => {
    expect(init(mount('<section></section>'), createCtx()).moveBy).toBeUndefined()
  })

  it('клик по карточке открывает лайтбокс, после перетаскивания — нет', async () => {
    const el = mount(html)
    const gallery = init(el, createCtx({ reduced: true }))
    const img = el.querySelector('[data-gallery-item] img')

    img.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(gallery.lightbox.isOpen).toBe(true)
    const finish = () => gsap.globalTimeline.getChildren(false, true, true).forEach((animation) => animation.progress(1))

    finish()
    gallery.lightbox.close()
    finish()
    expect(gallery.lightbox.isOpen).toBe(false)

    // Enter на карточке тоже открывает.
    el.querySelector('[data-gallery-item]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(gallery.lightbox.isOpen).toBe(true)
    gallery.destroy()
  })
})

