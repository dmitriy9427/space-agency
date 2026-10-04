/**
 * Счётчик кадров для проверки «не лагает ли». Включается добавлением
 * `?debug` к адресу страницы: в левом нижнем углу появляется строка
 * «120 fps · worst 9 ms · ракета 42 draw calls».
 *
 *   fps   — средняя частота кадров за последние 30 кадров
 *           (60 или 120 — отлично, ниже 50 — повод разбираться);
 *   worst — самый долгий кадр в этом окне, мс. Это важнее среднего:
 *           один кадр в 100 мс заметен глазом как «рывок», даже если
 *           средний FPS высокий;
 *   draw calls — сколько раз за кадр ракета обращается к видеокарте.
 *
 * Внимание: в фоновой вкладке или скрытой панели браузер ограничивает
 * кадры (иногда до 1 в секунду) — замеры там бессмысленны.
 * @module core/fps
 */

/**
 * Скользящее среднее FPS по окну из `size` кадров (чистая логика, без DOM).
 * @param {number} [size]
 */
export function createFpsMeter(size = 30) {
  const samples = []

  return {
    /** Записать длительность кадра (мс). Возвращает текущий средний FPS. */
    push(frameMs) {
      if (frameMs > 0) samples.push(frameMs)
      if (samples.length > size) samples.shift()
      return this.fps
    },
    get fps() {
      if (!samples.length) return 0
      const avg = samples.reduce((sum, ms) => sum + ms, 0) / samples.length

      return Math.round(1000 / avg)
    },
    /** Самый долгий кадр в окне, мс. */
    get worst() {
      return samples.length ? Math.max(...samples) : 0
    },
  }
}

/** Есть ли `?debug` в адресе страницы. */
export const isDebug = (search = window.location.search) => new URLSearchParams(search).has('debug')

/**
 * Показать оверлей FPS.
 * @param {{ ticker: { add(fn: Function): void, remove(fn: Function): void } }} gsap
 * @param {() => string} [extra] Дополнительная строка (например, draw calls ракеты).
 * @returns {() => void} Убрать оверлей.
 */
export function mountFpsOverlay(gsap, extra = () => '') {
  const meter = createFpsMeter()
  const el = document.createElement('div')

  el.className = 'fps'
  document.body.appendChild(el)

  let last = performance.now()
  let frame = 0
  const tick = () => {
    const now = performance.now()

    meter.push(now - last)
    last = now
    // Текст обновляем раз в 10 кадров — сам счётчик не должен нагружать страницу.
    if (++frame % 10 === 0) {
      el.textContent = `${meter.fps} fps · worst ${meter.worst.toFixed(0)} ms ${extra()}`
    }
  }

  gsap.ticker.add(tick)

  return () => {
    gsap.ticker.remove(tick)
    el.remove()
  }
}
