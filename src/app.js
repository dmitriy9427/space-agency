/**
 * Приложение: собирает всё вместе и управляет страницами.
 *
 * ─── Два слоя ───────────────────────────────────────────────────────────────
 * 1. ОБЩИЙ (живёт всё время, пока открыт сайт): небо, курсор, шапка,
 *    плавный скролл (ScrollSmoother), занавес перехода, роутер.
 * 2. СТРАНИЦА (пересоздаётся при каждом переходе): содержимое
 *    `<main data-page="…">` и фиксированные слои страницы
 *    `<div data-page-fixed>` (например, canvas ракеты на главной).
 *
 * ─── Переход между страницами ─────────────────────────────────────────────
 *   клик по ссылке ─► router ─► navigate(url)
 *        ├─ сразу начинаем скачивать HTML новой страницы (fetchPage)
 *        └─ занавес закрывает экран (transition.play), а под ним:
 *             1. unmountPage()  — destroy() всех модулей старой страницы
 *             2. swapPage()     — подменить <main> и [data-page-fixed] на новые
 *             3. history.pushState — сменить адрес в браузере
 *             4. прокрутить в начало (или к #якорю)
 *             5. mountPage()    — запустить модули новой страницы
 *        └─ занавес открывает новую страницу
 *
 * Если что-то пошло не так (нет сети, ошибка) — обычная загрузка страницы:
 * `window.location.href = url`. Пользователь всё равно попадёт куда хотел.
 *
 * ─── Как добавить страницу ─────────────────────────────────────────────────
 * docs/07-customization.md, раздел «Добавить страницу».
 * @module app
 */
import { gsap, ScrollSmoother, ScrollTrigger } from './core/gsap.js'
import { createBus } from './core/bus.js'
import { getQuality, isCoarsePointer, prefersReducedMotion } from './core/env.js'
import { isDebug, mountFpsOverlay } from './core/fps.js'
import { mountModules } from './core/registry.js'
import { createRouter, fetchPage } from './core/router.js'
import { renderSlots } from './content/render.js'
import { createTransition } from './modules/page-transition/index.js'

/**
 * @param {{ shared: Record<string, Function>, page: Record<string, Function> }} registries
 *   shared — модули общего слоя (курсор, шапка), page — модули страниц.
 */
