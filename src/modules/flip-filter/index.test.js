import { describe, expect, it } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { createCtx, mount } from '../../../test/helpers.js'
import { init, keepRoomFor, matchesFilter } from './index.js'

const html = `<section>
  <button data-filter="all" aria-pressed="true">Все</button>
  <button data-filter="Планеты" aria-pressed="false">Планеты</button>
  <button data-filter="Туманности" aria-pressed="false">Туманности</button>
  <div data-render="filter-grid" data-photos="p02,p05,p16,p17,p30"></div>
</section>`

const finish = () => gsap.globalTimeline.getChildren(false, true, true).forEach((animation) => animation.progress(1))
const visible = (el) => [...el.querySelectorAll('[data-flip-item]:not(.is-hidden)')].length

describe('flip-filter', () => {
  it('matchesFilter', () => {
    expect(matchesFilter('Планеты', 'all')).toBe(true)
    expect(matchesFilter('Планеты', 'Планеты')).toBe(true)
    expect(matchesFilter('Запуски', 'Планеты')).toBe(false)
  })

  it('keepRoomFor: страница не становится короче уже прокрученного', () => {
    // Запаса прокрутки ниже много — сетка может сжаться до содержимого.
    expect(keepRoomFor(2000, 800, 5000, 1000)).toBe(800)
    // Мы у самого низа (запаса 300 px) — сетка сжимается только на 300.
    expect(keepRoomFor(2000, 800, 5000, 4700)).toBe(1700)
    // Сетка выросла — как есть.
    expect(keepRoomFor(800, 2000, 5000, 4700)).toBe(2000)
  })

  it('кнопки фильтруют сетку и подсвечиваются', () => {
    const el = mount(html)
    const filter = init(el, createCtx({ reduced: true }))
    const [all, planets, nebulae] = el.querySelectorAll('[data-filter]')

    expect(visible(el)).toBe(5)
    planets.click()
    finish()
    expect(filter.filter).toBe('Планеты')
    expect(visible(el)).toBe(2)
    expect(planets.getAttribute('aria-pressed')).toBe('true')
    expect(all.getAttribute('aria-pressed')).toBe('false')

    nebulae.click()
    finish()
    expect(visible(el)).toBe(2)
    nebulae.click() // повторный клик по выбранному — ничего не меняет
    all.click()
    finish()
    expect(visible(el)).toBe(5)

    planets.click()
    filter.destroy()
    expect(visible(el)).toBe(5) // destroy возвращает все карточки
  })

  it('без кнопок или карточек — пустой экземпляр', () => {
    expect(init(mount('<section></section>'), createCtx()).filter).toBeUndefined()
  })
})
