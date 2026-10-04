/**
 * Лайтбокс — раскрытие фото на весь экран по клику (плагин Flip).
 *
 * ─── Что делает ───────────────────────────────────────────────────────────
 * Клик по карточке архива → фото плавно «вылетает» из своей ячейки в центр
 * экрана и растёт до полного кадра, под ним появляется подпись с автором.
 * Закрытие (крестик, клик по фону, Esc) — фото так же плавно возвращается.
 *
 * ─── Как работает Flip (главная идея) ─────────────────────────────────────
 * Flip = First, Last, Invert, Play — приём, который позволяет анимировать
 * то, что обычно анимировать нельзя: перенос элемента в другой родитель.
 *
 *   1. First  — запоминаем, где и какого размера элемент СЕЙЧАС:
 *               `const state = Flip.getState(img)`
 *   2. Last   — мгновенно делаем любое изменение DOM: здесь переносим
 *               тот же самый <img> из ячейки сетки в окно лайтбокса.
 *   3. Invert — Flip сдвигает и растягивает элемент так, чтобы он ВЫГЛЯДЕЛ
 *               как в «First», хотя в DOM он уже на новом месте.
 *   4. Play   — и анимирует эти поправки к нулю: `Flip.from(state, …)`.
 *
 * Мы переносим именно тот же элемент, а не копию: не нужна вторая загрузка
 * картинки, и браузер не мигает.
 *
 * ─── Почему `scale: false` ───────────────────────────────────────────────
 * По умолчанию Flip анимирует transform: scale — это быстро, но картинка в
 * процессе «растягивается». С `scale: false` Flip меняет реальные width и
 * height, а `object-fit: cover` у картинки на каждом кадре пересчитывает
 * кадрирование: из обрезанного квадратика ячейки фото плавно «раскрывается»
 * до полного кадра без искажений.
 *
 * ─── Как перенести ─────────────────────────────────────────────────────────
 * Файл не зависит от галереи: `createLightbox()` можно вызвать в любом
 * проекте и открывать им любую картинку — `lightbox.open(img, { title, … })`.
 * Нужен только Flip (`gsap.registerPlugin(Flip)`) и стили `.lightbox*` из
 * `src/styles/effects.css`.
 * @module gallery/lightbox
 */
import { gsap, Flip } from '../../core/gsap.js'
import { escapeHtml } from '../../content/render.js'

/** Длительность раскрытия, секунды. */
export const OPEN_DURATION = 0.85
/** Длительность закрытия, секунды (чуть быстрее — закрытие не должно «тянуть»). */
export const CLOSE_DURATION = 0.6

/**
 * Создать лайтбокс. Разметка окна добавляется в <body> один раз.
 *
 * Окно лежит в <body>, а не внутри секции галереи: секции находятся внутри
 * ScrollSmoother (`#smooth-content`), у которого есть transform, а внутри
 * transform-родителя `position: fixed` перестаёт фиксироваться к экрану.
 *
 * @param {{ reduced?: boolean, smoother?: { paused(value?: boolean): boolean } | null,
 *   onOpen?: () => void, onClose?: () => void }} [options]
 *   `smoother` — чтобы поставить плавный скролл на паузу, пока окно открыто;
 *   `onOpen` / `onClose` — например, остановить дрейф галереи.
 */
