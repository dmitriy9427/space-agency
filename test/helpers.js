/** Помощники DOM-тестов модулей. */
import { createBus } from '../src/core/bus.js'
import { renderSlots } from '../src/content/render.js'

/** Контекст, как в main.js, но без ScrollSmoother. */
export function createCtx(overrides = {}) {
  return {
    bus: createBus(),
    quality: { tier: 'low', dpr: 1, stars: 10, particles: 10 },
    reduced: false,
    smoother: null,
    getScroll: () => window.scrollY,
    ...overrides,
  }
}

/** Вставить разметку (со слотами `data-render`) и вернуть первый элемент. */
export function mount(html) {
  document.body.innerHTML = html
  renderSlots()
  return document.body.firstElementChild
}

export const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

/** Событие указателя; по умолчанию — мышь, левая кнопка. */
export function pointer(target, type, init = {}) {
  const event = new window.PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    ...init,
  })

  target.dispatchEvent(event)
  return event
}
