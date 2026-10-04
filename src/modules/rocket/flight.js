/**
 * Траектория ракеты по скроллу — чистая логика без three и DOM.
 *
 * Секции страницы помечены `data-flight="id"`. Для каждой в таблице
 * `WAYPOINTS` задано, где должна быть ракета, когда секция доезжает до
 * «опорной линии» экрана. Между двумя соседними путевыми точками состояние
 * интерполируется сглаженной ступенькой — полёт получается плавным и
 * управляется только позицией прокрутки.
 * @module rocket/flight
 */
import { clamp, invLerp, lerp, rad, smoothstep } from '../../core/math.js'

/**
 * @typedef {object} FlightState
 * @property {number} x Горизонталь, доля полуширины экрана (−1 слева … 1 справа;
 *   |x| > 1 — за краем экрана).
 * @property {number} y Вертикаль, доля полувысоты (−1 низ … 1 верх).
 * @property {number} scale Масштаб ракеты.
 * @property {number} roll Крен вокруг оси взгляда, градусы: 0 — носом вверх, 180 — носом
 *   вниз (огонь сверху), 360 — снова носом вверх (разворот продолжается в ту же сторону).
 * @property {number} yaw Поворот вокруг вертикальной оси, градусы.
 * @property {number} thrust Тяга 0…1: длина и яркость факела.
 * @property {number} ground Уход стартовой площадки: 0 — стоим на ней, 1 — её нет.
 */

/**
 * Сценарий полёта (ракета всё время справа, текст слева):
 *
 * 1. `hero` — стоит на площадке;
 * 2. `manifesto` → `story` → `apogee` — взлёт и набор высоты;
 * 3. `orbit` — разворот на 180°: огонь сверху, нос вниз, ракета идёт вниз;
 * 4. `dive` → `exit` — спускаясь, уходит за правый край перед слайдерами;
 * 5. слайдеры, вода и архив непрозрачны — ракеты не видно (и она не рисуется);
 * 6. `return` → `mission` — возвращается справа, всё ещё носом вниз;
 * 7. `landing` — разворачивается (180° → 360°, в ту же сторону) и садится
 *    на станцию, площадка поднимается навстречу.
 * @type {Record<string, FlightState>}
 */
export const WAYPOINTS = {
  hero: { x: 0.46, y: -0.05, scale: 0.85, roll: 0, yaw: 24, thrust: 0.14, ground: 0 },
  manifesto: { x: 0.62, y: 0.3, scale: 0.8, roll: -3, yaw: 22, thrust: 0.9, ground: 1 },
  story: { x: 0.56, y: 0.4, scale: 0.9, roll: -3, yaw: 22, thrust: 1, ground: 1 },
  apogee: { x: 0.6, y: 0.5, scale: 0.75, roll: 0, yaw: 22, thrust: 0.5, ground: 1 },
  orbit: { x: 0.85, y: 0.2, scale: 0.48, roll: 180, yaw: 22, thrust: 0.7, ground: 1 },
  dive: { x: 0.88, y: -0.25, scale: 0.5, roll: 185, yaw: 22, thrust: 0.9, ground: 1 },
  exit: { x: 1.9, y: -0.45, scale: 0.6, roll: 200, yaw: 22, thrust: 1, ground: 1 },
  return: { x: 1.9, y: 0.5, scale: 0.75, roll: 160, yaw: 22, thrust: 0.6, ground: 1 },
  mission: { x: 0.55, y: 0.3, scale: 0.8, roll: 180, yaw: 22, thrust: 0.5, ground: 1 },
  landing: { x: 0.55, y: -0.05, scale: 0.85, roll: 360, yaw: 24, thrust: 0.04, ground: 0 },
}

const KEYS = ['x', 'y', 'scale', 'roll', 'yaw', 'thrust', 'ground']

/** Интерполяция всех полей состояния. */
export function mixState(a, b, t) {
  const out = {}

  for (const key of KEYS) out[key] = lerp(a[key], b[key], t)
  return out
}

/**
 * Собрать таймлайн полёта из измеренных секций.
 *
 * @param {{ id: string, at: number }[]} markers `at` — позиция прокрутки (px), на которой
 *   секция достигает опорной линии.
 * @param {Record<string, FlightState>} [waypoints]
 * @param {number} [maxScroll] Предел прокрутки: точка в самом низу страницы (посадка)
 *   может «стартовать» ниже, чем страница вообще прокручивается.
 * @returns {{ at: number, state: FlightState }[]} Отсортирован по `at`, `at` строго возрастает.
 */
