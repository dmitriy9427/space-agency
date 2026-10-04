import { describe, expect, it } from 'vitest'
import { MISSION_SECONDS, stepFromProgress, telemetry } from './steps.js'

describe('story/steps', () => {
  it('stepFromProgress делит прогресс на сцены', () => {
    expect(stepFromProgress(0, 4)).toBe(0)
    expect(stepFromProgress(0.26, 4)).toBe(1)
    expect(stepFromProgress(0.99, 4)).toBe(3)
    expect(stepFromProgress(1, 4)).toBe(3)
    expect(stepFromProgress(-1, 4)).toBe(0)
    expect(stepFromProgress(0.5, 0)).toBe(0)
  })

  it('telemetry: часы, высота и скорость', () => {
    expect(telemetry(0)).toEqual({ clock: 'T+00:00', altitude: 0, speed: '0.00' })

    const end = telemetry(1)

    expect(end.clock).toBe(`T+0${Math.floor(MISSION_SECONDS / 60)}:00`)
    expect(end.altitude).toBe(408)
    expect(end.speed).toBe('7.66')
    expect(telemetry(2)).toEqual(end)
  })
})
