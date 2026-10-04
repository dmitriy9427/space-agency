/**
 * Общие помощники для WebGL-сцен.
 *
 * Этот файл НАРОЧНО не импортирует three.js: three весит ~570 КБ, и он
 * должен загружаться только когда реально нужна 3D-сцена (через
 * динамический `import('./что-то.scene.js')`). Всё, что требует three, лежит
 * в файлах `*.scene.js` модулей.
 * @module core/webgl
 */

/**
 * Следить за размером элемента и сообщать его (CSS-пиксели).
 * Нужно, чтобы canvas WebGL перерисовывался в правильном размере при
 * изменении окна или раскладки. ResizeObserver срабатывает и тогда, когда
 * меняется размер самого элемента, а не только окна.
 *
 * @param {HTMLElement} el
 * @param {(size: { width: number, height: number }) => void} onResize
 * @returns {() => void} Отключение.
 */
export function observeSize(el, onResize) {
  const read = () => onResize({ width: el.clientWidth, height: el.clientHeight })

  if (typeof ResizeObserver === 'undefined') {
    read()
    return () => {}
  }

  const observer = new ResizeObserver(read)

  observer.observe(el)
  read()
  return () => observer.disconnect()
}

/**
 * Цикл отрисовки на тикере GSAP, который можно ставить на паузу.
 *
 * `render(time, dt)` вызывается каждый кадр, но только если
 * `shouldRender()` вернул true — так сцена, которую сейчас не видно,
 * не тратит видеокарту.
 *
 * @param {{ ticker: { add: Function, remove: Function } }} gsap
 * @param {(time: number, dt: number) => void} render time — секунды с начала, dt — секунды кадра.
 * @param {() => boolean} [shouldRender]
 */
export function createRenderLoop(gsap, render, shouldRender = () => true) {
  let running = false
  const tick = (time, deltaMs) => {
    if (shouldRender()) render(time, deltaMs / 1000)
  }

  return {
    start() {
      if (running) return
      running = true
      gsap.ticker.add(tick)
    },
    stop() {
      if (!running) return
      running = false
      gsap.ticker.remove(tick)
    },
    get running() {
      return running
    },
  }
}

/**
 * Полностью освободить WebGL-рендерер three.js.
 *
 * `dispose()` освобождает ресурсы three, `forceContextLoss()` сразу отдаёт
 * браузеру WebGL-контекст (иначе он освободится только при сборке мусора,
 * а у браузера их всего около 16 — при переходах между страницами можно
 * упереться в лимит), и canvas убирается со страницы.
 */
export function releaseRenderer(renderer) {
  renderer.dispose()
  renderer.forceContextLoss?.()
  renderer.domElement.remove()
}
