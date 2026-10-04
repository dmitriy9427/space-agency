import { describe, expect, it } from 'vitest'
import { DIRECTIONS, dragIntent, keyIntent, neighbour, shouldComplete } from './logic.js'

describe('sliders/shader/logic', () => {
  it('neighbour по кругу', () => {
    expect(neighbour(0, -1, 5)).toBe(4)
    expect(neighbour(4, 1, 5)).toBe(0)
  })

  it('граница едет вместе с рукой: влево/вверх — следующий, вправо/вниз — предыдущий', () => {
    expect(DIRECTIONS['next-x']).toEqual({ step: 1, dir: [-1, 0] })
    expect(DIRECTIONS['prev-x']).toEqual({ step: -1, dir: [1, 0] })
    // Y у текстуры направлен вверх: тянем вверх — граница едет вверх.
    expect(DIRECTIONS['next-y']).toEqual({ step: 1, dir: [0, 1] })
    expect(DIRECTIONS['prev-y']).toEqual({ step: -1, dir: [0, -1] })
  })

  it('dragIntent: ось по большему сдвигу и прогресс', () => {
    expect(dragIntent(-200, 10, 800, 600)).toEqual({ key: 'next-x', progress: 0.25 })
    expect(dragIntent(400, 0, 800, 600)).toEqual({ key: 'prev-x', progress: 0.5 })
    expect(dragIntent(5, -300, 800, 600)).toEqual({ key: 'next-y', progress: 0.5 })
    expect(dragIntent(0, 900, 800, 600)).toEqual({ key: 'prev-y', progress: 1 })
    expect(dragIntent(0, 0, 800, 600)).toEqual({ key: null, progress: 0 })
    expect(dragIntent(10, 0, 0, 600)).toEqual({ key: null, progress: 0 })
  })

  it('dragIntent: зафиксированная ось важнее величины сдвига', () => {
    expect(dragIntent(-50, 300, 800, 600, 'x').key).toBe('next-x')
    expect(dragIntent(-300, 50, 800, 600, 'y').key).toBe('prev-y')
  })

  it('keyIntent', () => {
    expect(keyIntent('ArrowRight')).toBe('next-x')
    expect(keyIntent('ArrowLeft')).toBe('prev-x')
    expect(keyIntent('ArrowDown')).toBe('next-y')
    expect(keyIntent('ArrowUp')).toBe('prev-y')
    expect(keyIntent('Enter')).toBeNull()
  })

  it('shouldComplete по пути или броску', () => {
    expect(shouldComplete(0.3)).toBe(true)
    expect(shouldComplete(0.1)).toBe(false)
    expect(shouldComplete(0.1, -900)).toBe(true)
  })
})
