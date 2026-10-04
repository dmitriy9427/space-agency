import { describe, expect, it } from 'vitest'
import { magneticOffset } from './magnetic.js'

describe('cursor/magnetic', () => {
  it('тянет к курсору на долю расстояния от центра', () => {
    const rect = { left: 100, top: 100, width: 100, height: 50 }

    expect(magneticOffset(150, 125, rect)).toEqual({ x: 0, y: 0 })
    expect(magneticOffset(200, 150, rect, 0.5)).toEqual({ x: 25, y: 12.5 })
  })
})
