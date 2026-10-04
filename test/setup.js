/**
 * Окружение тестов (jsdom): то, чего в jsdom нет или что нужно контролировать.
 * - matchMedia — настраиваемые ответы через `setMedia`;
 * - ResizeObserver / IntersectionObserver — ручные, с `trigger*` для тестов;
 * - canvas: фейковый 2D-контекст, записывающий вызовы; WebGL — недоступен
 *   (так модули проверяются на откат без WebGL).
 */
import { afterEach, vi } from 'vitest'

// --- matchMedia ---------------------------------------------------------------
const media = new Map()

export function setMedia(query, matches) {
  media.set(query, matches)
}

window.matchMedia = (query) => ({
  matches: media.get(query) ?? false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent: () => false,
})

// --- наблюдатели ----------------------------------------------------------------
export const intersectionObservers = new Set()

class FakeIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this.targets = new Set()
    intersectionObservers.add(this)
  }
  observe(el) {
    this.targets.add(el)
  }
  unobserve(el) {
    this.targets.delete(el)
  }
  disconnect() {
    this.targets.clear()
    intersectionObservers.delete(this)
  }
  takeRecords() {
    return []
  }
}

/** Сообщить всем наблюдателям элемента, виден ли он. */
export function triggerIntersection(el, isIntersecting) {
  intersectionObservers.forEach((observer) => {
    if (observer.targets.has(el)) observer.callback([{ target: el, isIntersecting }], observer)
  })
}

class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = FakeIntersectionObserver
window.ResizeObserver = FakeResizeObserver
globalThis.IntersectionObserver = FakeIntersectionObserver
globalThis.ResizeObserver = FakeResizeObserver

// --- canvas ---------------------------------------------------------------------

/** Фейковый 2D-контекст: любые методы — записываются в `calls`. */
export function createFakeContext() {
  const calls = []
  const gradient = () => ({ stops: [], addColorStop(offset, color) { this.stops.push([offset, color]) } })
  const state = { fillStyle: '#000', strokeStyle: '#000', globalCompositeOperation: 'source-over', lineWidth: 1 }

  return new Proxy(state, {
    get(target, key) {
      if (key === 'calls') return calls
      if (key in target) return target[key]
      if (key === 'createRadialGradient' || key === 'createLinearGradient') {
        return (...args) => {
          calls.push([key, ...args])
          return gradient()
        }
      }
      return (...args) => {
        calls.push([key, ...args])
      }
    },
    set(target, key, value) {
      target[key] = value
      calls.push(['set', key, value])
      return true
    },
  })
}

HTMLCanvasElement.prototype.getContext = function getContext(type) {
  if (type !== '2d') return null
  this.__ctx ??= createFakeContext()
  return this.__ctx
}

// --- десктопный ввод ---------------------------------------------------------------
// jsdom объявляет ontouchstart, и GSAP (Observer, Draggable) выбрал бы touch-события.
// Тесты эмулируют десктоп с мышью: оставляем только pointer-события.
for (const target of [HTMLElement.prototype, Element.prototype, Document.prototype, window]) {
  delete target.ontouchstart
}

// --- прочее -----------------------------------------------------------------------
window.scrollTo = () => {}
Element.prototype.scrollTo = () => {}

afterEach(() => {
  media.clear()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})
