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
 * После «ПУСК» страница плавно едет наверх (returnToTop), а ракета летит по
 * своей траектории в обратную сторону. Доехали — событие `launch:arrived`.
 * Пользователь сам взялся за прокрутку (колесо, палец, клавиши) — отдаём
 * управление сразу: `launch:aborted`.
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

/** Пауза после «ПУСК» перед стартом, с: двигатели ревут, салют разлетается. */
export const RETURN_DELAY = 0.7

/**
 * Сколько длится полёт наверх, с. Кривая power2.inOut: медленно отрывается от
 * площадки, быстро проходит середину страницы и плавно садится наверху.
 */
export const RETURN_DURATION = 7

/** Клавиши, которыми прокручивают страницу. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

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
      // paused: строка едет, только пока подвал на экране. Раньше она крутилась
      // всегда — браузер каждый кадр перерисовывал куски огромного обведённого
      // текста, даже когда его не видно (на слабых видеокартах — подвисание внизу).
      const loop = gsap.to(marquee, { xPercent: -50, duration: 22, ease: 'none', repeat: -1, paused: true })
      // Один переиспользуемый твин скорости вместо двух новых на каждое событие прокрутки.
      const speed = { value: 1 }
      const setSpeed = gsap.quickTo(speed, 'value', { duration: 0.25, ease: 'power2.out', onUpdate: () => loop.timeScale(speed.value) })
      let direction = 1
      let settle = null

      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => loop.paused(!self.isActive),
        onUpdate: (self) => {
          direction = self.direction || direction
          // Резко разгоняем до «направление × (1 + скорость прокрутки)», а через
          // 0.25 с плавно возвращаем к обычной скорости в том же направлении.
          setSpeed(direction * (1 + Math.min(Math.abs(self.getVelocity()) / 400, 6)))
          settle?.kill()
          settle = gsap.delayedCall(0.25, () => setSpeed(direction))
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

  const getScroll = () => ctx.getScroll?.() ?? window.scrollY
  const setScroll = (y) => (ctx.smoother ? ctx.smoother.scrollTop(y) : window.scrollTo(0, y))
  let returning = null // { stop() } — прокрутка наверх в процессе

  /** Вернуть кнопку в исходное состояние. */
  const reset = () => {
    el.classList.remove('is-launched')
    if (button) button.disabled = false
    if (display) display.textContent = formatCountdown(COUNTDOWN_FROM)
    running = null
  }

  /**
   * Плавно отвезти страницу наверх. Позицию анимируем сами (а не scrollTo
   * браузера): нужна предсказуемая длительность и кривая — от неё зависит, как
   * выглядит полёт ракеты (её положение считается от прокрутки).
   */
  const returnToTop = () => {
    if (ctx.reduced) {
      setScroll(0)
      ctx.bus.emit('launch:arrived')
      reset()
      return
    }

    const proxy = { y: getScroll() }
    const events = ['wheel', 'touchstart', 'keydown']
    let finished = false
    const finish = (event) => {
      if (finished) return
      finished = true
      tween.kill()
      events.forEach((name) => window.removeEventListener(name, onUser))
      returning = null
      ctx.bus.emit(event)
      reset()
    }
    const onUser = (event) => {
      if (event.type === 'keydown' && !SCROLL_KEYS.has(event.key)) return
      finish('launch:aborted')
    }
    const tween = gsap.to(proxy, {
      y: 0,
      delay: RETURN_DELAY,
      duration: RETURN_DURATION,
      ease: 'power2.inOut',
      // Позицию берём в момент старта прокрутки, а не клика: за время паузы она могла сдвинуться.
      onStart: () => (proxy.y = getScroll()),
      onUpdate: () => setScroll(proxy.y),
      onComplete: () => finish('launch:arrived'),
    })

    events.forEach((name) => window.addEventListener(name, onUser, { passive: true }))
    returning = { stop: () => finish('launch:aborted') }
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
        returnToTop()
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
  d.add(() => returning?.stop())

  return { launch, destroy: () => d.dispose() }
}
