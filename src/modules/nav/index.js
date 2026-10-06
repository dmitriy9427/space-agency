/**
 * Шапка сайта (общий слой — живёт на всех страницах).
 *
 * ─── Что делает ─────────────────────────────────────────────────────────────
 * 1. Клик по ссылке-якорю НА ТЕКУЩЕЙ странице (например, «/#fleet», когда мы
 *    на главной) — плавная прокрутка к секции. Ссылки на ДРУГИЕ страницы
 *    сюда не попадают: их перехватывает роутер (src/core/router.js) и
 *    показывает переход-занавес.
 * 2. Прячется, когда листаете вниз, и возвращается, когда листаете вверх
 *    (`shouldShowHeader`) — больше места для контента.
 * 3. Полоса прогресса прокрутки страницы под шапкой.
 * 4. Подсвечивает пункт текущей страницы (`aria-current="page"`).
 * 5. Телефон (до 860px): бургер и меню на весь экран. Панель раскрывается
 *    кругом из точки бургера (clip-path), пункты влетают по очереди — один
 *    GSAP-таймлайн, закрытие — он же в обратную сторону. Пока открыто:
 *    страница не прокручивается, Tab ходит только по меню, Esc закрывает.
 *
 * Плавная прокрутка: если включён ScrollSmoother — его `scrollTo`; если нет
 * (телефон, reduced motion) — плагин ScrollToPlugin.
 * @module nav
 */
import { gsap, ScrollTrigger } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'
import { isSamePage, normalizePath } from '../../core/router.js'

/**
 * Показывать ли шапку: при прокрутке вверх и у самого верха страницы — да.
 * @param {number} direction 1 — листаем вниз, −1 — вверх.
 * @param {number} scroll Текущая прокрутка, px.
 * @param {number} [threshold] Ближе к верху шапка видна всегда.
 */
export const shouldShowHeader = (direction, scroll, threshold = 120) => direction < 0 || scroll < threshold

/**
 * @param {HTMLElement} el Шапка (`[data-module="nav"]`).
 * @param {{ smoother: any, reduced: boolean, bus?: { on: Function } }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const bar = el.querySelector('[data-nav-progress]')

  // --- якоря на текущей странице ---------------------------------------------------
  d.listen(el, 'click', (event) => {
    const link = event.target.closest('a[href]')

    if (!link) return

    const url = new URL(link.href, window.location.href)

    // Только «#якорь на этой же странице». Остальное — дело роутера.
    if (!url.hash || !isSamePage(url, window.location)) return

    const target = url.hash.length > 1 ? document.querySelector(url.hash) : null

    if (!target) return
    // preventDefault — браузер не прыгает к якорю сам; роутер видит
    // defaultPrevented и тоже не вмешивается.
    event.preventDefault()

    if (ctx.smoother) ctx.smoother.scrollTo(target, !ctx.reduced, 'top top')
    else gsap.to(window, { scrollTo: { y: target, autoKill: true }, duration: ctx.reduced ? 0 : 1.2, ease: 'power3.inOut' })
  })

  // --- прятать при прокрутке вниз + полоса прогресса ------------------------------------
  // ScrollTrigger без trigger-элемента следит за всей страницей: от 0 до конца ('max').
  // После смены страницы роутер вызывает ScrollTrigger.refresh() — и «конец»
  // пересчитывается под новую длину страницы.
  const trigger = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      el.classList.toggle('is-hidden', !shouldShowHeader(self.direction, self.scroll()))
      if (bar) bar.style.transform = `scaleX(${self.progress.toFixed(4)})`
    },
  })

  d.add(() => trigger.kill())

  // --- подсветка текущей страницы ------------------------------------------------------
  const markCurrent = () => {
    const here = normalizePath(window.location.pathname)

    el.querySelectorAll('a[href]').forEach((link) => {
      const url = new URL(link.href, window.location.href)
      // Пункт страницы — ссылка без якоря на текущий путь.
      const current = !url.hash && normalizePath(url.pathname) === here

      if (current) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
    // После перехода шапка снова видна (новая страница начинается сверху).
    el.classList.remove('is-hidden')
  }

  markCurrent()
  if (ctx.bus) d.add(ctx.bus.on('page:change', markCurrent))

  // --- мобильное меню ---------------------------------------------------------------------
  const burger = el.querySelector('.nav__burger')
  const panel = el.querySelector('.nav__links')

  if (burger && panel) {
    const links = [...panel.querySelectorAll('a')]
    const origin = () => {
      const r = burger.getBoundingClientRect()
      return `${r.left + r.width / 2}px ${r.top + r.height / 2}px`
    }
    // immediateRender: false — иначе fromTo сразу применил бы стартовые значения
    // (невидимые пункты, свёрнутая панель) и на десктопе, где меню — строка ссылок.
    const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } })
    tl.fromTo(
      panel,
      { clipPath: () => `circle(0px at ${origin()})` },
      { clipPath: () => `circle(150% at ${origin()})`, duration: ctx.reduced ? 0 : 0.7, ease: 'power3.inOut' },
    ).fromTo(
      links,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: ctx.reduced ? 0 : 0.5, ease: 'power3.out', stagger: 0.05 },
      ctx.reduced ? 0 : 0.3,
    )

    panel.setAttribute('tabindex', '-1')
    let open = false
    const setOpen = (next) => {
      if (next === open) return
      open = next
      el.classList.toggle('is-open', open)
      burger.setAttribute('aria-expanded', String(open))
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню')
      document.documentElement.style.overflow = open ? 'hidden' : ''
      if (open) {
        tl.invalidate().play(0)
        // Фокус — на саму панель (не на первый пункт: иначе он «подсвечен» рамкой).
        panel.focus({ preventScroll: true })
      } else {
        tl.reverse()
      }
    }

    d.listen(burger, 'click', () => setOpen(!open))
    // Любая ссылка в меню закрывает его (якорь прокрутит, страницу сменит роутер).
    d.listen(panel, 'click', (event) => {
      if (event.target.closest('a')) setOpen(false)
    })
    d.listen(document, 'keydown', (event) => {
      if (!open) return
      if (event.key === 'Escape') {
        setOpen(false)
        burger.focus()
      }
      // Tab — по кругу внутри меню (бургер + пункты).
      if (event.key === 'Tab') {
        const items = [burger, ...links]
        const i = document.activeElement === panel ? -1 : items.indexOf(document.activeElement)
        const next = event.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length
        event.preventDefault()
        items[next].focus()
      }
    })
    // Окно стало шире — меню не нужно; закрываем и сбрасываем стили.
    const wide = window.matchMedia('(min-width: 861px)')
    const onWide = () => {
      if (!wide.matches) return
      setOpen(false)
      tl.progress(0).pause()
      gsap.set([panel, ...links], { clearProps: 'all' })
    }
    d.listen(wide, 'change', onWide)
    if (ctx.bus) d.add(ctx.bus.on('page:change', () => setOpen(false)))
    d.add(() => {
      tl.kill()
      document.documentElement.style.overflow = ''
    })
  }

  return { destroy: () => d.dispose() }
}
