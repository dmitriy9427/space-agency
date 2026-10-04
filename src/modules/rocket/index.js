/**
 * Ракета — подключение 3D-сцены к странице.
 *
 * ─── Роли файлов ────────────────────────────────────────────────────────────
 *   flight.js        — КУДА лететь: сценарий (путевые точки) и интерполяция;
 *   rocket.scene.js  — КАК нарисовать: модель, огонь, звёзды (three.js);
 *   index.js (этот)  — СВЯЗЬ: прокрутка → сценарий → сцена, плюс события
 *                      шины и экономия ресурсов.
 *
 * ─── Что происходит каждый кадр ───────────────────────────────────────────────
 *   scroll = ctx.getScroll()
 *   flight = sampleFlight(timeline, scroll)    // где ракета по сценарию
 *   скорость прокрутки → thrust                // крутите резче — факел ярче
 *   scene.setFlight / setScroll / update / render
 *
 * ─── Путевые точки из разметки ────────────────────────────────────────────────
 * Элементы с `data-flight="id"` — «опорные точки» сценария. Для каждого
 * создаётся ScrollTrigger (без анимации!) — только чтобы узнать, на какой
 * позиции прокрутки элемент дойдёт до опорной линии экрана
 * (`data-flight-start`, по умолчанию 'top 65%'). ScrollTrigger сам учитывает
 * пины и пересчитывает позиции при ресайзе (событие 'refresh').
 *
 * ─── Экономия ─────────────────────────────────────────────────────────────────
 * - three.js загружается динамическим import — текст страницы появляется
 *   раньше 3D;
 * - если экран целиком закрыт непрозрачными секциями (`data-occlude`:
 *   слайдеры, вода, архив), сцена не рисуется вовсе (coversViewport);
 * - нет WebGL — canvas убирается, страница работает без ракеты.
 *
 * ─── События шины ─────────────────────────────────────────────────────────────
 *   story:scene (≥ 2) → отстрел ускорителей (replay: true — см. core/bus.js);
 *   launch            → всплеск тяги и дрожь (кнопка «Пуск» в подвале).
 * @module rocket
 */
import { gsap, ScrollTrigger } from '../../core/gsap.js'
import { supportsWebGL } from '../../core/env.js'
import { createDisposer } from '../../core/lifecycle.js'
import { createRenderLoop, observeSize } from '../../core/webgl.js'
import { damp } from '../../core/math.js'
import { buildFlightTimeline, coversViewport, sampleFlight, thrustWithVelocity } from './flight.js'

/** Опорная линия: секция «приходит», когда её верх на этой высоте экрана. */
export const FLIGHT_START = 'top 65%'

/** Стадия истории, с которой ускорители отстреливаются. */
export const SEPARATION_SCENE = 2

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ bus: ReturnType<import('../../core/bus.js').createBus>, quality: object, getScroll: () => number, reduced: boolean }} ctx
 */
export async function init(canvas, ctx) {
  if (!supportsWebGL()) {
    canvas.remove()
    return { destroy() {} }
  }

  const { RocketScene } = await import('./rocket.scene.js')
  const d = createDisposer()
  const scene = new RocketScene(canvas, ctx.quality)

  d.add(() => scene.dispose())
  ctx.rocket = scene

  // --- путевые точки ----------------------------------------------------------
  // Опорную линию можно задать точке отдельно: data-flight-start="top bottom".
  const markers = Array.from(document.querySelectorAll('[data-flight]')).map((el) => ({
    id: el.dataset.flight,
    trigger: ScrollTrigger.create({ trigger: el, start: el.dataset.flightStart || FLIGHT_START }),
  }))
  let timeline = []
  const rebuild = () => {
    timeline = buildFlightTimeline(
      markers.map((m) => ({ id: m.id, at: m.trigger.start })),
      undefined,
      ScrollTrigger.maxScroll(window),
    )
  }

  markers.forEach((m) => d.add(() => m.trigger.kill()))
  ScrollTrigger.addEventListener('refresh', rebuild)
  d.add(() => ScrollTrigger.removeEventListener('refresh', rebuild))
  rebuild()

  // --- перекрытие непрозрачными секциями -------------------------------------
  // Проверяется в кадре: 2–3 getBoundingClientRect дешевле, чем рисовать сцену впустую.
  const occluders = Array.from(document.querySelectorAll('[data-occlude]'))
  const isCovered = () =>
    occluders.length > 0 && coversViewport(occluders.map((el) => el.getBoundingClientRect()), window.innerHeight)

  // --- шина -------------------------------------------------------------------
  const separation = { value: 0 }

  d.add(
    ctx.bus.on('story:scene', (index) => {
      gsap.to(separation, {
        value: index >= SEPARATION_SCENE ? 1 : 0,
        duration: index >= SEPARATION_SCENE ? 2.4 : 1.2,
        ease: index >= SEPARATION_SCENE ? 'power2.in' : 'power2.out',
        overwrite: true,
        onUpdate: () => scene.setSeparation(separation.value),
      })
    }, { replay: true }),
  )
  d.add(ctx.bus.on('launch', () => scene.boost(1.6)))

  // --- курсор -----------------------------------------------------------------
  const pointer = { x: 0, y: 0 }

  d.listen(
    window,
    'pointermove',
    (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1
    },
    { passive: true },
  )

  // --- цикл -------------------------------------------------------------------
  let lastScroll = ctx.getScroll()
  let velocity = 0
  let smoothX = 0
  let smoothY = 0

  d.add(observeSize(canvas, ({ width, height }) => scene.resize(width, height)))

  const loop = createRenderLoop(
    gsap,
    (time, dt) => {
      const step = Math.min(Math.max(dt, 0.001), 0.1)
      const scroll = ctx.getScroll()
      const flight = sampleFlight(timeline, scroll)

      velocity = damp(velocity, (scroll - lastScroll) / step, 8, step)
      lastScroll = scroll
      smoothX = damp(smoothX, pointer.x, 3, step)
      smoothY = damp(smoothY, pointer.y, 3, step)

      scene.setFlight(flight)
      scene.setPointer(smoothX, smoothY)
      scene.setScroll(scroll, ctx.reduced ? flight.thrust : thrustWithVelocity(flight.thrust, velocity))
      scene.update(step, time)
      scene.render()
    },
    () => {
      // Флаг для отладочного оверлея: ракета закрыта секцией и не рисуется.
      ctx.rocketSleeping = isCovered()
      return !ctx.rocketSleeping
    },
  )

  loop.start()
  d.add(() => loop.stop())

  return {
    scene,
    get timeline() {
      return timeline
    },
    destroy() {
      ctx.rocket = null
      d.dispose()
    },
  }
}
