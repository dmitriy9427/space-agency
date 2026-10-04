import { describe, expect, it } from 'vitest'
import { createRng } from './rng.js'

describe('core/rng', () => {
  it('детерминирован по seed', () => {
    const a = createRng(42)
    const b = createRng(42)

    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b))
  })

  it('разные seed дают разные последовательности', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })

  it('значения в [0, 1), помощники в своих диапазонах', () => {
    const rng = createRng(7)

    for (let i = 0; i < 500; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)

      const r = rng.range(-2, 3)
      expect(r).toBeGreaterThanOrEqual(-2)
      expect(r).toBeLessThan(3)

      const n = rng.int(1, 6)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(6)
    }
    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']))
    expect(typeof rng.chance(0.5)).toBe('boolean')
    expect(rng.chance(0)).toBe(false)
    expect(rng.chance(1)).toBe(true)
  })
})
