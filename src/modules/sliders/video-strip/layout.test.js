import { describe, expect, it } from 'vitest'
import { EXPAND_RATIO, expandedWidth, focusX, isInView, trackBounds } from './layout.js'

describe('sliders/video-strip/layout', () => {
  it('expandedWidth: в EXPAND_RATIO раз шире, но не шире окна', () => {
    expect(expandedWidth(260, 2000)).toBe(260 * EXPAND_RATIO)
    expect(expandedWidth(260, 600)).toBe(600 - 32)
    expect(expandedWidth(260, 100)).toBe(260)
  })

  it('trackBounds: тянуть можно только пока дорожка шире окна', () => {
    expect(trackBounds(1000, 1500)).toEqual({ minX: -500, maxX: 0 })
    expect(trackBounds(1000, 800)).toEqual({ minX: 0, maxX: 0 })
  })

  it('focusX центрирует раскрытую карточку и упирается в края', () => {
    const p = { count: 8, base: 260, expanded: 780, gap: 12, viewport: 1290 }
    const x = focusX({ ...p, index: 3 })
    const left = 3 * (260 + 12) + x

    expect(left + 780 / 2).toBeCloseTo(1290 / 2)
    expect(focusX({ ...p, index: 0 })).toBe(0)

    const track = 7 * 272 + 780

    expect(focusX({ ...p, index: 7 })).toBe(1290 - track)
  })

  it('isInView', () => {
    expect(isInView({ left: 900, right: 1100 }, { left: 0, right: 1000 })).toBe(true)
    expect(isInView({ left: 1000, right: 1200 }, { left: 0, right: 1000 })).toBe(false)
    expect(isInView({ left: -300, right: 0 }, { left: 0, right: 1000 })).toBe(false)
  })
})
