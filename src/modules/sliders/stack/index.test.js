import { describe, expect, it } from 'vitest'
import { gsap } from '../../../core/gsap.js'
import { createCtx, mount } from '../../../../test/helpers.js'
import { init } from './index.js'

const html = `<div tabindex="0">
  <div data-render="stack" data-photos="p01,p02,p03,p04"></div>
  <button data-prev></button><span data-stack-counter></span><button data-next></button>
</div>`

const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(1))

describe('sliders/stack', () => {
  it('next уводит верхнюю карточку под низ, prev возвращает', () => {
    const el = mount(html)
    const stack = init(el, createCtx())

    expect(el.querySelector('[data-stack-counter]').textContent).toBe('01 / 04')
    el.querySelector('[data-next]').click()
    finish()
    expect(stack.order).toEqual([1, 2, 3, 0])
    expect(el.querySelector('[data-stack-counter]').textContent).toBe('02 / 04')

    el.querySelector('[data-prev]').click()
    finish()
    expect(stack.order).toEqual([0, 1, 2, 3])

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    finish()
    expect(stack.order[0]).toBe(1)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    finish()
    expect(stack.order[0]).toBe(0)
    stack.destroy()
  })

  it('карточка движется по направлению стрелки: ← бросает влево, → возвращает ушедшую влево', () => {
    const el = mount(html)
    const stack = init(el, createCtx())
    const cards = el.querySelectorAll('[data-stack-card]')

    // В jsdom нет раскладки — задаём ширину, чтобы стороны (знак x) были видны.
    cards.forEach((card) => Object.defineProperty(card, 'offsetWidth', { value: 300 }))

    const left = el.querySelector('[data-prev]')
    const right = el.querySelector('[data-next]')

    // Истории нет — ← бросает верхнюю ВЛЕВО.
    left.click()
    const throwTween = gsap.getTweensOf(cards[0])[0]

    expect(throwTween.vars.x).toBeLessThan(0)
    finish()
    expect(stack.order).toEqual([1, 2, 3, 0])

    // Последняя ушла влево, снова ← — бросаем следующую тоже влево.
    left.click()
    finish()
    expect(stack.order).toEqual([2, 3, 0, 1])

    // → — движение вправо возвращает карточку, ушедшую влево: прилетает СЛЕВА.
    right.click()
    const back = gsap.getTweensOf(cards[1])[0]

    expect(gsap.getProperty(cards[1], 'x')).toBeLessThan(0) // стартовая точка fromTo — слева
    expect(back).toBeTruthy()
    finish()
    expect(stack.order).toEqual([1, 2, 3, 0])

    // Ещё → — возвращает и карточку 0 (тоже ушла влево).
    right.click()
    finish()
    expect(stack.order).toEqual([0, 1, 2, 3])

    // История пуста — → бросает верхнюю ВПРАВО.
    right.click()
    expect(gsap.getTweensOf(cards[0])[0].vars.x).toBeGreaterThan(0)
    finish()
    stack.destroy()
  })

  it('меньше двух карточек — пустой экземпляр', () => {
    expect(init(mount('<div><div data-render="stack" data-photos="p01"></div></div>'), createCtx()).order).toBeUndefined()
  })
})
