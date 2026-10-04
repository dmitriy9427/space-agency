import { describe, expect, it } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { setMedia } from '../../../test/setup.js'
import { createCtx, mount, pointer } from '../../../test/helpers.js'
import { init } from './index.js'

const html = `<div class="cursor"><canvas class="cursor__trail"></canvas><span class="cursor__ring"><span class="cursor__bubble"><span class="cursor__label"></span></span></span></div>
<button data-cursor="тяни" data-magnetic="0.5">Go</button>`

const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(1))

describe('cursor', () => {
  it('хвост рисуется в движении, подсказка — над [data-cursor]', () => {
    const el = mount(html)
    const cursor = init(el, createCtx())
    const button = document.querySelector('button')
    const ctx2d = el.querySelector('canvas').getContext('2d')

    expect(document.documentElement.classList.contains('has-cursor')).toBe(true)
    pointer(window, 'pointermove', { clientX: 10, clientY: 20 })
    pointer(window, 'pointermove', { clientX: 300, clientY: 200 })
    expect(el.classList.contains('is-visible')).toBe(true)
    expect(cursor.drawing).toBe(true)
    gsap.ticker.tick()
    expect(ctx2d.calls.some(([name]) => name === 'stroke')).toBe(true)

    pointer(button, 'pointerover')
    expect(el.classList.contains('is-active')).toBe(true)
    expect(el.querySelector('.cursor__label').textContent).toBe('тяни')
    pointer(document.body, 'pointerover')
    expect(el.classList.contains('is-active')).toBe(false)
    pointer(document.body, 'pointerdown')
    expect(el.classList.contains('is-pressed')).toBe(true)
    pointer(window, 'pointerup')
    expect(el.classList.contains('is-pressed')).toBe(false)
    pointer(document, 'pointerleave')
    expect(el.classList.contains('is-visible')).toBe(false)
    window.dispatchEvent(new Event('resize'))

    cursor.destroy()
    expect(document.documentElement.classList.contains('has-cursor')).toBe(false)
  })

  it('палец не рисует хвост', () => {
    const el = mount(html)
    const cursor = init(el, createCtx())

    pointer(window, 'pointermove', { clientX: 10, clientY: 20, pointerType: 'touch' })
    expect(cursor.drawing).toBe(false)
    cursor.destroy()
  })

  it('магнит работает и при повторном наведении', () => {
    // Регрессия: возврат с overwrite: true убивал quickTo — второй раз кнопка не тянулась.
    const el = mount(html)
    const cursor = init(el, createCtx())
    const button = document.querySelector('button')

    button.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40, right: 100, bottom: 40 })

    for (let round = 0; round < 2; round++) {
      pointer(button, 'pointermove', { clientX: 100, clientY: 40 })
      finish()
      expect(gsap.getProperty(button, 'x')).toBeCloseTo(25)
      expect(gsap.getProperty(button, 'y')).toBeCloseTo(10)
      // Курсор ушёл на другой элемент — кнопка упруго возвращается.
      pointer(document.body, 'pointermove', { clientX: 500, clientY: 500 })
      finish()
      expect(gsap.getProperty(button, 'x')).toBeCloseTo(0)
    }

    // Делегирование: магнит работает и у кнопки, добавленной ПОСЛЕ запуска модуля
    // (так появляются кнопки на страницах, загруженных роутером).
    const late = document.createElement('a')

    late.dataset.magnetic = ''
    late.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 })
    document.body.appendChild(late)
    pointer(late, 'pointermove', { clientX: 100, clientY: 20 })
    finish()
    expect(gsap.getProperty(late, 'x')).toBeCloseTo(17.5)
    cursor.destroy()
  })

  it('на тач-устройстве убирает разметку', () => {
    setMedia('(pointer: coarse)', true)

    const el = mount(html)

    init(el, createCtx()).destroy()
    expect(el.isConnected).toBe(false)
  })
})
