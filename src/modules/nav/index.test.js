import { describe, expect, it, vi } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init, shouldShowHeader } from './index.js'

describe('nav', () => {
  it('shouldShowHeader', () => {
    expect(shouldShowHeader(1, 50)).toBe(true)
    expect(shouldShowHeader(1, 500)).toBe(false)
    expect(shouldShowHeader(-1, 500)).toBe(true)
  })

  it('клик по якорю — плавная прокрутка через ScrollSmoother', () => {
    const el = mount(`<header><a href="#target">Go</a><a href="#">Top</a><span data-nav-progress></span></header><section id="target"></section>`)
    const smoother = { scrollTo: vi.fn() }
    const instance = init(el, createCtx({ smoother }))
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })

    el.querySelector('a').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(smoother.scrollTo).toHaveBeenCalledWith(document.getElementById('target'), true, 'top top')

    const empty = new MouseEvent('click', { bubbles: true, cancelable: true })

    el.querySelectorAll('a')[1].dispatchEvent(empty)
    expect(empty.defaultPrevented).toBe(false)
    instance.destroy()
  })

  it('без ScrollSmoother — ScrollToPlugin', () => {
    const el = mount(`<header><a href="#target">Go</a></header><section id="target"></section>`)
    const instance = init(el, createCtx({ reduced: true }))
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })

    expect(() => el.querySelector('a').dispatchEvent(event)).not.toThrow()
    expect(event.defaultPrevented).toBe(true)
    instance.destroy()
  })

  it('ссылка на другую страницу — не дело nav (её обработает роутер)', () => {
    const el = mount('<header><a href="/missions.html">Миссии</a></header>')
    const instance = init(el, createCtx())
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })

    el.querySelector('a').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    instance.destroy()
  })

  it('подсвечивает пункт текущей страницы и обновляет его после перехода', () => {
    const el = mount('<header class="is-hidden"><a href="/">Главная</a><a href="/missions.html">Миссии</a><a href="/#fleet">Слайдеры</a></header>')
    const ctx = createCtx()
    const instance = init(el, ctx)
    const [home, missions, fleet] = el.querySelectorAll('a')

    expect(home.getAttribute('aria-current')).toBe('page') // jsdom открыт на «/»
    expect(missions.hasAttribute('aria-current')).toBe(false)
    expect(fleet.hasAttribute('aria-current')).toBe(false) // ссылка с якорем — не «страница»
    expect(el.classList.contains('is-hidden')).toBe(false)

    history.pushState({}, '', '/missions.html')
    ctx.bus.emit('page:change', { page: 'missions' })
    expect(missions.getAttribute('aria-current')).toBe('page')
    expect(home.hasAttribute('aria-current')).toBe(false)
    history.pushState({}, '', '/')
    instance.destroy()
  })
})

