import { describe, expect, it } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init } from './index.js'

describe('rocket (без WebGL)', () => {
  it('убирает canvas, страница работает без ракеты', async () => {
    const canvas = mount('<canvas data-module="rocket"></canvas>')
    const instance = await init(canvas, createCtx())

    expect(canvas.isConnected).toBe(false)
    expect(() => instance.destroy()).not.toThrow()
  })
})