export function buildFlightTimeline(markers, waypoints = WAYPOINTS, maxScroll = Infinity) {
  // Секция у самого верха даёт отрицательный start — прокрутка туда не доходит;
  // у самого низа — больше предела прокрутки. Прижимаем к [0, maxScroll].
  const known = markers
    .filter((marker) => waypoints[marker.id] && Number.isFinite(marker.at))
    .map((marker) => ({ id: marker.id, at: clamp(marker.at, 0, maxScroll) }))
    .sort((a, b) => a.at - b.at)

  return known.map((marker, index) => {
    // Две секции на одной позиции дали бы деление на ноль: сдвигаем на пиксель.
    const prev = index > 0 ? known[index - 1].at : -Infinity
    const at = marker.at <= prev ? prev + 1 : marker.at

    marker.at = at
    return { at, state: waypoints[marker.id] }
  })
}

/**
 * Состояние ракеты при данной прокрутке.
 * До первой точки — состояние первой, после последней — последней.
 * Пустой таймлайн даёт стартовое состояние (`hero`).
 */
export function sampleFlight(timeline, scroll) {
  if (!timeline.length) return { ...WAYPOINTS.hero }

  if (scroll <= timeline[0].at) return { ...timeline[0].state }

  const last = timeline[timeline.length - 1]

  if (scroll >= last.at) return { ...last.state }

  const next = timeline.findIndex((point) => point.at > scroll)
  const from = timeline[next - 1]
  const to = timeline[next]
  const t = smoothstep(0, 1, invLerp(from.at, to.at, scroll))

  return mixState(from.state, to.state, t)
}

/**
 * Перевести состояние полёта в мировые координаты сцены.
 *
 * @param {FlightState} state
 * @param {number} aspect Ширина / высота экрана.
 * @param {number} halfHeight Полувысота видимой области на плоскости ракеты.
 * @returns {{ x: number, y: number, scale: number }}
 */
export function toWorld(state, aspect, halfHeight) {
  const halfWidth = halfHeight * aspect
  // На узких экранах ракета меньше и жмётся к краю, чтобы не закрывать текст.
  // МОБИЛКА: черновая подстройка под портретный экран (меньше масштаб, ниже по
  // экрану). Для мобильной версии, скорее всего, нужна своя таблица WAYPOINTS.
  const portrait = aspect < 0.8
  const fit = clamp(aspect / 1.2, portrait ? 0.34 : 0.42, 1)
  const maxX = portrait ? 0.6 : 0.9
  // В портретной ориентации текст занимает почти всю ширину: ракета ниже.
  const shiftY = portrait ? -0.4 : 0

  // |x| > 1 — ракета намеренно за краем экрана: не прижимаем.
  const x = Math.abs(state.x) > 1 ? state.x : clamp(state.x, -maxX, maxX)

  return {
    x: x * halfWidth,
    y: (state.y * 0.8 + shiftY) * halfHeight,
    scale: state.scale * fit,
  }
}

/**
 * Куда смотрит нос: 1 — вверх, −1 — вниз, 0 — вбок. От этого зависит, в
 * какую сторону бегут звёзды: при спуске носом вниз они едут вверх.
 * @param {number} roll Градусы.
 */
export const heading = (roll) => Math.cos(rad(roll))

/**
 * Тяга с учётом скорости прокрутки: чем резче крутим колесо, тем ярче факел.
 * @param {number} base Базовая тяга секции 0…1.
 * @param {number} velocity Скорость прокрутки, px/с.
 */
export function thrustWithVelocity(base, velocity) {
  return clamp(base + clamp(Math.abs(velocity) / 4000, 0, 0.5), 0, 1.5)
}

/**
 * Закрыт ли экран целиком непрозрачными секциями (их объединением —
 * например, на стыке двух секций). Тогда ракету можно не рисовать.
 * @param {{ top: number, bottom: number }[]} rects Прямоугольники секций относительно окна.
 * @param {number} viewportHeight
 * @param {number} [tolerance] Допуск в px на дробные позиции.
 */
export function coversViewport(rects, viewportHeight, tolerance = 1) {
  let reached = 0

  for (const rect of [...rects].sort((a, b) => a.top - b.top)) {
    if (rect.top > reached + tolerance) break
    reached = Math.max(reached, rect.bottom)
    if (reached >= viewportHeight - tolerance) return true
  }
  return false
}
