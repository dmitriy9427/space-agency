import { describe, expect, it, vi } from 'vitest'
import { createCtx } from '../../../test/helpers.js'
import { createTransition } from './index.js'

describe('page-transition (без WebGL — тёмный слой)', () => {
  it('закрывает экран, ждёт swap, открывает', async () => {
    const transition = await createTransition(createCtx({ reduced: true }))
    const layer = document.querySelector('.page-transition')
    let opacityDuringSwap = null
    const swap = vi.fn(async () => {
      opacityDuringSwap = layer.style.opacity
      expect(transition.running).toBe(true)
      expect(layer.classList.contains('is-active')).toBe(true)
    })

    expect(layer.classList.contains('page-transition--fallback')).toBe(true)
    await transition.play(swap)
    expect(swap).toHaveBeenCalledTimes(1)
    expect(opacityDuringSwap).toBe('1')
    expect(layer.style.opacity).toBe('0')
    expect(layer.classList.contains('is-active')).toBe(false)
    expect(transition.running).toBe(false)

    transition.destroy()
    expect(document.querySelector('.page-transition')).toBeNull()
  })

  it('ошибка в swap не оставляет экран закрытым', async () => {
    const transition = await createTransition(createCtx({ reduced: true }))

    await expect(
      transition.play(() => {
        throw new Error('нет сети')
      }),
    ).rejects.toThrow('нет сети')
    expect(transition.running).toBe(false)
    expect(document.querySelector('.page-transition').classList.contains('is-active')).toBe(false)
    transition.destroy()
  })

  it('второй play во время первого игнорируется', async () => {
    const transition = await createTransition(createCtx({ reduced: true }))
    const swap = vi.fn()
    const first = transition.play(swap)

    await transition.play(swap)
    await first
    expect(swap).toHaveBeenCalledTimes(1)
    transition.destroy()
  })
})
