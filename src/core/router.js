/**
 * Маленький роутер для переходов между страницами без перезагрузки.
 *
 * ─── Зачем ──────────────────────────────────────────────────────────────────
 * Обычная ссылка перезагружает страницу: браузер стирает всё и рисует новую
 * с нуля — плавного перехода не сделать. Роутер перехватывает клик по
 * ссылке, сам скачивает HTML новой страницы и отдаёт управление коду,
 * который подменит содержимое под анимацией (см. src/app.js).
 *
 * При этом сайт остаётся обычным многостраничным: у каждой страницы свой
 * .html-файл, ссылки — обычные <a href>, без JavaScript всё работает
 * как раньше (просто без анимации). Это называют «progressive enhancement».
 *
 * ─── Какие клики перехватываем ──────────────────────────────────────────────
 * Только «обычный» левый клик по ссылке на другую страницу ЭТОГО ЖЕ сайта.
 * Не трогаем: другие домены, target="_blank", download, клики с Ctrl/Cmd/
 * Shift (открыть в новой вкладке), ссылки-якоря на текущей странице (их
 * прокручивает модуль nav) и ссылки с атрибутом `data-no-router`.
 *
 * ─── Как перенести ─────────────────────────────────────────────────────────
 * В React/Vue/Next роутер уже есть (React Router, Vue Router, next/navigation):
 * этот файл не нужен — переход вызывайте из их хуков (docs/06-porting.md).
 * В многостраничном сайте без фреймворка (Astro, обычный HTML, CMS) —
 * берите как есть.
 * @module core/router
 */

/**
 * Путь без «index.html» и без завершающего слэша: «/» и «/index.html» —
 * одна и та же страница.
 * @param {string} pathname
 */
export function normalizePath(pathname) {
  const path = pathname.replace(/index\.html$/, '').replace(/\/+$/, '')

  return path || '/'
}

/** Та же ли это страница (сравниваем путь, без якоря и параметров). */
export const isSamePage = (a, b) => normalizePath(a.pathname) === normalizePath(b.pathname)

/**
 * Нужно ли роутеру перехватить клик по этой ссылке.
 * @param {MouseEvent} event
 * @param {HTMLAnchorElement | null} link
 * @param {Location | URL} current Текущий адрес.
 */
export function shouldIntercept(event, link, current) {
  if (!link || event.defaultPrevented) return false
  // Не левая кнопка или с модификатором — пользователь хочет новую вкладку/окно.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (link.target && link.target !== '_self') return false
  if (link.hasAttribute('download') || link.hasAttribute('data-no-router')) return false

  const url = new URL(link.href, current.href)

  if (url.origin !== current.origin) return false
  // Якорь на этой же странице — не переход, а прокрутка (её делает nav).
  if (isSamePage(url, current) && url.hash) return false
  return true
}

/**
 * Запустить роутер.
 * @param {(url: URL, options: { push: boolean }) => Promise<void> | void} onNavigate
 *   Что делать при переходе. `push: true` — добавить запись в историю
 *   (клик по ссылке), `false` — запись уже есть (кнопки «назад/вперёд»).
 * @returns {{ destroy(): void }}
 */
export function createRouter(onNavigate) {
  const onClick = (event) => {
    const link = event.target.closest?.('a[href]')

    if (!shouldIntercept(event, link, window.location)) return
    event.preventDefault()
    onNavigate(new URL(link.href, window.location.href), { push: true })
  }

  // «Назад» / «вперёд» в браузере: адрес уже сменился, нужно подменить страницу.
  const onPopState = () => onNavigate(new URL(window.location.href), { push: false })

  document.addEventListener('click', onClick)
  window.addEventListener('popstate', onPopState)

  return {
    destroy() {
      document.removeEventListener('click', onClick)
      window.removeEventListener('popstate', onPopState)
    },
  }
}

/**
 * Скачать HTML страницы и разобрать его в документ (не показывая).
 * @param {URL | string} url
 * @returns {Promise<Document>}
 */
export async function fetchPage(url) {
  const response = await fetch(url, { headers: { Accept: 'text/html' } })

  if (!response.ok) throw new Error(`Страница ${url} ответила ${response.status}`)
  return new DOMParser().parseFromString(await response.text(), 'text/html')
}
