import { describe, expect, it } from 'vitest'
import { activeIndex, facing, ringRadius, ringStep, rotationFor, snapRotation } from './math.js'

describe('sliders/ring/math', () => {
  it('шаг и радиус кольца', () => {
    expect(ringStep(8)).toBe(45)
    // Восьмиугольник: хорда = 2R·tan(π/8).
    const r = ringRadius(280, 8, 20)

    expect(2 * r * Math.tan(Math.PI / 8)).toBeCloseTo(300)
    expect(ringRadius(100, 2)).toBe(100)
  })

  it('snapRotation и activeIndex', () => {
    expect(snapRotation(50, 8)).toBe(45)
    expect(snapRotation(-70, 8)).toBe(-90)
    expect(activeIndex(0, 8)).toBe(0)
    expect(activeIndex(-45, 8)).toBe(1)
    expect(activeIndex(45, 8)).toBe(7)
    expect(activeIndex(-360 - 90, 8)).toBe(2)
  })

  it('rotationFor выбирает ближайший оборот', () => {
    expect(rotationFor(1, 0, 8)).toBe(-45)
    expect(rotationFor(1, -720, 8)).toBe(-765)
    expect(activeIndex(rotationFor(5, 1000, 8), 8)).toBe(5)
  })

  it('facing: анфас 1, спиной 0', () => {
    expect(facing(0)).toBeCloseTo(1)
    expect(facing(180)).toBeCloseTo(0)
    expect(facing(90)).toBeCloseTo(0.5)
  })
})
