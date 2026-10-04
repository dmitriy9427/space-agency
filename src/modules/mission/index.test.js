import { describe, expect, it, vi } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { createCtx, mount } from '../../../test/helpers.js'
import { COUNTDOWN_FROM, init } from './index.js'

const html = `<footer>
  <ol><li data-terminal-line>&gt; link OK</li><li data-terminal-line>&gt; GO</li></ol>
  <span data-countdown></span><button data-launch>Launch</button><span data-sparks></span>
  <div data-marquee><span>A</span><span>A</span></div>
</footer>`

describe('mission', () => {
  it('готовит терминал и отсчёт', () => {
    const el = mount(html)
    const instance = init(el, createCtx())

    expect(el.querySelector('[data-countdown]').textContent).toBe('T−05')
    expect(el.querySelector('[data-terminal-line]').textContent).toBe('')
    instance.destroy()
  })

  it('запуск: отсчёт, искры, событие launch, повторный клик игнорируется', () => {
    const el = mount(html)
    const ctx = createCtx()
    const onLaunch = vi.fn()

    ctx.bus.on('launch', onLaunch)

    const instance = init(el, ctx)
    const button = el.querySelector('[data-launch]')

    button.click()
    expect(button.disabled).toBe(true)
    expect(el.classList.contains('is-counting')).toBe(true)
    button.click()

    // Проматываем все твины отсчёта.
    gsap.globalTimeline.getChildren(false, true, true).forEach((tl) => tl.progress(1))
    expect(onLaunch).toHaveBeenCalledTimes(1)
    expect(el.classList.contains('is-launched')).toBe(true)
    expect(el.querySelectorAll('.mission__spark').length).toBe(46)
    expect(COUNTDOWN_FROM).toBe(5)
    instance.destroy()
  })

  it('при reduced motion текст терминала не стирается', () => {
    const el = mount(html)
    const instance = init(el, createCtx({ reduced: true }))

    expect(el.querySelector('[data-terminal-line]').textContent).toBe('> link OK')
    instance.destroy()
  })
})
