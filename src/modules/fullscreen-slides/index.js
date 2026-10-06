/**
 * Полноэкранные слайды «Направления» — листаются колесом, свайпом, стрелками.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Экран целиком занят одной планетой. Одно движение колеса (или свайп,
 * или ↑/↓) — и следующая планета «въезжает» снизу, а старая уходит вверх,
 * с параллаксом фона. Название собирается по буквам, цифры расшифровываются.
 * В углу — мини-схема маршрута: кораблик летит по кривой к текущей планете.
 *
 * ─── Чем это отличается от обычной прокрутки ───────────────────────────────
 * Страница НЕ прокручивается. Плагин Observer ловит «намерение» пользователя
 * (колесо вниз, свайп вверх, стрелка) и мы сами решаем, что показать.
 * Это как слайды презентации, а не лента.
 *
 * ─── Приём «двойная обёртка» (outer/inner) для перехода ───────────────────────
 * У каждого слайда два вложенных контейнера с overflow: hidden:
 *   outer сдвигаем на +100%, а inner на −100% — они компенсируют друг друга,
 *   и картинка стоит на месте, но outer обрезает её до нулевой видимой
 *   высоты. Анимируем оба к 0 — слайд «раскрывается» как шторка, а фон
 *   внутри при этом почти неподвижен. Классический приём из демо GSAP
 *   (gsap.com — «Observer: full screen sections»).
 *
 * ─── Мини-схема (MotionPath) ─────────────────────────────────────────────────
 * На SVG-кривой расставлены точки планет; кораблик едет по кривой с помощью
 * `motionPath: { path, start, end }` — от доли пути прошлой планеты до доли
 * пути новой.
 *
 * Телефон: свайпы понимает Observer (type: 'touch'); мини-схема скрыта,
 * заголовки меньше, счётчик наверху — mobile.css.
 * @module fullscreen-slides
 */
import { gsap, Observer, SplitText } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'
import { mod } from '../../core/math.js'

/** Длительность смены слайда, секунды. */
export const DURATION = 1.15

/**
 * Доля пути по кривой для точки `index` из `count` (равномерно от 0 до 1).
 * @returns {number}
 */
export const routeFraction = (index, count) => (count <= 1 ? 0 : index / (count - 1))

