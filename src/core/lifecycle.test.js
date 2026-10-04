import { describe, expect, it, vi } from 'vitest'
import { triggerIntersection } from '../../test/setup.js'
import { createDisposer, onViewport } from './lifecycle.js'

describe('core/lifecycle: createDisposer', () => {
  it('выполняет очистку в обратном порядке один раз', () => {
    const d = createDisposer()
    const order = []

    d.add(() => order.push(1))
    d.add(() => order.push(2))
    d.dispose()
    d.dispose()
    expect(order).toEqual([2, 1])
    expect(d.disposed).toBe(true)
  })

  it('после dispose новая очистка выполняется сразу', () => {
    const d = createDisposer()
    const fn = vi.fn()

    d.dispose()
    d.add(fn)
    expect(fn).toHaveBeenCalled()
    expect(d.add('не функция')).toBe('не функция')
  })

  it('listen снимает слушатель при dispose', () => {
    const d = createDisposer()
    const el = document.createElement('button')
    const fn = vi.fn()

    d.listen(el, 'click', fn)
    el.click()
    d.dispose()
    el.click()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ошибка в одной очистке не мешает остальным', () => {
    const d = createDisposer()
    const fn = vi.fn()

    vi.spyOn(console, 'error').mockImplementation(() => {})
    d.add(fn)
    d.add(() => {
      throw new Error('x')
    })
    d.dispose()
    expect(fn).toHaveBeenCalled()
  })
})

describe('core/lifecycle: onViewport', () => {
  it('зовёт enter/leave только при смене состояния', () => {
    const el = document.createElement('div')
    const enter = vi.fn()
    const leave = vi.fn()
    const stop = onViewport(el, { enter, leave })

    triggerIntersection(el, true)
    triggerIntersection(el, true)
    triggerIntersection(el, false)
    expect(enter).toHaveBeenCalledTimes(1)
    expect(leave).toHaveBeenCalledTimes(1)
    stop()
    triggerIntersection(el, true)
    expect(enter).toHaveBeenCalledTimes(1)
  })

  it('без IntersectionObserver считает элемент видимым', () => {
    const original = globalThis.IntersectionObserver
    const enter = vi.fn()

    globalThis.IntersectionObserver = undefined
    try {
      onViewport(document.createElement('div'), { enter })()
    } finally {
      globalThis.IntersectionObserver = original
    }
    expect(enter).toHaveBeenCalled()
  })
})
