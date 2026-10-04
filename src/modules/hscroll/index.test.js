import { describe, expect, it } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init, travelDistance } from './index.js'

describe('hscroll', () => {
  it('travelDistance: лишняя ширина ленты, не меньше 0', () => {
    expect(travelDistance(3000, 1200)).toBe(1800)
    expect(travelDistance(800, 1200)).toBe(0)
  })

  it('запускается на разметке и чисто убирается', () => {
    const el = mount(`<section>
      <div data-hscroll-pin><i data-hscroll-progress></i>
        <div data-hscroll-track><div data-render="missions"></div></div>
      </div></section>`)
    const instance = init(el, createCtx())

    expect(el.querySelectorAll('[data-hscroll-card]').length).toBeGreaterThan(0)
    instance.destroy()
    // После отката сдвига нет (GSAP может оставить нейтральный translate(0, 0)).
    expect(el.querySelector('[data-hscroll-track]').style.transform).toMatch(/^$|^translate\(0(px)?, 0(px)?\)$/)
  })

  it('без ленты — пустой экземпляр', () => {
    expect(() => init(mount('<section></section>'), createCtx()).destroy()).not.toThrow()
  })
})
