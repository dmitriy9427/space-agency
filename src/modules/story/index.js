/**
 * История миссии — закреплённая (pin) секция из 4 сцен.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Секция «прилипает» к экрану. Вы продолжаете крутить колесо, но страница
 * не едет — вместо этого сцены сменяют друг друга: «Зажигание» → «Max-Q» →
 * «Разделение» → «Орбита». Справа сверху бегут показания приборов (время,
 * высота, скорость), внизу — точки-индикаторы, а небо за ракетой темнеет
 * от заката к открытому космосу. На сцене «Разделение» ракета отстреливает
 * ускорители.
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * 1. Один таймлайн на всю историю. Сцена i занимает в нём отрезок [i, i+1]:
 *    в начале отрезка появляется, к концу — уходит. ScrollTrigger с
 *    `pin` (закрепить) и `scrub` (прогресс = прокрутка) проигрывает таймлайн
 *    по мере прокрутки. Длина прокрутки — по экрану на сцену
 *    (`end: '+=' + сцены × высота окна`).
 * 2. onUpdate получает прогресс 0…1 → чистые функции из steps.js считают
 *    номер сцены и «показания приборов».
 * 3. Номер сцены отправляется в шину событий: `ctx.bus.emit('story:scene', i)`.
 *    История НЕ знает о ракете — ракета сама подписана на это событие
 *    (docs/02-concepts.md, раздел 2.13).
 * 4. Небо: таймлайн анимирует CSS-переменную `--sky-mix` (0 → 1) на <html>,
 *    а CSS неба (base.css, .sky::before) делает закат прозрачнее по ней.
 *    GSAP умеет анимировать CSS-переменные как обычные свойства.
 *
 * ─── Разметка ────────────────────────────────────────────────────────────────
 *   [data-story-pin]   — что закрепляется (если нет — вся секция)
 *   [data-scene]       — сцены; внутри [data-scene-part] — части, появляются по очереди
 *   [data-story-clock], [data-story-alt], [data-story-speed], [data-story-bar] — HUD
 *   [data-story-dot]   — точки-индикаторы
 *
 * Добавить сцену — просто добавьте ещё один <li data-scene> в HTML: длина
 * прокрутки и таймлайн подстроятся сами.
 * @module story
 */
import { gsap } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'
import { stepFromProgress, telemetry } from './steps.js'

/**
 * @param {HTMLElement} el
 * @param {{ bus: { emit(name: string, payload?: any): void }, reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const pin = el.querySelector('[data-story-pin]') ?? el
  const scenes = Array.from(el.querySelectorAll('[data-scene]'))
  const dots = Array.from(el.querySelectorAll('[data-story-dot]'))
  const clock = el.querySelector('[data-story-clock]')
  const altitude = el.querySelector('[data-story-alt]')
  const speed = el.querySelector('[data-story-speed]')
  const bar = el.querySelector('[data-story-bar]')
  let current = -1

  /** Сменить активную сцену (только если она действительно поменялась). */
  const setScene = (index) => {
    if (index === current) return
    current = index
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index))
    scenes.forEach((scene, i) => scene.setAttribute('aria-hidden', String(i !== index)))
    ctx.bus.emit('story:scene', index)
  }

  /** Обновить HUD и активную сцену по прогрессу 0…1. */
  const update = (progress) => {
    const t = telemetry(progress)

    if (clock) clock.textContent = t.clock
    if (altitude) altitude.textContent = String(t.altitude)
    if (speed) speed.textContent = t.speed
    if (bar) bar.style.transform = `scaleX(${progress.toFixed(4)})`
    setScene(stepFromProgress(progress, scenes.length))
  }

  const g = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: el,
        pin,
        start: 'top top',
        end: () => `+=${scenes.length * window.innerHeight}`,
        // 0.8 — таймлайн догоняет прокрутку за 0.8 с: движение мягче, чем «намертво» привязанное.
        scrub: ctx.reduced ? true : 0.8,
        onUpdate: (self) => update(self.progress),
      },
    })

    // Сцена i живёт на отрезке таймлайна [i, i+1]: появляется в i, уходит в i + 0.6…0.8.
    // Первая сцена видна с самого начала (без появления), последняя — не уходит.
    scenes.forEach((scene, i) => {
      const parts = scene.querySelectorAll('[data-scene-part]')

      if (i > 0) {
        tl.fromTo(scene, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, i)
        tl.from(parts, { yPercent: 60, autoAlpha: 0, stagger: 0.06, duration: 0.5 }, i)
      }
      if (i < scenes.length - 1) {
        tl.to(parts, { yPercent: -60, autoAlpha: 0, stagger: 0.04, duration: 0.45 }, i + 0.6)
        tl.to(scene, { autoAlpha: 0, duration: 0.3 }, i + 0.8)
      }
    })

    // Небо темнеет к орбите: CSS-переменная, которую читает фон страницы.
    tl.fromTo(document.documentElement, { '--sky-mix': 0 }, { '--sky-mix': 1, duration: scenes.length, ease: 'none' }, 0)
  }, el)

  update(0) // начальное состояние HUD и сцены — до первой прокрутки
  d.add(() => g.revert())
  return { destroy: () => d.dispose() }
}
