import { describe, expect, it, vi } from 'vitest'
import { gsap } from '../../../core/gsap.js'
import { createCtx, mount, pointer } from '../../../../test/helpers.js'
import { HOVER_DELAY, LEAVE_DELAY, init } from './index.js'

const html = `<div style="--vstrip-card-width: 200px"><div data-vstrip-track data-render="videos"></div></div>`

const stubVideos = (el) =>
  el.querySelectorAll('video').forEach((video) => {
    video.play = vi.fn(() => Promise.resolve())
    video.pause = vi.fn()
  })

const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => tween.progress(1))

describe('sliders/video-strip', () => {
  it('раскрытие: ширины и сдвиг ленты — в одном такте (синхронно)', () => {
    const el = mount(html)

    stubVideos(el)

    const strip = init(el, createCtx())
    const cards = el.querySelectorAll('[data-vstrip-card]')

    strip.expand(cards[2])
    // Новая карточка раскрывается, дорожка едет — твины с одинаковой длительностью и кривой.
    const grow = gsap.getTweensOf(cards[2])[0]
    const move = gsap.getTweensOf(el.querySelector('[data-vstrip-track]'))[0]

    expect(grow.duration()).toBe(move.duration())
    expect(grow.vars.ease).toBe(move.vars.ease)
    expect(strip.active).toBe(2)

    strip.expand(cards[4])
    const shrink = gsap.getTweensOf(cards[2]).find((tween) => tween.vars.width !== undefined)

    expect(shrink.vars.width).toBe(200)
    finish()
    expect(cards[2].getAttribute('aria-expanded')).toBe('false')
    expect(cards[4].classList.contains('is-active')).toBe(true)

    // Ролик получил src только при раскрытии.
    const video = cards[4].querySelector('video')

    expect(video.getAttribute('src')).toBe(video.dataset.src)
    expect(cards[0].querySelector('video').getAttribute('src')).toBeNull()

    strip.deactivate()
    finish()
    expect(strip.active).toBe(-1)
    strip.destroy()
  })

  it('наведение: с задержкой; уход с ленты сворачивает', () => {
    vi.useFakeTimers()
    try {
      const el = mount(html)

      stubVideos(el)

      const strip = init(el, createCtx({ reduced: true }))
      const cards = el.querySelectorAll('[data-vstrip-card]')

      pointer(cards[1], 'pointermove')
      pointer(cards[3], 'pointermove')
      vi.advanceTimersByTime(HOVER_DELAY + 1)
      expect(strip.active).toBe(3)
      // reduced motion: само не играет
      expect(cards[3].querySelector('video').play).not.toHaveBeenCalled()

      pointer(el, 'pointerleave')
      vi.advanceTimersByTime(LEAVE_DELAY + 1)
      expect(strip.active).toBe(-1)

      pointer(cards[2], 'pointermove', { pointerType: 'touch' })
      vi.advanceTimersByTime(HOVER_DELAY + 1)
      expect(strip.active).toBe(-1)
      strip.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('клавиатура: фокус раскрывает, Enter — пауза/продолжить', async () => {
    const el = mount(html)

    stubVideos(el)

    const strip = init(el, createCtx())
    const card = el.querySelectorAll('[data-vstrip-card]')[1]
    const video = card.querySelector('video')

    card.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(strip.active).toBe(1)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(card.classList.contains('is-playing')).toBe(true)

    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    expect(video.pause).toHaveBeenCalled()
    expect(card.classList.contains('is-playing')).toBe(false)
    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true }))
    expect(video.play).toHaveBeenCalledTimes(2)
    window.dispatchEvent(new Event('resize'))
    strip.destroy()
  })

  it('без карточек — пустой экземпляр', () => {
    expect(init(mount('<div></div>'), createCtx()).active).toBeUndefined()
  })
})
