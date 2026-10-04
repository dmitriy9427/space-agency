import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setMedia } from '../../test/setup.js'
import { getQuality, isCoarsePointer, prefersReducedMotion, resetWebGLCache, supportsWebGL } from './env.js'

describe('core/env', () => {
  beforeEach(() => resetWebGLCache())

  it('читает медиазапросы', () => {
    expect(prefersReducedMotion()).toBe(false)
    setMedia('(prefers-reduced-motion: reduce)', true)
    setMedia('(pointer: coarse)', true)
    expect(prefersReducedMotion()).toBe(true)
    expect(isCoarsePointer()).toBe(true)
  })

  it('в jsdom WebGL нет, результат кешируется', () => {
    const spy = vi.spyOn(document, 'createElement')

    expect(supportsWebGL()).toBe(false)
    expect(supportsWebGL()).toBe(false)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('видит WebGL и освобождает тестовый контекст', () => {
    const loseContext = vi.fn()
    const fakeCanvas = { getContext: () => ({ getExtension: () => ({ loseContext }) }) }

    vi.spyOn(document, 'createElement').mockReturnValue(fakeCanvas)
    expect(supportsWebGL()).toBe(true)
    expect(loseContext).toHaveBeenCalled()
  })

  it('ошибка при создании контекста — значит, WebGL нет', () => {
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(supportsWebGL()).toBe(false)
  })

  it('getQuality: мощная машина — high, слабый телефон — low', () => {
    const high = getQuality({ cores: 12, memory: 16, width: 1600, coarse: false, dpr: 3, reduced: false })
    const low = getQuality({ cores: 2, memory: 2, width: 390, coarse: true, dpr: 3, reduced: false })

    expect(high.tier).toBe('high')
    expect(high.dpr).toBe(2)
    expect(low.tier).toBe('low')
    expect(low.dpr).toBe(1)
    expect(low.stars).toBeLessThan(high.stars)
    expect(low.particles).toBeLessThan(high.particles)
  })

  it('getQuality: средний уровень и reduced motion понижает', () => {
    const medium = getQuality({ cores: 4, memory: 4, width: 1280, coarse: false, dpr: 1, reduced: false })

    expect(medium.tier).toBe('medium')
    expect(medium.dpr).toBe(1)
    expect(getQuality({ cores: 4, memory: 4, width: 1280, coarse: false, dpr: 1, reduced: true }).tier).toBe('low')
  })

  it('getQuality без аргументов берёт значения из окружения', () => {
    const quality = getQuality()

    expect(['low', 'medium', 'high']).toContain(quality.tier)
  })
})
