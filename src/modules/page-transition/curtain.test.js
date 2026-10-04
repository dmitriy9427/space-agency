import { describe, expect, it } from 'vitest'
import { OVERSHOOT, curtainEdges, fallbackOpacity } from './curtain.js'

describe('page-transition/curtain', () => {
  it('в начале занавеса нет: обе границы под экраном', () => {
    expect(curtainEdges(0)).toEqual({ top: -OVERSHOOT, bottom: -OVERSHOOT })
  })

  it('t = 1 — экран закрыт целиком (верхняя граница выше экрана, нижняя — ниже)', () => {
    const { top, bottom } = curtainEdges(1)

    expect(top).toBeCloseTo(1 + OVERSHOOT)
    expect(bottom).toBeCloseTo(-OVERSHOOT)
  })

  it('t = 2 — занавес ушёл вверх целиком', () => {
    const { top, bottom } = curtainEdges(2)

    expect(top).toBeCloseTo(1 + OVERSHOOT)
    expect(bottom).toBeCloseTo(1 + OVERSHOOT)
  })

  it('сначала едет верхняя граница, потом нижняя', () => {
    expect(curtainEdges(0.5).bottom).toBeCloseTo(-OVERSHOOT)
    expect(curtainEdges(1.5).top).toBeCloseTo(1 + OVERSHOOT)
    expect(curtainEdges(1.5).bottom).toBeGreaterThan(0)
  })

  it('fallbackOpacity: 0 → 1 → 0', () => {
    expect(fallbackOpacity(0)).toBe(0)
    expect(fallbackOpacity(0.5)).toBe(0.5)
    expect(fallbackOpacity(1)).toBe(1)
    expect(fallbackOpacity(1.5)).toBe(0.5)
    expect(fallbackOpacity(2)).toBe(0)
  })
})
