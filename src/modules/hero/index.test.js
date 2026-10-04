import { describe, expect, it } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init } from './index.js'

const html = `<section>
  <div data-hero-parallax><p data-hero-eyebrow>Est. 2026</p><h1 data-hero-title>Beyond the noise</h1><p data-hero-fade>Lead</p></div>
  <p data-hero-hint>Scroll</p>
</section>`

describe('hero', () => {
  it('режет заголовок на буквы и откатывает при destroy', () => {
    const el = mount(html)
    const instance = init(el, createCtx())
    const title = el.querySelector('[data-hero-title]')

    expect(title.querySelectorAll('.hero__char').length).toBe('Beyondthenoise'.length)
    instance.destroy()
    expect(title.innerHTML).toBe('Beyond the noise')
  })

  it('при reduced motion разметку не трогает', () => {
    const el = mount(html)
    const instance = init(el, createCtx({ reduced: true }))

    expect(el.querySelector('.hero__char')).toBeNull()
    instance.destroy()
  })
})