export function createLightbox({ reduced = false, smoother = null, onOpen, onClose } = {}) {
  const root = document.createElement('div')

  root.className = 'lightbox'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'Просмотр снимка')
  root.hidden = true
  root.innerHTML = `
    <div class="lightbox__backdrop" data-lightbox-close></div>
    <figure class="lightbox__figure">
      <div class="lightbox__frame" data-lightbox-frame></div>
      <figcaption class="lightbox__caption" data-lightbox-caption></figcaption>
    </figure>
    <button type="button" class="lightbox__close" data-lightbox-close aria-label="Закрыть">✕</button>`
  document.body.appendChild(root)

  const frame = root.querySelector('[data-lightbox-frame]')
  const caption = root.querySelector('[data-lightbox-caption]')
  const backdrop = root.querySelector('.lightbox__backdrop')
  const closeButton = root.querySelector('.lightbox__close')

  /** Что сейчас открыто: картинка и откуда её взяли (чтобы вернуть на место). */
  let current = null
  /** Идёт анимация — новые клики игнорируем, иначе состояния перепутаются. */
  let busy = false

  const duration = (value) => (reduced ? 0 : value)

  /**
   * Открыть картинку.
   * @param {HTMLImageElement} img Картинка из любой карточки (переедет в окно и обратно).
   * @param {{ title?: string, meta?: string, credit?: string }} [info] Подпись.
   */
  function open(img, info = {}) {
    if (busy || current || !img) return
    busy = true

    // Запоминаем, куда вернуть картинку: родитель и сосед, перед которым она стояла.
    current = { img, parent: img.parentNode, next: img.nextSibling, focus: document.activeElement }

    // Пропорции окна = пропорции снимка: тогда object-fit: cover внутри окна
    // показывает кадр целиком, без обрезки.
    const w = img.naturalWidth || Number(img.getAttribute('width')) || 4
    const h = img.naturalHeight || Number(img.getAttribute('height')) || 3

    // Число пропорций уходит в CSS-переменную: стили сами вписывают окно в экран
    // и по ширине, и по высоте (см. .lightbox__frame в src/styles/effects.css).
    frame.style.setProperty('--ar', (w / h).toFixed(4))
    caption.innerHTML = `
      <span class="lightbox__title">${escapeHtml(info.title ?? img.alt ?? '')}</span>
      <span class="lightbox__meta">${escapeHtml(info.meta ?? '')}</span>
      <span class="lightbox__credit">${escapeHtml(info.credit ?? '')}</span>`

    // 1. First: где картинка сейчас (в ячейке сетки).
    const state = Flip.getState(img)

    // 2. Last: показываем окно и переносим ТУ ЖЕ картинку в него.
    root.hidden = false
    frame.appendChild(img)
    smoother?.paused(true)
    onOpen?.()

    // 3–4. Invert + Play: Flip анимирует путь из ячейки в окно.
    Flip.from(state, {
      duration: duration(OPEN_DURATION),
      ease: 'liftoff', // своя кривая из CustomEase (см. src/core/gsap.js): мягкий старт, резкий разгон
      scale: false, // менять реальные width/height → кадрирование пересчитывается плавно
      absolute: true, // на время анимации вынуть из потока, чтобы соседи не прыгали
      onComplete: () => {
        busy = false
        closeButton.focus({ preventScroll: true })
      },
    })
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: duration(0.5) })
    gsap.fromTo(caption, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: duration(0.5), delay: duration(0.35) })
  }

  /** Закрыть: вернуть картинку на её место в карточке. */
  function close() {
    if (busy || !current) return
    busy = true

    const { img, parent, next, focus } = current
    const state = Flip.getState(img)

    // Возвращаем картинку туда, где она была, и анимируем обратный путь.
    parent.insertBefore(img, next)
    Flip.from(state, {
      duration: duration(CLOSE_DURATION),
      ease: 'power3.inOut',
      scale: false,
      absolute: true,
      onComplete: () => {
        // Flip оставляет на время анимации инлайн-стили — убираем их,
        // чтобы картинка снова подчинялась CSS карточки.
        gsap.set(img, { clearProps: 'all' })
        root.hidden = true
        current = null
        busy = false
        smoother?.paused(false)
        onClose?.()
        focus?.focus?.({ preventScroll: true })
      },
    })
    gsap.to(backdrop, { opacity: 0, duration: duration(0.4) })
    gsap.to(caption, { opacity: 0, duration: duration(0.2) })
  }

  // Закрыть по клику на фон / крестик и по Esc.
  const onClick = (event) => {
    if (event.target.closest('[data-lightbox-close]')) close()
  }
  const onKey = (event) => {
    if (event.key === 'Escape' && current) close()
  }

  root.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)

  return {
    open,
    close,
    get isOpen() {
      return !!current
    },
    /** Убрать окно со страницы (если открыто — вернуть картинку на место без анимации). */
    destroy() {
      if (current) {
        current.parent.insertBefore(current.img, current.next)
        gsap.set(current.img, { clearProps: 'all' })
        smoother?.paused(false)
      }
      root.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
      root.remove()
    },
  }
}
