/**
 * Картинки и видео: загрузка для WebGL и безопасное управление роликами.
 * @module core/media
 */

/**
 * Загрузить и декодировать картинку, вернуть промис с готовым <img>.
 *
 * Зачем: WebGL-текстуру можно сделать только из УЖЕ загруженной картинки,
 * иначе она будет пустой (чёрной). Картинки должны быть с того же домена
 * (наши лежат в public/photos), иначе WebGL откажет из соображений
 * безопасности (CORS) — docs/02-concepts.md, раздел 2.10.
 *
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.decoding = 'async' // декодировать вне основного потока, без подтормаживания
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Не загрузилась картинка ${src}`))
    image.src = src
  })
}

/**
 * Запустить видео.
 *
 * Тонкости, которые здесь учтены:
 * - `video.play()` возвращает промис, который ПАДАЕТ, если браузер запретил
 *   автозапуск или ролик убрали со страницы. Это не ошибка сайта — ловим её
 *   и возвращаем false.
 * - Браузеры разрешают автозапуск только БЕЗ звука → ставим muted.
 * - `start` применяется только при первом запуске: дальше видео продолжает
 *   с того места, где его поставили на паузу.
 *
 * @param {HTMLVideoElement} video
 * @param {number} [start] С какой секунды начинать (пропустить заставку).
 * @returns {Promise<boolean>} true — заиграло.
 */
export function playVideo(video, start = 0) {
  if (!video) return Promise.resolve(false)
  if (!video.dataset.started && start > 0) {
    try {
      video.currentTime = start
    } catch {
      // Метаданные ещё не загружены — начнём с начала, не страшно.
    }
  }
  video.dataset.started = 'true'
  video.muted = true

  const result = video.play?.()

  return Promise.resolve(result)
    .then(() => true)
    .catch(() => false)
}

/** Поставить видео на паузу (ничего не делает, если видео нет). */
export function pauseVideo(video) {
  video?.pause?.()
}

/**
 * Крутить только отрезок ролика [start, end).
 *
 * У роликов NASA бывают титры в начале и ведущий в конце. Слушаем
 * `timeupdate` (браузер шлёт его несколько раз в секунду во время
 * воспроизведения): дошли до end — перематываем на start.
 *
 * @param {HTMLVideoElement} video
 * @param {number} start
 * @param {number} [end] Без него ничего не делаем (весь ролик крутится атрибутом loop).
 * @returns {() => void} Отключение.
 */
export function loopSegment(video, start, end) {
  if (!video || !(end > start)) return () => {}

  const onTime = () => {
    if (video.currentTime >= end || video.currentTime < start - 0.5) video.currentTime = start
  }

  video.addEventListener('timeupdate', onTime)
  return () => video.removeEventListener('timeupdate', onTime)
}
