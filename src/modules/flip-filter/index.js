/**
 * Фильтр снимков по категориям с анимацией Flip.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Кнопки «Все / Планеты / Туманности / …» и сетка снимков. Нажали «Планеты» —
 * лишние снимки уменьшаются и тают, оставшиеся ПЛАВНО переезжают на новые
 * места в сетке, а сама сетка становится ниже.
 *
 * ─── Почему без Flip это сложно ─────────────────────────────────────────────
 * Скрыть элемент — значит `display: none`. Сетка мгновенно перестраивается,
 * и все карточки «прыгают» на новые места. Анимировать `display` нельзя, а
 * считать новые позиции каждой карточки вручную — долго и хрупко.
 *
 * ─── Как работает Flip (First → Last → Invert → Play) ───────────────────────
 *   const state = Flip.getState(items)   // First: запомнить, где все сейчас
 *   item.classList.toggle('is-hidden')   // Last: мгновенно показать/скрыть
 *   Flip.from(state, { … })              // Invert+Play: из старых позиций в новые
 *
 * - `absolute: true` — на время анимации карточки вынимаются из сетки
 *   (position: absolute), иначе исчезающие карточки мешали бы раскладке;
 * - `onEnter` — что делать с карточками, которые ПОЯВИЛИСЬ (были скрыты);
 * - `onLeave` — что делать с теми, что ИСЧЕЗАЮТ;
 * - `nested`/`scale` — по умолчанию Flip анимирует transform (быстро).
 *
 * После анимации высота сетки изменилась — значит, сдвинулось всё, что
 * ниже, и ScrollTrigger надо пересчитать (`ScrollTrigger.refresh()`).
 *
 * ─── Почему страница не прыгает ─────────────────────────────────────────────
 * Без защиты при каждом клике по табу страница «скакала». Две причины:
 * 1. `absolute: true` на время анимации вынимает ВСЕ карточки из сетки —
 *    сетка схлопывается до нуля, страница резко становится короче.
 *    → Фиксируем высоту сетки на старте и плавно анимируем её к новой.
 * 2. Если сетка стала ниже, а вы прокрутили близко к концу страницы, браузер
 *    «подтягивает» прокрутку (нельзя быть ниже конца страницы).
 *    → Оставляем сетке min-height ровно такой, чтобы страница не стала
 *    короче уже прокрученного (keepRoomFor). Лишнее место исчезнет при
 *    следующем фильтре или прокрутке вверх.
 * И в конце, если табы всё же сдвинулись на экране, — подкручиваем прокрутку,
 * чтобы они остались ровно там, где были в момент клика.
 *
 * ─── Разметка ────────────────────────────────────────────────────────────────
 *   <section data-module="flip-filter">
 *     <button data-filter="all">Все</button> <button data-filter="Планеты">…</button>
 *     <div> <figure data-flip-item data-category="Планеты">…</figure> … </div>
 *   </section>
 * Категории карточек ставит шаблон 'filter-grid' (src/content/render.js),
 * список категорий — CATEGORIES в src/content/photos.js.
 * @module flip-filter
 */
import { gsap, Flip, ScrollTrigger } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'

/** Подходит ли карточка под фильтр ('all' — подходит любая). */
export const matchesFilter = (category, filter) => filter === 'all' || category === filter

/**
 * Минимальная высота сетки, при которой страница не станет короче уже
 * прокрученного: сетка может уменьшиться не больше чем на «запас прокрутки
 * ниже текущего места».
 * @param {number} startHeight Высота сетки до фильтра.
 * @param {number} endHeight Высота после фильтра (по содержимому).
 * @param {number} maxScroll Предел прокрутки страницы ДО фильтра.
 * @param {number} scroll Текущая прокрутка.
 */
export const keepRoomFor = (startHeight, endHeight, maxScroll, scroll) =>
  Math.max(endHeight, startHeight - Math.max(0, maxScroll - scroll))

/**
 * @param {HTMLElement} el
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const buttons = Array.from(el.querySelectorAll('[data-filter]'))
  const items = Array.from(el.querySelectorAll('[data-flip-item]'))
  const grid = items[0]?.parentElement
  const tabs = buttons[0]?.parentElement
  let current = 'all'
  let flip = null

  if (!buttons.length || !items.length) return { destroy() {} }

  /** Применить фильтр с анимацией. */
  function apply(filter) {
    if (filter === current) return
    current = filter

    // Кнопки: подсветка выбранной (и aria-pressed для скринридеров).
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)))

    // Где табы на экране сейчас — сюда же вернём их после анимации.
    const anchorTop = tabs.getBoundingClientRect().top
    const maxScroll = ScrollTrigger.maxScroll(window)
    const scroll = ctx.getScroll?.() ?? window.scrollY

    // Сбросить запас от прошлого фильтра, чтобы измерить честную высоту.
    grid.style.minHeight = ''

    const startHeight = grid.offsetHeight

    // 1. First — запоминаем положение всех карточек, в том числе скрытых.
    const state = Flip.getState(items)

    // 2. Last — мгновенно показываем/скрываем.
    items.forEach((item) => item.classList.toggle('is-hidden', !matchesFilter(item.dataset.category, filter)))

    const endHeight = keepRoomFor(startHeight, grid.offsetHeight, maxScroll, scroll)
    const duration = ctx.reduced ? 0 : 0.7

    // Высота сетки — плавно от старой к новой (иначе на время анимации сетка
    // схлопнулась бы: absolute: true вынимает карточки из потока).
    gsap.killTweensOf(grid)
    gsap.fromTo(
      grid,
      { height: startHeight },
      {
        height: endHeight,
        duration,
        ease: 'power3.inOut',
        onComplete: () => {
          gsap.set(grid, { clearProps: 'height' })
          grid.style.minHeight = `${endHeight}px` // запас, чтобы страница не «подтянулась»
          // Высота изменилась — пересчитать позиции ScrollTrigger ниже.
          ScrollTrigger.refresh()
          keepTabsAt(anchorTop)
        },
      },
    )

    // 3-4. Invert + Play.
    flip?.kill()
    flip = Flip.from(state, {
      duration,
      ease: 'power3.inOut',
      absolute: true,
      // Появившиеся: из маленьких и прозрачных в нормальные.
      onEnter: (elements) => gsap.fromTo(elements, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: ctx.reduced ? 0 : 0.6, delay: 0.1 }),
      // Исчезающие: уменьшаются и тают (Flip сам спрячет их после анимации).
      onLeave: (elements) => gsap.to(elements, { opacity: 0, scale: 0.7, duration: ctx.reduced ? 0 : 0.5 }),
    })
  }

  /** Вернуть табы на прежнее место на экране (если что-то сдвинуло страницу). */
  function keepTabsAt(anchorTop) {
    const delta = tabs.getBoundingClientRect().top - anchorTop

    if (Math.abs(delta) < 1) return
    if (ctx.smoother) ctx.smoother.scrollTop(ctx.smoother.scrollTop() + delta)
    else window.scrollBy(0, delta)
  }

  buttons.forEach((button) => d.listen(button, 'click', () => apply(button.dataset.filter)))
  d.add(() => flip?.kill())
  d.add(() => items.forEach((item) => item.classList.remove('is-hidden')))
  d.add(() => {
    gsap.killTweensOf(grid)
    gsap.set(grid, { clearProps: 'height,minHeight' })
  })

  return {
    apply,
    get filter() {
      return current
    },
    destroy: () => d.dispose(),
  }
}
