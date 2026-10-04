/**
 * Жизненный цикл модулей: уборка за собой и «секция на экране?».
 *
 * Два инструмента, которыми пользуется почти каждый модуль:
 *   createDisposer() — копилка «как убрать за собой»;
 *   onViewport()     — сообщить, когда элемент появился на экране / ушёл.
 * Подробнее о том, зачем убирать за собой, — docs/02-concepts.md, раздел 2.12.
 * @module core/lifecycle
 */

/**
 * Копилка функций уборки.
 *
 * Каждый раз, когда модуль что-то «включает» (обработчик события, подписку
 * на тикер, ScrollTrigger, WebGL-сцену), он сразу же кладёт сюда функцию,
 * которая это «выключит». В destroy() модуля достаточно вызвать dispose() —
 * и всё снимется, ничего не забудется.
 *
 *   const d = createDisposer()
 *   d.listen(window, 'resize', onResize)       // повесить + запомнить, как снять
 *   gsap.ticker.add(tick)
 *   d.add(() => gsap.ticker.remove(tick))     // запомнить любую уборку
 *   return { destroy: () => d.dispose() }
 *
 * Уборка выполняется в ОБРАТНОМ порядке (последнее включённое выключается
 * первым) — как закрытие вложенных скобок; так безопаснее, если поздние
 * вещи зависят от ранних.
 */
export function createDisposer() {
  const tasks = []
  let disposed = false

  return {
    /**
     * Добавить функцию уборки. Возвращает её же (удобно: `const stop = d.add(…)`).
     * Если уборка уже прошла (модуль уничтожили, пока он что-то грузил), функция
     * выполняется сразу — иначе то, что включилось после destroy, осталось бы висеть.
     */
    add(fn) {
      if (typeof fn !== 'function') return fn
      if (disposed) fn()
      else tasks.push(fn)
      return fn
    },
    /** addEventListener + запомнить removeEventListener с теми же аргументами. */
    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options)
      return this.add(() => target.removeEventListener(type, handler, options))
    },
    /** Выполнить всю уборку (в обратном порядке). Повторный вызов ничего не делает. */
    dispose() {
      if (disposed) return
      disposed = true
      while (tasks.length) {
        try {
          tasks.pop()()
        } catch (error) {
          // Ошибка одной уборки не должна оставить остальные невыполненными.
          console.error('dispose', error)
        }
      }
    },
    get disposed() {
      return disposed
    },
  }
}

/**
 * Позвать `enter`, когда элемент появляется на экране, и `leave`, когда уходит.
 *
 * Основа экономии: WebGL-циклы, галерея, ленты «спят», пока их не видно.
 * Под капотом — IntersectionObserver: браузер сам следит за положением
 * элемента и сообщает об изменениях (это дешевле, чем проверять на каждом
 * скролле).
 *
 * @param {Element} el Элемент, за которым следим.
 * @param {{ enter?: () => void, leave?: () => void, rootMargin?: string }} handlers
 *   `rootMargin` — «расширить экран» для проверки: '200px' означает «считать
 *   видимым уже за 200 px до появления» — сцена успеет подготовиться.
 * @returns {() => void} Функция отключения.
 */
export function onViewport(el, { enter, leave, rootMargin = '0px' } = {}) {
  // Очень старый браузер или тестовая среда без IntersectionObserver —
  // считаем элемент видимым всегда (лучше лишняя работа, чем пустой экран).
  if (typeof IntersectionObserver === 'undefined') {
    enter?.()
    return () => {}
  }

  let inside = null // null — ещё не знаем; дальше true/false
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1]

      // Зовём обработчики только при СМЕНЕ состояния, а не на каждое сообщение.
      if (entry.isIntersecting === inside) return
      inside = entry.isIntersecting
      if (inside) enter?.()
      else leave?.()
    },
    { rootMargin },
  )

  observer.observe(el)
  return () => observer.disconnect()
}
