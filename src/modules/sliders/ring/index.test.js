import { describe, expect, it } from 'vitest'
import { gsap } from '../../../core/gsap.js'
import { createCtx, mount } from '../../../../test/helpers.js'
import { init } from './index.js'

const html = `<div>
  <div data-ring-stage tabindex="0"><div data-ring-spinner data-render="ring" data-photos="p01,p02,p03,p04,p05,p06"></div></div>
  <button data-prev></button><span data-ring-counter></span><button data-next></button>
</div>`

const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(1))

describe('sliders/ring', () => {
  it('раскладывает карточки по кругу и крутится кнопками', () => {
    const el = mount(html)
    const ring = init(el, createCtx())
    const cards = el.querySelectorAll('[data-ring-card]')

    expect(cards[1].style.transform).toContain('rotateY(60deg)')
    expect(el.querySelector('[data-ring-counter]').textContent).toBe('01 / 06')
    expect(cards[0].classList.contains('is-active')).toBe(true)

    el.querySelector('[data-next]').click()
    finish()
    expect(ring.index).toBe(1)
    expect(el.querySelector('[data-ring-counter]').textContent).toBe('02 / 06')

    el.querySelector('[data-ring-stage]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    finish()
    expect(ring.index).toBe(0)

    cards[4].click()
    finish()
    expect(ring.index).toBe(4)

    ring.goTo(2)
    finish()
    expect(ring.index).toBe(2)
    el.querySelector('[data-prev]').click()
    el.querySelector('[data-ring-stage]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    ring.destroy()
  })

  it('без разметки — пустой экземпляр', () => {
    expect(init(mount('<div></div>'), createCtx()).destroy).toBeTypeOf('function')
  })
})