/**
 * @param {HTMLElement} el Корень (`[data-module="fullscreen-slides"]`).
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const slides = Array.from(el.querySelectorAll('[data-fslide]'))
  const outers = slides.map((s) => s.querySelector('[data-fslide-outer]'))
  const inners = slides.map((s) => s.querySelector('[data-fslide-inner]'))
  const bgs = slides.map((s) => s.querySelector('[data-fslide-bg]'))
  const titles = slides.map((s) => s.querySelector('[data-fslide-title]'))
  const counter = el.querySelector('[data-fslides-counter]')
  const dots = Array.from(el.querySelectorAll('[data-fslides-dot]'))
  const routePath = el.querySelector('[data-route-path]')
  const ship = el.querySelector('[data-route-ship]')

  if (slides.length < 2) return { destroy() {} }

  const count = slides.length
  const duration = ctx.reduced ? 0 : DURATION
  let current = -1
  let animating = false

  // Нарезаем заголовки на буквы один раз (каждая буква — отдельный элемент).
  const splits = titles.map((title) => (title ? SplitText.create(title, { type: 'chars, words', mask: 'chars' }) : null))

  d.add(() => splits.forEach((split) => split?.revert()))

  // Стартовое положение: все слайды скрыты, кроме первого (выставит goTo(0)).
  gsap.set(outers, { yPercent: 100 })
  gsap.set(inners, { yPercent: -100 })

  // Расставить точки планет вдоль кривой мини-схемы.
  const placeRouteDots = () => {
    if (!routePath?.getTotalLength) return
    const length = routePath.getTotalLength()

    el.querySelectorAll('[data-route-dot]').forEach((dot, i) => {
      const point = routePath.getPointAtLength(length * routeFraction(i, count))

      dot.setAttribute('cx', point.x.toFixed(1))
      dot.setAttribute('cy', point.y.toFixed(1))
    })
  }

  placeRouteDots()

  /**
   * Показать слайд `index`. `direction` 1 — листаем вперёд (новый въезжает
   * снизу), −1 — назад (сверху).
   */
  function goTo(index, direction) {
    index = mod(index, count) // после последнего — снова первый
    if (index === current || animating) return
    animating = true

    const from = current
    const dir = direction
    const tl = gsap.timeline({
      defaults: { duration, ease: 'power2.inOut' },
      onComplete: () => (animating = false),
    })

    // Уходящий слайд: съезжает вверх (или вниз), фон — с параллаксом.
    if (from >= 0) {
      gsap.set(slides[from], { zIndex: 0 })
      tl.to(bgs[from], { yPercent: -15 * dir }, 0).set(slides[from], { autoAlpha: 0 })
    }

    // Входящий слайд: «шторка» из двух обёрток (см. шапку файла).
    gsap.set(slides[index], { autoAlpha: 1, zIndex: 1 })
    tl.fromTo([outers[index], inners[index]], { yPercent: (i) => (i ? -100 * dir : 100 * dir) }, { yPercent: 0 }, 0)
      .fromTo(bgs[index], { yPercent: 15 * dir }, { yPercent: 0 }, 0)

    // Буквы названия — волной снизу.
    if (splits[index]) {
      tl.fromTo(
        splits[index].chars,
        { yPercent: 120 * dir, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: duration * 0.8, ease: 'expo.out', stagger: { each: 0.03, from: 'center' } },
        duration * 0.25,
      )
    }

    // Цифры — «расшифровка».
    slides[index].querySelectorAll('[data-fslide-stat]').forEach((stat, i) => {
      tl.to(stat, { duration: 0.8, scrambleText: { text: stat.textContent, chars: '0123456789', speed: 0.6 } }, duration * 0.4 + i * 0.1)
    })

    // Кораблик на мини-схеме: от прошлой планеты к новой по кривой.
    if (routePath && ship) {
      tl.to(
        ship,
        {
          motionPath: {
            path: routePath,
            align: routePath,
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
            start: routeFraction(Math.max(from, 0), count),
            end: routeFraction(index, count),
          },
          duration: duration * 1.1,
          ease: 'power1.inOut',
        },
        0,
      )
    }

    current = index
    if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index))
  }

  // --- Observer: колесо, палец, мышь → «вперёд/назад» ------------------------------------
  // wheelSpeed: -1 — колесо вниз считается движением «вверх» (onUp), как у
  // свайпа пальцем вверх: в обоих случаях хотим следующий слайд.
  // tolerance — порог в px, чтобы лёгкое касание тачпада не листало.
  // preventDefault — страница не должна прокручиваться сама.
  const observer = Observer.create({
    target: window,
    type: 'wheel,touch,pointer',
    wheelSpeed: -1,
    tolerance: 10,
    preventDefault: true,
    onUp: () => goTo(current + 1, 1),
    onDown: () => goTo(current - 1, -1),
  })

  d.add(() => observer.kill())

  // Клавиатура.
  d.listen(window, 'keydown', (event) => {
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault()
      goTo(current + 1, 1)
    }
    if (['ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault()
      goTo(current - 1, -1)
    }
  })

  // Точки навигации.
  dots.forEach((dot, i) => d.listen(dot, 'click', () => goTo(i, i > current ? 1 : -1)))

  d.add(() => {
    gsap.killTweensOf([...outers, ...inners, ...bgs, ...slides, ship].filter(Boolean))
    gsap.set([...outers, ...inners, ...bgs, ...slides], { clearProps: 'all' })
  })

  goTo(0, 1)

  return {
    goTo,
    get index() {
      return current
    },
    destroy: () => d.dispose(),
  }
}
