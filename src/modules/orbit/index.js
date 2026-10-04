/**
 * Орбита — SVG-сцена, которую проигрывает прокрутка (пин + scrub).
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Секция закрепляется. Пока вы крутите колесо:
 *   - эллипс орбиты прорисовывается линией (DrawSVG);
 *   - по этой линии летит спутник, поворачиваясь по ходу движения (MotionPath);
 *   - планета в центре перетекает в звезду, луну, силуэт ракеты (MorphSVG);
 *   - подписи слева загораются по одной.
 * А свечение вокруг планеты «дышит» само по себе, независимо от прокрутки.
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * Один таймлайн со scrollTrigger (pin + scrub). Все шаги стоят на одной
 * «шкале» таймлайна: числа вторым аргументом (0, 0.4 + i × 0.85…) — это
 * МОМЕНТЫ на шкале, а не задержки. Прокрутка двигает «головку» по шкале.
 *
 * Целевые фигуры для морфинга лежат невидимо в <defs> SVG, а их id
 * перечислены в атрибуте `data-morph-to="#shape-star, #shape-moon"`.
 * Добавить фигуру — нарисовать <path id="…"> в <defs> и дописать id в атрибут.
 *
 * Важно: DrawSVG и MotionPath рассчитывают геометрию SVG (getTotalLength,
 * getCTM), которой нет в тестовой среде jsdom — поэтому этот модуль
 * проверяется в браузере, а тест проверяет только parseMorphTargets.
 * @module orbit
 */
import { gsap } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'

/** Формы для морфинга: id путей из `<defs>`, через запятую в `data-morph-to`. */
export const parseMorphTargets = (raw = '') =>
  raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

/**
 * @param {HTMLElement} el
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const path = el.querySelector('[data-orbit-path]')
  const satellite = el.querySelector('[data-orbit-satellite]')
  const morph = el.querySelector('[data-morph]')
  const captions = el.querySelectorAll('[data-orbit-caption]')
  const targets = parseMorphTargets(morph?.dataset.morphTo)

  const g = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: el,
        pin: el.querySelector('[data-orbit-pin]') ?? true,
        start: 'top top',
        end: '+=180%',
        scrub: ctx.reduced ? true : 1,
      },
    })

    // DrawSVG: '0% 0%' — от линии не видно ничего, '0% 100%' — видна целиком.
    if (path) tl.fromTo(path, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1 }, 0)

    if (path && satellite) {
      tl.to(
        satellite,
        {
          duration: 3,
          // align: path — совместить координаты спутника с путём; alignOrigin — держаться
          // за центр спутника; autoRotate: 90 — поворачивать по ходу (+90°, т.к. спутник нарисован «боком»).
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: 90 },
        },
        0,
      )
    }

    if (morph) {
      targets.forEach((target, i) => {
        // type: 'rotational' — точки фигуры «вращаются» к новым местам (органичнее, чем по прямой).
        tl.to(morph, { morphSVG: { shape: target, type: 'rotational' }, duration: 0.6, ease: 'power2.inOut' }, 0.4 + i * 0.85)
      })
    }

    captions.forEach((caption, i) => {
      tl.from(caption, { autoAlpha: 0, x: -24, duration: 0.3, ease: 'power2.out' }, 0.3 + i * 0.85)
      if (i < captions.length - 1) tl.to(caption, { autoAlpha: 0.25, duration: 0.2 }, 1 + i * 0.85)
    })

    // Мягкое «дыхание» свечения планеты — независимо от скролла.
    if (!ctx.reduced) gsap.to('[data-orbit-glow]', { scale: 1.08, transformOrigin: '50% 50%', repeat: -1, yoyo: true, duration: 2.4, ease: 'sine.inOut' })
  }, el)

  d.add(() => g.revert())
  return { destroy: () => d.dispose() }
}
