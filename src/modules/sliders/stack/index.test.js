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
  it('кнопки и клавиши уводят верхнюю карточку под низ — в обе стороны, без возвратов', () => {
    const el = mount(html)
    const stack = init(el, createCtx())

    expect(el.querySelector('[data-stack-counter]').textContent).toBe('01 / 04')
    el.querySelector('[data-next]').click()
    finish()
    expect(stack.order).toEqual([1, 2, 3, 0])
    expect(el.querySelector('[data-stack-counter]').textContent).toBe('02 / 04')

    // ← после → не возвращает ушедшую, а уводит следующую.
    el.querySelector('[data-prev]').click()
    finish()
    expect(stack.order).toEqual([2, 3, 0, 1])

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    finish()
    expect(stack.order).toEqual([3, 0, 1, 2])
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    finish()
    expect(stack.order).toEqual([0, 1, 2, 3]) // полный круг
    stack.destroy()
  })

  it('карточка улетает по направлению стрелки: → вправо, ← влево', () => {
    const el = mount(html)
    const stack = init(el, createCtx())
    const cards = el.querySelectorAll('[data-stack-card]')

    // В jsdom нет раскладки — задаём ширину, чтобы стороны (знак x) были видны.
    cards.forEach((card) => Object.defineProperty(card, 'offsetWidth', { value: 300 }))

    el.querySelector('[data-next]').click()
    expect(gsap.getTweensOf(cards[0])[0].vars.x).toBeGreaterThan(0)
    finish()

    // Сразу в другую сторону: следующая карточка улетает ВЛЕВО, ушедшая не возвращается.
    el.querySelector('[data-prev]').click()
    expect(gsap.getTweensOf(cards[1])[0].vars.x).toBeLessThan(0)
    finish()
    expect(stack.order).toEqual([2, 3, 0, 1])
    stack.destroy()
  })

  it('меньше двух карточек — пустой экземпляр', () => {
    expect(init(mount('<div><div data-render="stack" data-photos="p01"></div></div>'), createCtx()).order).toBeUndefined()
  })
})
