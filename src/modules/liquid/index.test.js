import { describe, expect, it } from 'vitest'
import { createCtx, mount } from '../../../test/helpers.js'
import { init } from './index.js'

describe('liquid (без WebGL)', () => {
  it('оставляет обычное фото', async () => {
    const el = mount('<section><div data-liquid-stage><img data-liquid-photo src="/photos/p16.jpg" alt=""></div></section>')
    const instance = await init(el, createCtx())

    expect(el.classList.contains('is-gl')).toBe(false)
    expect(el.querySelector('img')).not.toBeNull()
    instance.destroy()
  })
})
