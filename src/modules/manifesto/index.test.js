import { describe, expect, it } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init } from './index.js'

const html = `<section>
  <p data-scramble>// manifesto</p>
  <p data-reveal-words>We build rockets</p>
  <dd data-count="1204" data-suffix="+">0</dd>
  <dd data-count="7.8">0</dd>
</section>`

describe('manifesto', () => {
  it('режет абзац на слова, счётчики стартуют с нуля', () => {
    const el = mount(html)
    const instance = init(el, createCtx())

    expect(el.querySelector('[data-reveal-words]').children.length).toBe(3)
    expect(el.querySelectorAll('[data-count]')[0].textContent).toBe('0+')
    expect(el.querySelectorAll('[data-count]')[1].textContent).toBe('0.0')
    instance.destroy()
    expect(el.querySelector('[data-reveal-words]').textContent).toBe('We build rockets')
  })

  it('при reduced motion сразу показывает итоговые числа', () => {
    const el = mount(html)
    const instance = init(el, createCtx({ reduced: true }))

    expect(el.querySelectorAll('[data-count]')[0].textContent).toBe('1 204+')
    expect(el.querySelectorAll('[data-count]')[1].textContent).toBe('7.8')
    instance.destroy()
  })
})
