/**
 * Слайдер №5 — видеолента (по образцу VideoSlider из UguKit).
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Ряд узких карточек-роликов шире экрана. Ленту можно тянуть мышью с
 * инерцией. Наводите курсор на карточку — через мгновение она раскрывается
 * в 3 раза шире, лента сама подъезжает так, чтобы раскрытая карточка
 * оказалась по центру, и запускается ролик. Увели курсор с ленты — карточка
 * сворачивается, ролик встаёт на паузу.
 *
 * ─── Почему движение плавное ──────────────────────────────────────────────
 * Раскрытие новой карточки и сворачивание старой — два твина ширины с
 * ОДИНАКОВЫМИ длительностью и кривой, запускаются в один момент, и третий
 * твин с теми же параметрами сдвигает дорожку. Всё едет синхронно, одним
 * движением: соседи не «прыгают», дорожка не дёргается.
 *
 * Ширину анимирует GSAP (а не CSS transition): так раскрытие можно прервать
 * на полпути (навели на другую карточку) без рывка — `overwrite: 'auto'`
 * подхватывает текущую ширину и ведёт к новой цели.
 *
 * ─── Три защиты от «нервного» поведения (как в референсе) ────────────────────
 * 1. HOVER_DELAY — курсор, просто пролетающий над лентой, не раскрывает по
 *    очереди каждую карточку.
 * 2. Заморозка наведения на время анимации: лента центрирует раскрытую
 *    карточку и подвозит соседнюю под неподвижный курсор — без заморозки
 *    та бы раскрылась, лента снова поехала, и так по цепочке.
 * 3. Наведение считается по ДВИЖЕНИЮ мыши (pointermove), а не по входу в
 *    карточку (pointerenter): вход случается и когда карточка сама подъехала.
 *
 * ─── Настройки ──────────────────────────────────────────────────────────────
 * Ширина обычной карточки — CSS-переменная `--vstrip-card-width`
 * (src/styles/sliders.css), во сколько раз шире раскрытая — EXPAND_RATIO
 * (layout.js), тайминги — константы ниже.
 *
 * МОБИЛКА: сейчас раскрытие — по наведению мыши. На тач-экранах наведения
 * нет: нужно раскрывать по тапу (в onClick ниже уже есть ветка для этого —
 * см. комментарий «МОБИЛКА») и уменьшить --vstrip-card-width. docs/11-mobile.md.
 * @module sliders/video-strip
 */
import { gsap, Draggable } from '../../../core/gsap.js'
import { createDisposer } from '../../../core/lifecycle.js'
import { loopSegment, pauseVideo, playVideo } from '../../../core/media.js'
import { expandedWidth, focusX, isInView, trackBounds } from './layout.js'

/** Длительность раскрытия/сворачивания и сдвига ленты, секунды. */
export const DURATION = 0.8
export const EASE = 'power3.inOut'
/** Задержка раскрытия по наведению, мс. */
export const HOVER_DELAY = 250
/** Задержка сворачивания, когда курсор ушёл с ленты, мс (случайный выход за край не схлопывает). */
export const LEAVE_DELAY = 200
/** Сколько мс после анимации наведение ещё «заморожено». */
export const HOVER_FREEZE_EXTRA = 300

const CARD = '[data-vstrip-card]'

