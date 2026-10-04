import { describe, expect, it } from 'vitest'
import { STEP, createRope, segmentWidth } from './rope.js'

const runCircle = (rope, hz, seconds) => {
  let maxDeviation = 0

  for (let i = 0; i < hz * seconds; i++) {
    const t = i / hz
    const target = { x: 300 + Math.cos(t * 7) * 200 + t * 500, y: 450 + Math.sin(t * 7) * 180 }

    rope.update(target, 1 / hz)
    rope.points.forEach((p) => (maxDeviation = Math.max(maxDeviation, Math.hypot(p.x - target.x, p.y - target.y))))
  }
  return maxDeviation
}

describe('cursor/rope', () => {
  it('первое обновление ставит цепочку в курсор', () => {
    const rope = createRope(5)

    expect(rope.placed).toBe(false)
    rope.update({ x: 10, y: 20 }, STEP)
    expect(rope.placed).toBe(true)
    expect(rope.points.every((p) => p.x === 10 && p.y === 20)).toBe(true)
    expect(rope.length).toBe(0)
  })

  it('устойчива: хвост не «взрывается» на резких кругах', () => {
    // Регрессия: недодемпфированные пружины в цепочке из 26 звеньев
    // раскачивали друг друга до тысяч пикселей.
    expect(runCircle(createRope(26), 60, 3)).toBeLessThan(700)
  })

  it('одинакова на 60 и 144 Гц (фиксированный шаг)', () => {
    const a = createRope(26)
    const b = createRope(26)

    runCircle(a, 60, 2)
    runCircle(b, 144, 2)
    expect(Math.abs(a.length - b.length)).toBeLessThan(a.length * 0.1)
  })

  it('растягивается в движении и собирается в покое', () => {
    const rope = createRope(20)

    rope.reset(0, 0)
    for (let i = 0; i < 10; i++) rope.update({ x: i * 40, y: 0 }, STEP)
    expect(rope.length).toBeGreaterThan(50)
    for (let i = 0; i < 300; i++) rope.update({ x: 400, y: 0 }, STEP)
    expect(rope.length).toBeLessThan(0.5)
  })

  it('segmentWidth сужается к хвосту', () => {
    expect(segmentWidth(0, 10, 8)).toBe(8)
    expect(segmentWidth(5, 10, 8)).toBeLessThan(4)
    expect(segmentWidth(10, 10, 8)).toBe(0)
  })
})
