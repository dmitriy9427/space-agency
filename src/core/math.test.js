import { describe, expect, it } from 'vitest'
import { clamp, damp, invLerp, lerp, mod, rad, remap, sign, smoothstep, wrap } from './math.js'

describe('core/math', () => {
  it('clamp ограничивает диапазоном', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })

  it('lerp и invLerp обратны друг другу', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5)
    expect(invLerp(10, 20, 12.5)).toBe(0.25)
    expect(invLerp(3, 3, 10)).toBe(0)
  })

  it('remap переводит между диапазонами', () => {
    expect(remap(0, 10, 100, 200, 5)).toBe(150)
  })

  it('smoothstep: 0 до a, 1 после b, 0.5 посередине', () => {
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 2)).toBe(1)
    expect(smoothstep(0, 1, 0.5)).toBe(0.5)
    expect(smoothstep(0, 1, 0.25)).toBeLessThan(0.25)
  })

  it('mod всегда неотрицателен', () => {
    expect(mod(-1, 5)).toBe(4)
    expect(mod(7, 5)).toBe(2)
  })

  it('wrap заворачивает в [min, max)', () => {
    expect(wrap(12, 0, 10)).toBe(2)
    expect(wrap(-3, 0, 10)).toBe(7)
    expect(wrap(10, 0, 10)).toBe(0)
    expect(wrap(-6, -5, 5)).toBe(4)
  })

  it('damp не зависит от разбиения шага', () => {
    const one = damp(0, 100, 4, 0.1)
    const two = damp(damp(0, 100, 4, 0.05), 100, 4, 0.05)

    expect(one).toBeCloseTo(two, 10)
    expect(damp(0, 100, 4, 100)).toBeCloseTo(100)
  })

  it('sign и rad', () => {
    expect([sign(-3), sign(0), sign(2)]).toEqual([-1, 0, 1])
    expect(rad(180)).toBeCloseTo(Math.PI)
  })
})