/**
 * @param {HTMLElement} el Корень (`[data-module="video-strip"]`).
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const track = el.querySelector('[data-vstrip-track]')
  const cards = Array.from(el.querySelectorAll(CARD))

  if (!track || !cards.length) return { destroy() {} }

  const duration = ctx.reduced ? 0 : DURATION
  const videoOf = (card) => card.querySelector('video')

  /** Обычная ширина карточки из CSS-переменной (px). */
  const baseWidth = () => parseFloat(getComputedStyle(el).getPropertyValue('--vstrip-card-width')) || 280
  /** Зазор между карточками из CSS (gap у дорожки). */
  const gap = () => parseFloat(getComputedStyle(track).columnGap) || 0

  let active = null // раскрытая карточка или null
  let hoverTimer = 0
  let leaveTimer = 0
  let frozenUntil = 0
  let candidate = null // над какой карточкой курсор сейчас
  let dragging = false

  // --- видео ---------------------------------------------------------------------
  /** Подставить src при первом раскрытии (до этого ролик не грузится вовсе). */
  const load = (video) => {
    if (!video || video.getAttribute('src') || !video.dataset.src) return
    video.src = video.dataset.src
    // Крутить только «красивый» отрезок ролика (без титров) — см. content/videos.js.
    d.add(loopSegment(video, Number(video.dataset.start) || 0, Number(video.dataset.end)))
  }

  const play = (card) => {
    const video = videoOf(card)

    if (!video) return
    load(video)
    // Класс is-playing проявляет видео поверх постера (CSS), только когда оно реально заиграло.
    playVideo(video, Number(video.dataset.start) || 0).then((ok) => card.classList.toggle('is-playing', ok && card === active))
  }

  const pause = (card) => {
    pauseVideo(videoOf(card))
    card.classList.remove('is-playing')
  }

  // --- границы перетаскивания --------------------------------------------------------
  // Дорожка меняет длину во время раскрытия, поэтому границы пересчитываем
  // на каждом кадре анимации (onUpdate твинов ширины).
  const updateBounds = () => draggable?.applyBounds(trackBounds(el.clientWidth, track.scrollWidth))

  // --- раскрытие / сворачивание ------------------------------------------------------
  function collapse(card) {
    card.classList.remove('is-active')
    card.setAttribute('aria-expanded', 'false')
    pause(card)
    gsap.to(card, {
      width: baseWidth(),
      duration,
      ease: EASE,
      overwrite: 'auto',
      onUpdate: updateBounds,
      // После сворачивания убираем инлайн-ширину: снова работает CSS-переменная
      // (например, если её поменяют медиазапросом).
      onComplete: () => {
        gsap.set(card, { clearProps: 'width' })
        updateBounds()
      },
    })
  }

  function expand(card, { autoplay = true } = {}) {
    if (active && active !== card) collapse(active)
    active = card
    // Пока лента едет — наведение заморожено (защита №2 из шапки файла).
    clearTimeout(hoverTimer)
    candidate = null
    frozenUntil = performance.now() + duration * 1000 + HOVER_FREEZE_EXTRA

    const base = baseWidth()
    const expanded = expandedWidth(base, el.clientWidth)

    card.classList.add('is-active')
    card.setAttribute('aria-expanded', 'true')
    gsap.to(card, { width: expanded, duration, ease: EASE, overwrite: 'auto', onUpdate: updateBounds, onComplete: updateBounds })

    // Сдвиг дорожки — третьим твином с теми же параметрами: всё едет синхронно.
    const x = focusX({ index: cards.indexOf(card), count: cards.length, base, expanded, gap: gap(), viewport: el.clientWidth })

    gsap.to(track, { x, duration, ease: EASE, overwrite: 'auto' })

    // Содержимое (заголовок, текст) выезжает чуть позже, когда карточка уже широкая.
    gsap.fromTo(
      card.querySelectorAll('[data-vstrip-content]'),
      { y: 24, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: duration * 0.7, delay: duration * 0.45, stagger: 0.06, ease: 'power3.out', overwrite: true },
    )

    if (autoplay) play(card)
  }

  function deactivate() {
    if (!active) return
    collapse(active)
    active = null
  }

  /** Раскрытую карточку утащили за экран — сворачиваем. */
  function collapseIfOutOfView() {
    if (active && !isInView(active.getBoundingClientRect(), el.getBoundingClientRect())) deactivate()
  }

  // --- перетаскивание дорожки ----------------------------------------------------------
  const [draggable] = Draggable.create(track, {
    type: 'x',
    inertia: !ctx.reduced, // бросок с инерцией (InertiaPlugin)
    bounds: trackBounds(el.clientWidth, track.scrollWidth),
    edgeResistance: 0.85, // за границей тянется «туго», как резина
    minimumMovement: 6, // до 6 px — это клик, а не перетаскивание
    zIndexBoost: false,
    onPress: () => clearTimeout(hoverTimer),
    onDragStart: () => (dragging = true),
    onDragEnd: collapseIfOutOfView,
    onThrowComplete: collapseIfOutOfView,
    onRelease() {
      dragging = false
      // После перетаскивания под курсором может оказаться другая карточка —
      // раскрываем её (во время drag наведение не работало).
      const { clientX, clientY } = this.pointerEvent ?? {}
      const card = clientX === undefined ? null : document.elementFromPoint(clientX, clientY)?.closest(CARD)

      if (card && card !== active && this.pointerEvent?.pointerType === 'mouse') expand(card, { autoplay: !ctx.reduced })
    },
    // Draggable зовёт onClick, только если НЕ тянули — так клик отличается от перетаскивания.
    onClick(event) {
      const card = event.target.closest(CARD)

      if (!card) return
      // Клик по раскрытой: пауза / продолжить.
      if (card === active) {
        if (card.classList.contains('is-playing')) pause(card)
        else play(card)
        return
      }
      // МОБИЛКА: на тач-экране это основной способ раскрыть карточку (наведения нет).
      expand(card)
    },
  })

  d.add(() => draggable.kill())

  // --- наведение мышью (защиты №1 и №3) -------------------------------------------------
  d.listen(el, 'pointermove', (event) => {
    if (event.pointerType !== 'mouse' || dragging || performance.now() < frozenUntil) return

    const card = event.target.closest?.(CARD) ?? null

    if (card === candidate) return
    // Курсор перешёл на другую карточку — перезапускаем таймер раскрытия.
    candidate = card
    clearTimeout(hoverTimer)
    if (!card || card === active) return
    hoverTimer = setTimeout(() => expand(card, { autoplay: !ctx.reduced }), HOVER_DELAY)
  })
  d.listen(el, 'pointerenter', (event) => {
    if (event.pointerType === 'mouse') clearTimeout(leaveTimer)
  })
  d.listen(el, 'pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || dragging) return
    clearTimeout(hoverTimer)
    candidate = null
    leaveTimer = setTimeout(deactivate, LEAVE_DELAY)
  })

  // --- клавиатура: Tab по карточкам раскрывает их, Enter — пауза/продолжить ------------------
  cards.forEach((card) => {
    card.setAttribute('aria-expanded', 'false')
    d.listen(card, 'focusin', () => {
      if (active !== card) expand(card, { autoplay: !ctx.reduced })
    })
    d.listen(card, 'keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      if (card.classList.contains('is-playing')) pause(card)
      else play(card)
    })
  })

  // --- ресайз: раскрытую подгоняем мгновенно, границы — заново --------------------------
  const onResize = () => {
    if (active) gsap.set(active, { width: expandedWidth(baseWidth(), el.clientWidth) })
    updateBounds()
  }

  d.listen(window, 'resize', onResize)

  d.add(() => {
    clearTimeout(hoverTimer)
    clearTimeout(leaveTimer)
    cards.forEach((card) => {
      pause(card)
      card.classList.remove('is-active')
    })
    gsap.killTweensOf([track, ...cards])
    gsap.set(cards, { clearProps: 'width' })
    gsap.set(track, { clearProps: 'transform' })
  })

  return {
    expand,
    deactivate,
    get active() {
      return active ? cards.indexOf(active) : -1
    },
    destroy: () => d.dispose(),
  }
}
