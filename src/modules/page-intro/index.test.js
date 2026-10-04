import { describe, expect, it } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init } from './index.js'

const html = `<header><p data-intro-eyebrow>// миссии</p><h1 data-intro-lines>Полвека полётов</h1><p data-intro-fade>Текст</p></header>`

describe('page-intro', () => {
  it('режет заголовок на строки и откатывает при destroy', () => {
    const el = mount(html)
    const instance = init(el, createCtx())

    expect(el.querySelector('[data-intro-lines]').children.length).toBeGreaterThan(0)
    instance.destroy()
    expect(el.querySelector('[data-intro-lines]').innerHTML).toBe('Полвека полётов')
  })

  it('при reduced motion ничего не трогает', () => {
    const el = mount(html)

    init(el, createCtx({ reduced: true })).destroy()
    expect(el.querySelector('[data-intro-lines]').innerHTML).toBe('Полвека полётов')
  })
})
