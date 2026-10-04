import { describe, expect, it } from 'vitest'
import { decimalsOf, formatCount } from './format.js'

describe('manifesto/format', () => {
  it('разделяет разряды тонким пробелом', () => {
    expect(formatCount(1204)).toBe('1 204')
    expect(formatCount(1234567.891, { decimals: 2 })).toBe('1 234 567.89')
  })

  it('префикс, суффикс и знак', () => {
    expect(formatCount(384, { suffix: '+' })).toBe('384+')
    expect(formatCount(7.8, { decimals: 1, prefix: '~', suffix: ' km/s' })).toBe('~7.8 km/s')
    expect(formatCount(-5)).toBe('−5')
    expect(formatCount(-0.001)).toBe('0')
  })

  it('decimalsOf', () => {
    expect(decimalsOf('7.8')).toBe(1)
    expect(decimalsOf('384')).toBe(0)
    expect(decimalsOf(1.25)).toBe(2)
  })
})
