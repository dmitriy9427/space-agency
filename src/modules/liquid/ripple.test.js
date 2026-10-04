import { describe, expect, it } from 'vitest'
import { createRng } from '../../core/rng.js'
import { MAX_DROPS, createDropQueue, createRain, dropsAlongPath, pointerToUv, strengthFromSpeed } from './ripple.js'

describe('liquid/ripple', () => {
  it('pointerToUv: Y вверх и зажим в 0…1', () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 }

    expect(pointerToUv(200, 100, rect)).toEqual({ x: 0.5, y: 0.5 })
    expect(pointerToUv(100, 50, rect)).toEqual({ x: 0, y: 1 })
    expect(pointerToUv(-50, 900, rect)).toEqual({ x: 0, y: 0 })
    expect(pointerToUv(0, 0, { left: 0, top: 0, width: 0, height: 0 }).x).toBe(0)
  })

  it('strengthFromSpeed растёт со скоростью и ограничена', () => {
    expect(strengthFromSpeed(0)).toBeCloseTo(0.03)
    expect(strengthFromSpeed(1000)).toBeGreaterThan(strengthFromSpeed(100))
    expect(strengthFromSpeed(1e9)).toBe(0.14)
  })

  it('dropsAlongPath: сплошной след, не больше лимита', () => {
    const drops = dropsAlongPath({ x: 0, y: 0 }, { x: 0.1, y: 0 }, 0.025)

    expect(drops).toHaveLength(4)
    expect(drops.at(-1)).toEqual({ x: 0.1, y: 0 })
    expect(dropsAlongPath({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.01, 3)).toHaveLength(3)
    expect(dropsAlongPath({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, 0.01)).toHaveLength(1)
  })

  it('дождь: капли внутри кадра с паузами', () => {
    const rain = createRain(createRng(3), { min: 0.5, max: 0.5 })

    expect(rain.step(0.2)).toHaveLength(0)
    const drops = rain.step(0.4)

    expect(drops).toHaveLength(1)
    expect(drops[0].x).toBeGreaterThan(0)
    expect(drops[0].x).toBeLessThan(1)
    expect(drops[0].strength).toBeGreaterThan(0)
    expect(rain.step(100).length).toBe(MAX_DROPS)
  })

  it('очередь капель не растёт сверх MAX_DROPS', () => {
    const queue = createDropQueue()

    for (let i = 0; i < MAX_DROPS + 5; i++) queue.push({ x: 0, y: 0, radius: 0.1, strength: 0.1 })
    expect(queue.size).toBe(MAX_DROPS)
    expect(queue.flush()).toHaveLength(MAX_DROPS)
    expect(queue.size).toBe(0)
  })
})
