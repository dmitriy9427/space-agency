import { describe, expect, it } from 'vitest'
import { ParticlePool, spawnBudget } from './particles.js'

describe('rocket/particles', () => {
  it('рождает, двигает и убивает частицы', () => {
    const pool = new ParticlePool(4)

    pool.emit({ x: 0, y: 0, z: 0 }, { x: 1, y: -2, z: 0 }, 1, 2)
    expect(pool.update(0.5)).toBe(1)
    expect(pool.positions[0]).toBeCloseTo(0.5)
    expect(pool.positions[1]).toBeCloseTo(-1)
    expect(pool.ages[0]).toBeCloseTo(0.5)
    expect(pool.update(0.6)).toBe(0)
    expect(pool.sizes[0]).toBe(0)
  })

  it('кольцевой буфер заменяет самую старую', () => {
    const pool = new ParticlePool(2)
    const o = { x: 0, y: 0, z: 0 }

    pool.emit(o, o, 1, 1)
    pool.emit(o, o, 1, 2)
    pool.emit({ x: 9, y: 0, z: 0 }, o, 1, 3)
    expect(pool.positions[0]).toBe(9)
    expect(pool.sizes[0]).toBe(3)
    expect(pool.cursor).toBe(1)
  })

  it('сопротивление гасит скорость; clear убивает всех', () => {
    const pool = new ParticlePool(1)

    pool.emit({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, 10, 1)
    pool.update(0.1, 5)
    expect(pool.velocities[0]).toBeCloseTo(5)
    pool.clear()
    expect(pool.alive).toBe(0)
    expect(pool.update(0.1)).toBe(0)
  })

  it('spawnBudget одинаков при разной частоте кадров', () => {
    let carry = 0
    let total60 = 0

    for (let i = 0; i < 60; i++) {
      const b = spawnBudget(1, 1 / 60, carry, 90)
      total60 += b.count
      carry = b.carry
    }

    let total30 = 0

    carry = 0
    for (let i = 0; i < 30; i++) {
      const b = spawnBudget(1, 1 / 30, carry, 90)
      total30 += b.count
      carry = b.carry
    }
    expect(Math.abs(total60 - 90)).toBeLessThanOrEqual(1)
    expect(Math.abs(total30 - 90)).toBeLessThanOrEqual(1)
    expect(spawnBudget(-1, 1, 0).count).toBe(0)
  })
})
