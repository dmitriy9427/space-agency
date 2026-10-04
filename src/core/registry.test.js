import { describe, expect, it, vi } from 'vitest'
import { mountModules } from './registry.js'

describe('core/registry', () => {
  it('запускает модули по data-module и собирает destroy', async () => {
    document.body.innerHTML = '<div data-module="a"></div><div data-module="b"></div>'

    const destroyA = vi.fn()
    const ctx = { flag: true }
    const registry = {
      a: vi.fn(() => ({ destroy: destroyA })),
      b: vi.fn(async () => undefined),
    }
    const app = await mountModules(registry, ctx)

    expect(registry.a).toHaveBeenCalledWith(document.querySelector('[data-module="a"]'), ctx)
    expect(app.mounted.sort()).toEqual(['a', 'b'])
    app.destroy()
    expect(destroyA).toHaveBeenCalled()
  })

  it('неизвестный и упавший модуль не роняют остальные', async () => {
    document.body.innerHTML = '<i data-module="missing"></i><i data-module="bad"></i><i data-module="ok"></i>'
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const app = await mountModules(
      {
        bad: () => {
          throw new Error('boom')
        },
        ok: () => ({
          destroy() {
            throw new Error('destroy boom')
          },
        }),
      },
      {},
    )

    expect(app.mounted).toEqual(['ok'])
    expect(app.failed.sort()).toEqual(['bad', 'missing'])
    expect(() => app.destroy()).not.toThrow()
  })

  it('strict: false молча пропускает чужие модули', async () => {
    document.body.innerHTML = '<i data-module="cursor"></i><i data-module="ring"></i>'

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = await mountModules({ cursor: () => ({ destroy() {} }) }, {}, document, { strict: false })

    expect(app.mounted).toEqual(['cursor'])
    expect(app.failed).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})
