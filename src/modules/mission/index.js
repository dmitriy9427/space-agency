/**
 * Подвал «Центр управления».
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * 1. Терминал: когда подвал появляется, строки журнала «печатаются» по
 *    одной (TextPlugin).
 * 2. Кнопка «Пуск»: отсчёт T−05 … T−01 «расшифровывается» каждую секунду
 *    (ScrambleText), на нуле — «ПУСК», салют из 46 искр (Physics2D), кнопка
 *    дрожит (RoughEase из EasePack), а ракета на фоне даёт всплеск тяги.
 * 3. Бегущая строка внизу: крутите страницу быстрее — строка разгоняется,
 *    крутите вверх — едет в обратную сторону.
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * Терминал: перед показом стираем текст строк, а оригиналы запоминаем; таймлайн
 * печатает их по очереди, длительность ∝ длине строки (скорость печати одна).
 *
 * Салют: для каждой искры — <i> и твин physics2D со случайными скоростью,
 * углом и гравитацией (sparkParams в countdown.js). По окончании искра
 * удаляется из DOM.
 *
 * Связь с ракетой — через шину: `ctx.bus.emit('launch')`. Подвал не знает
 * о ракете, ракета слушает событие (docs/04-architecture.md).
 *
 * Бегущая строка: бесконечный твин xPercent: −50 (в разметке текст
 * продублирован — когда первая копия уехала, на её месте точно такая же
 * вторая, шов не виден). Скорость меняем через timeScale твина: −1 — назад,
 * 3 — втрое быстрее. Скорость прокрутки даёт ScrollTrigger (getVelocity).
 * @module mission
 */
import { gsap, ScrollTrigger } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'
import { countdownSteps, formatCountdown, sparkParams } from './countdown.js'

/** С какой секунды начинается обратный отсчёт. */
export const COUNTDOWN_FROM = 5

/**
 * @param {HTMLElement} el
 * @param {{ bus: { emit(name: string): void }, reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const lines = Array.from(el.querySelectorAll('[data-terminal-line]'))
  const button = el.querySelector('[data-launch]')
  const display = el.querySelector('[data-countdown]')
  const sparks = el.querySelector('[data-sparks]')
  const marquee = el.querySelector('[data-marquee]')

  const g = gsap.context(() => {
    // --- терминал ------------------------------------------------------------
    if (lines.length) {
      const texts = lines.map((line) => line.textContent)

      if (!ctx.reduced) {
        lines.forEach((line) => (line.textContent = ''))

        const typing = gsap.timeline({ paused: true })

        lines.forEach((line, i) => {
          typing.to(line, { text: { value: texts[i] }, duration: texts[i].length * 0.018, ease: 'none' }, '+=0.15')
        })
        ScrollTrigger.create({ trigger: el, start: 'top 70%', once: true, onEnter: () => typing.play() })
      }
    }

    // --- бегущая строка ------------------------------------------------------
    if (marquee && !ctx.reduced) {
      const loop = gsap.to(marquee, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 })
      let direction = 1

      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          direction = self.direction || direction
          // Резко: timeScale до «направление × (1 + скорость)», затем через 0.25 с
          // плавно обратно к обычной скорости в текущем направлении.
          gsap.to(loop, {
            timeScale: direction * (1 + Math.min(Math.abs(self.getVelocity()) / 400, 6)),
            duration: 0.2,
            overwrite: true,
          })
          gsap.to(loop, { timeScale: direction, duration: 1.2, delay: 0.25, ease: 'power2.out' })
        },
      })
    }
  }, el)

  d.add(() => g.revert())

  // --- запуск -----------------------------------------------------------------
  let running = null

  const burst = () => {
    if (!sparks || ctx.reduced) return

    for (let i = 0; i < 46; i++) {
      const spark = document.createElement('i')
      const p = sparkParams(Math.random)

      spark.className = 'mission__spark'
      spark.style.width = spark.style.height = `${p.size}px`
      sparks.appendChild(spark)
      gsap.to(spark, {
        duration: p.duration,
        physics2D: { velocity: p.velocity, angle: p.angle, gravity: p.gravity },
        autoAlpha: 0,
        ease: 'none',
        onComplete: () => spark.remove(),
      })
    }
  }

  const launch = () => {
    if (running || !button) return

    button.disabled = true
    el.classList.add('is-counting')
    running = gsap.timeline({
      onComplete: () => {
        el.classList.remove('is-counting')
        el.classList.add('is-launched')
        burst()
        ctx.bus.emit('launch')
        gsap.fromTo(
          button,
          { x: -6 },
          { x: 0, duration: 0.8, ease: 'rough({ strength: 3, points: 24, taper: "out", randomize: true, clamp: false })' },
        )
        gsap.delayedCall(2.5, () => {
          el.classList.remove('is-launched')
          button.disabled = false
          if (display) display.textContent = formatCountdown(COUNTDOWN_FROM)
          running = null
        })
      },
    })

    countdownSteps(COUNTDOWN_FROM).forEach((second, i) => {
      running.to(
        display,
        { duration: 0.6, scrambleText: { text: second === 0 ? 'ПУСК' : formatCountdown(second), chars: '0123456789', speed: 1 } },
        i === 0 ? 0 : '+=0.4',
      )
    })
  }

  if (display) display.textContent = formatCountdown(COUNTDOWN_FROM)
  if (button) d.listen(button, 'click', launch)
  d.add(() => running?.kill())

  return { launch, destroy: () => d.dispose() }
}
