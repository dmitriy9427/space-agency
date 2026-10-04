/**
 * Логика стопки карточек — без DOM (тесты — state.test.js).
 *
 * createStack(n)       — порядок карточек: order[0] сверху. next() кладёт
 *                        верхнюю под низ, prev() достаёт нижнюю наверх.
 * stackPose(depth, n)  — поза карточки на глубине depth: чуть ниже, чуть
 *                        меньше, лёгкий поворот «вразнобой» (чётные в одну
 *                        сторону, нечётные в другую), глубже 3-й — прозрачная.
 * swipeDecision(dx, vx, width) — смахнуть или вернуть: да, если утащили
 *                        дальше 35% ширины ИЛИ бросили быстрее 800 px/с.
 * createVelocityTracker() — скорость жеста по точкам за последние 100 мс
 *                        (берём не последнюю пару точек — она «шумная»).
 * @module sliders/stack/state
 */

/** Сколько карточек видно под верхней (остальные спрятаны за ними). */
export const VISIBLE_DEPTH = 3

/**
 * Порядок карточек в стопке: `order[0]` — верхняя.
 * @param {number} count
 */
export function createStack(count) {
  const order = Array.from({ length: count }, (_, i) => i)

  return {
    get order() {
      return order.slice()
    },
    get top() {
      return order[0]
    },
    /** Глубина карточки: 0 — сверху. */
    depthOf(card) {
      return order.indexOf(card)
    },
    /** Верхнюю — под низ (смахнули). Возвращает смахнутую. */
    next() {
      const card = order.shift()

      order.push(card)
      return card
    },
    /** Нижнюю — наверх (вернули). Возвращает её. */
    prev() {
      const card = order.pop()

      order.unshift(card)
      return card
    },
  }
}

/** Поза карточки на глубине `depth`. */
export function stackPose(depth, count) {
  const visible = Math.min(depth, VISIBLE_DEPTH)

  return {
    y: visible * 16,
    scale: 1 - visible * 0.055,
    rotation: depth === 0 ? 0 : (depth % 2 ? -1 : 1) * visible * 1.6,
    autoAlpha: depth > VISIBLE_DEPTH ? 0 : 1,
    zIndex: count - depth,
  }
}

/**
 * Смахнуть или вернуть на место.
 * @param {number} dx Сдвиг, px.
 * @param {number} vx Скорость, px/с.
 * @param {number} width Ширина карточки.
 * @returns {-1 | 0 | 1} Направление полёта или 0 — вернуть.
 */
export function swipeDecision(dx, vx, width) {
  if (Math.abs(dx) > width * 0.35) return dx > 0 ? 1 : -1
  if (Math.abs(vx) > 800 && Math.sign(vx) === Math.sign(dx || vx)) return vx > 0 ? 1 : -1
  return 0
}

/**
 * Скорость по последним точкам жеста (px/с). Хранит окно в 100 мс.
 */
export function createVelocityTracker(windowMs = 100) {
  let points = []

  return {
    reset() {
      points = []
    },
    push(x, time) {
      points.push({ x, time })
      while (points.length > 2 && time - points[0].time > windowMs) points.shift()
    },
    get velocity() {
      if (points.length < 2) return 0

      const a = points[0]
      const b = points[points.length - 1]
      const dt = (b.time - a.time) / 1000

      return dt > 0 ? (b.x - a.x) / dt : 0
    },
  }
}

/**
 * История ушедших карточек: кто и в какую сторону улетел (последний — сверху).
 * Нужна, чтобы кнопки ←/→ могли «вернуть» карточку с той стороны, куда
 * она ушла, и решить, вернуть или бросить следующую.
 *
 * @param {number} limit Сколько помнить: больше «число карточек − 1» вернуть
 *   нельзя — сверху должна оставаться хоть одна карточка.
 */
export function createExitHistory(limit) {
  const items = []

  return {
    /** Карточка `card` ушла в сторону `side` (1 — вправо, −1 — влево). */
    push(card, side) {
      items.push({ card, side })
      while (items.length > limit) items.shift()
    },
    /** Последняя ушедшая (или undefined). */
    peek() {
      return items[items.length - 1]
    },
    pop() {
      return items.pop()
    },
    get size() {
      return items.length
    },
  }
}

/**
 * Что сделать по нажатию стрелки в сторону `direction` (1 → вправо, −1 ← влево).
 *
 * Правило «карточка движется по направлению стрелки»:
 *   - последняя ушедшая карточка улетела в ПРОТИВОПОЛОЖНУЮ сторону
 *     (ушла вправо, а жмём ←) — значит, движение влево вернёт её обратно:
 *     'return';
 *   - иначе (ушла в ту же сторону или истории нет) — верхняя карточка
 *     улетает по направлению стрелки: 'throw'.
 *
 * @param {number} direction 1 | −1
 * @param {{ side: number } | undefined} last Последняя ушедшая.
 * @returns {'return' | 'throw'}
 */
export const pressAction = (direction, last) => (last && last.side === -direction ? 'return' : 'throw')
