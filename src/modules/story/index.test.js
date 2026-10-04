import { describe, expect, it, vi } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init } from './index.js'

const html = `<section>
  <div data-story-pin>
    <b data-story-clock></b><b data-story-alt></b><b data-story-speed></b><i data-story-bar></i>
    <ol>
      <li data-scene><h2 data-scene-part>A</h2></li>
      <li data-scene><h2 data-scene-part>B</h2></li>
      <li data-scene><h2 data-scene-part>C</h2></li>
    </ol>
    <i data-story-dot></i><i data-story-dot></i><i data-story-dot></i>
  </div>
</section>`

describe('story', () => {
  it('сразу показывает телеметрию и первую сцену, сообщает о ней в шину', () => {
    const el = mount(html)
    const ctx = createCtx()
    const spy = vi.fn()

    ctx.bus.on('story:scene', spy)

    const instance = init(el, ctx)

    expect(el.querySelector('[data-story-clock]').textContent).toBe('T+00:00')
    expect(el.querySelector('[data-story-alt]').textContent).toBe('0')
    expect(el.querySelector('[data-story-bar]').style.transform).toBe('scaleX(0.0000)')
    expect(el.querySelectorAll('[data-story-dot]')[0].classList.contains('is-active')).toBe(true)
    expect(el.querySelectorAll('[data-scene]')[1].getAttribute('aria-hidden')).toBe('true')
    expect(spy).toHaveBeenCalledWith(0)
    expect(ctx.bus.last('story:scene')).toBe(0)
    instance.destroy()
  })
})