export async function startApp(registries) {
  const reduced = prefersReducedMotion()
  const quality = getQuality()

  // Уровень качества — атрибутом на <html>: в CSS можно, например, выключить
  // тяжёлый backdrop-filter для [data-quality="low"].
  document.documentElement.dataset.quality = quality.tier

  // --- плавный скролл ----------------------------------------------------------
  // Не на тач-экранах (там родная инерция лучше) и не при reduced motion.
  // effects: false — параллакс (data-speed / data-lag) включаем сами для
  // каждой страницы в mountPage(), иначе после перехода он бы не работал.
  // Тач-экраны: без ScrollSmoother — родная прокрутка телефона быстрее и
  // привычнее (docs/11-mobile.md).
  const smoother =
    reduced || isCoarsePointer()
      ? null
      : ScrollSmoother.create({ wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 1.1, effects: false })

  // На мобильных браузерах высота окна меняется, когда прячется адресная
  // строка; без этой настройки ScrollTrigger пересчитывал бы всё на каждом скролле.
  ScrollTrigger.config({ ignoreMobileResize: true })

  /** Контекст, который получает каждый модуль (docs/04-architecture.md). */
  const ctx = {
    gsap,
    bus: createBus(),
    quality,
    reduced,
    smoother,
    getScroll: () => (smoother ? smoother.scrollTop() : window.scrollY),
  }

  // --- общий слой: курсор, шапка ------------------------------------------------
  // strict: false — модули страниц в этом проходе молча пропускаются.
  const shared = await mountModules(registries.shared, ctx, document, { strict: false })

  // --- страница -----------------------------------------------------------------
  let page = null // { apps: [...], effects: [...] }

  const pageMain = () => document.querySelector('main[data-page]')
  const pageFixed = () => document.querySelector('[data-page-fixed]')

  /** Запустить модули текущей страницы. */
  async function mountPage() {
    const main = pageMain()
    const fixed = pageFixed()

    // Заполнить шаблонные карточки (data-render) — до запуска модулей.
    if (main) renderSlots(main)

    const roots = [fixed, main].filter(Boolean)
    const apps = await Promise.all(roots.map((root) => mountModules(registries.page, ctx, root)))
    // Параллакс ScrollSmoother для элементов этой страницы.
    const effects = smoother && main ? smoother.effects(main.querySelectorAll('[data-speed], [data-lag]'), { refresh: false }) : []

    page = { apps, effects }

    // Небо: на главной его затемняет история (0 → 1), на остальных — сразу «космос».
    const sky = main?.dataset.sky

    if (sky === undefined) document.documentElement.style.removeProperty('--sky-mix')
    else document.documentElement.style.setProperty('--sky-mix', sky)

    // Пины создавались модулями в разное время — выстраиваем порядок и пересчитываем позиции.
    ScrollTrigger.sort()
    ScrollTrigger.refresh()

    document.body.dataset.page = main?.dataset.page ?? ''
    ctx.bus.emit('page:change', { page: main?.dataset.page, url: window.location.href })

    if (isDebug()) {
      console.info('[orbita] страница', main?.dataset.page, 'модули', apps.flatMap((a) => a.mounted), 'упали', apps.flatMap((a) => a.failed))
    }
  }

  /** Убрать модули текущей страницы (всё, что они навесили). */
  function unmountPage() {
    if (!page) return
    page.apps.forEach((app) => app.destroy())
    page.effects.forEach((effect) => effect.kill())
    page = null
  }

  /** Подменить содержимое страницы на содержимое из другого документа. */
  function swapPage(doc) {
    const nextMain = doc.querySelector('main[data-page]')
    const nextFixed = doc.querySelector('[data-page-fixed]')

    if (!nextMain) throw new Error('В новой странице нет <main data-page>')
    // replaceWith переносит узлы из чужого документа в наш (adopt) автоматически.
    pageMain()?.replaceWith(nextMain)
    if (nextFixed) pageFixed()?.replaceWith(nextFixed)
    document.title = doc.title
  }

  /** Прокрутить в начало страницы или к #якорю. */
  function scrollToStart(url) {
    const target = url.hash ? document.querySelector(url.hash) : null

    if (smoother) {
      smoother.scrollTop(0)
      if (target) smoother.scrollTo(target, false, 'top top')
    } else {
      window.scrollTo(0, 0)
      target?.scrollIntoView()
    }
  }

  // --- переходы -------------------------------------------------------------------
  const transition = await createTransition(ctx)

  async function navigate(url, { push }) {
    if (transition.running) return

    // Скачивание начинаем сразу — оно идёт параллельно с закрытием занавеса.
    const docPromise = fetchPage(url)

    try {
      await transition.play(async () => {
        const doc = await docPromise

        unmountPage()
        swapPage(doc)
        if (push) history.pushState({}, '', url)
        scrollToStart(url)
        await mountPage()
      })
    } catch (error) {
      console.error('[orbita] переход не удался, открываем страницу обычным способом', error)
      window.location.href = url.href
    }
  }

  const router = createRouter(navigate)

  await mountPage()
  // Шрифты влияют на высоту текста, а значит — на все позиции ScrollTrigger.
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
  document.documentElement.classList.add('is-ready')

  // --- отладка ----------------------------------------------------------------------
  if (isDebug()) {
    window.__orbita = { ctx, shared, get page() { return page }, navigate }
    mountFpsOverlay(gsap, () => {
      if (!ctx.rocket) return ''
      return ctx.rocketSleeping ? '· ракета спит' : `· ракета ${ctx.rocket.drawCalls} draw calls`
    })
  }

  return {
    ctx,
    navigate,
    /** Полностью остановить приложение (нужно при горячей перезагрузке Vite). */
    destroy() {
      router.destroy()
      unmountPage()
      shared.destroy()
      transition.destroy()
      smoother?.kill()
    },
  }
}
