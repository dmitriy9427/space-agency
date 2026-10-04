import { describe, expect, it } from 'vitest'
import { countdownSteps, formatCountdown, sparkParams } from './countdown.js'

describe('mission/countdown', () => {
  it('formatCountdown', () => {
    expect(formatCountdown(5)).toBe('T−05')
    expect(formatCountdown(12.7)).toBe('T−12')
    expect(formatCountdown(-3)).toBe('T−00')
  })

  it('countdownSteps', () => {
    expect(countdownSteps(3)).toEqual([3, 2, 1, 0])
    expect(countdownSteps(0)).toEqual([0])
  })

  it('sparkParams: искры летят вверх веером', () => {
    const low = sparkParams(() => 0)
    const high = sparkParams(() => 0.999)

    expect(low.angle).toBe(200)
    expect(high.angle).toBeLessThan(340)
    expect(high.velocity).toBeGreaterThan(low.velocity)
    expect(low.gravity).toBeGreaterThan(0)
  })
})
