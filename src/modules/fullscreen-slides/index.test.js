import { describe, expect, it } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { createCtx, mount } from '../../../test/helpers.js'
import { init, routeFraction } from './index.js'

const html = `<section>
  <div data-render="destinations"></div>
  <span data-fslides-counter></span>
  <button data-fslides-dot></button><button data-fslides-dot></button><button data-fslides-dot></button>
  <button data-fslides-dot></button><button data-fslides-dot></button><button data-fslides-dot></button>
  <!-- Мини-схема (MotionPath) не включена: в jsdom нет SVG-геометрии, она проверяется в браузере. -->
</section>`

// Промотать верхнеуровневые анимации, включая таймлайны (смена слайда — таймлайн).
const finish = () => gsap.globalTimeline.getChildren(false, true, true).forEach((animation) => animation.progress(1))

describe('fullscreen-slides', () => {
  it('routeFraction: равномерно от 0 до 1', () => {
    expect(routeFraction(0, 6)).toBe(0)
    expect(routeFraction(5, 6)).toBe(1)
    expect(routeFraction(2, 5)).toBe(0.5)
    expect(routeFraction(0, 1)).toBe(0)
  })

  it('стрелки, точки и переход по кругу', () => {
    const el = mount(html)
    const slides = init(el, createCtx({ reduced: true }))
    const counter = el.querySelector('[data-fslides-counter]')

    finish()
    expect(slides.index).toBe(0)
    expect(counter.textContent).toBe('01 / 06')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    finish()
    expect(slides.index).toBe(1)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', cancelable: true }))
    finish()
    expect(slides.index).toBe(0)

    // Назад с первого — на последний (по кругу).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }))
    finish()
    expect(slides.index).toBe(5)

    el.querySelectorAll('[data-fslides-dot]')[2].click()
    finish()
    expect(slides.index).toBe(2)
    expect(el.querySelectorAll('[data-fslides-dot]')[2].classList.contains('is-active')).toBe(true)

    slides.goTo(2, 1) // тот же — ничего
    slides.destroy()
    expect(el.querySelector('[data-fslide-title]').textContent).toBe('Луна')
  })

  it('меньше двух слайдов — пустой экземпляр', () => {
    expect(init(mount('<section></section>'), createCtx()).index).toBeUndefined()
  })
})
