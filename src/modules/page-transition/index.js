/**
 * Переход между страницами — «занавес» на шейдере.
 *
 * ─── Что делает ─────────────────────────────────────────────────────────────
 * `transition.play(swap)`:
 *   1. занавес поднимается снизу и закрывает экран (t: 0 → 1);
 *   2. под занавесом вызывается `swap()` — роутер подменяет страницу;
 *      пока swap не закончился (асинхронно!), занавес ждёт закрытым;
 *   3. занавес уходит вверх, открывая новую страницу (t: 1 → 2).
 *
 * Без WebGL (или при reduced motion) то же самое делает обычный тёмный
 * слой с плавной прозрачностью.
 *
 * ─── Как перенести ─────────────────────────────────────────────────────────
 * Модуль не знает про роутер: ему всё равно, что делает swap — подменяет
 * DOM, меняет состояние React-роутера или Vue Router. В React/Next:
 * вызывайте `transition.play(() => router.push(url))` и дождитесь, пока новая
 * страница смонтируется (верните промис из swap). См. docs/06-porting.md.
 * @module page-transition
 */
import { gsap } from '../../core/gsap.js'
import { supportsWebGL } from '../../core/env.js'
import { fallbackOpacity } from './curtain.js'

/** Длительность закрытия и открытия, секунды. */
export const COVER_DURATION = 0.85
export const REVEAL_DURATION = 0.95

/**
 * Создать переход. Canvas/слой добавляется в <body> (вне ScrollSmoother —
 * там position: fixed работает относительно экрана).
 * @param {{ reduced: boolean, quality: { dpr: number } }} ctx
 */
export async function createTransition(ctx) {
  const layer = document.createElement('canvas')

  layer.className = 'page-transition'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)

  let gl = null

  if (supportsWebGL() && !ctx.reduced) {
    const { createTransitionRenderer } = await import('./transition.scene.js')

    gl = createTransitionRenderer(layer, ctx.quality)
  } else {
    // Запасной вариант: canvas просто заливается фоном через CSS-класс.
    layer.classList.add('page-transition--fallback')
  }

  const state = { t: 0 }
  let running = false

  /** Нарисовать текущий прогресс. */
  const draw = () => {
    if (gl) gl.render(state.t, gsap.ticker.time)
    else layer.style.opacity = String(fallbackOpacity(state.t))
  }

  /** Анимировать t до значения и дождаться конца. */
  const tweenTo = (value, duration, ease) =>
    new Promise((resolve) => {
      gsap.to(state, { t: value, duration: ctx.reduced ? 0.2 : duration, ease, onUpdate: draw, onComplete: resolve })
    })

  return {
    /**
     * Проиграть переход. `swap` вызывается, когда экран полностью закрыт.
     * @param {() => (void | Promise<void>)} swap
     */
    async play(swap) {
      if (running) return
      running = true
      state.t = 0
      layer.classList.add('is-active') // показать слой и перехватывать клики
      draw()
      await tweenTo(1, COVER_DURATION, 'power2.in') // разгон — занавес «набегает»
      try {
        await swap()
      } finally {
        await tweenTo(2, REVEAL_DURATION, 'power2.out') // торможение — «уплывает»
        layer.classList.remove('is-active')
        gl?.clear()
        running = false
      }
    },
    get running() {
      return running
    },
    destroy() {
      gl?.dispose()
      layer.remove()
    },
  }
}
