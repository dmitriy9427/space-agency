import { describe, expect, it } from 'vitest'
import { gsap } from '../../../core/gsap.js'
import { createCtx, mount } from '../../../../test/helpers.js'
import { init } from './index.js'

const html = `<div>
  <div data-shader-stage tabindex="0" data-render="shader" data-photos="p01,p02,p03"></div>
  <h4 data-shader-title></h4><p data-shader-text></p><span data-shader-counter></span>
  <button data-prev></button><button data-next></button>
</div>`

const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(1))

describe('sliders/shader (без WebGL — кроссфейд DOM)', () => {
  it('показывает первый слайд и листает', async () => {
    const el = mount(html)
    const slider = await init(el, createCtx({ reduced: true }))
    const slides = el.querySelectorAll('[data-shader-slide]')

    expect(el.classList.contains('is-gl')).toBe(false)
    expect(slides[0].querySelector('img')).not.toBeNull()
    expect(el.querySelector('[data-shader-counter]').textContent).toBe('01 / 03')
    expect(el.querySelector('[data-shader-title]').textContent).toBe(slides[0].dataset.title)

    el.querySelector('[data-next]').click()
    finish()
    expect(slider.index).toBe(1)
    expect(el.querySelector('[data-shader-title]').textContent).toBe(slides[1].dataset.title)

    el.querySelector('[data-shader-stage]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true }))
    finish()
    expect(slider.index).toBe(0)
    el.querySelector('[data-prev]').click()
    finish()
    expect(slider.index).toBe(2)
    slider.destroy()
  })

  it('с анимацией заголовок режется на буквы', async () => {
    const el = mount(html)
    const slider = await init(el, createCtx())

    expect(el.querySelector('[data-shader-title]').children.length).toBeGreaterThan(0)
    slider.go('next-y')
    slider.destroy()
  })

  it('мало слайдов — пустой экземпляр', async () => {
    const slider = await init(mount('<div><div data-shader-stage data-render="shader" data-photos="p01"></div></div>'), createCtx())

    expect(slider.index).toBeUndefined()
  })
})
