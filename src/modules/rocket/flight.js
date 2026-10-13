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
import { clamp, invLerp, lerp, rad, smoothstep, wrap } from '../../core/math.js'

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
 * Сценарий полёта (ракета справа, текст слева). Нос: roll 0 — вверх, 90 — влево,
 * 180 — вниз, 270 — вправо, 360 — снова вверх (крен всё время растёт: один
 * непрерывный разворот против часовой стрелки, без «раскручивания назад»).
 *
 * 1. `hero` — стоит на площадке;
 * 2. `manifesto` → `turn` → `flip` — чуть взлетает, плавная дуга влево через верх
 *    и разворот: к началу истории ракета уже носом вниз;
 * 3. `story` → `apogee` — летит носом вниз, пока идёт закреплённая история;
 * 4. `orbit` → `bank` → `dive` → `exit` — в секции «Нарисуй путь» доворачивает нос
 *    вправо и уходит за правый край ДО того, как снизу наедут слайдеры;
 * 5. слайдеры, вода и архив непрозрачны — ракеты не видно (и она не рисуется);
 * 6. `return` → `glide` — после архива вылетает справа носом влево («окно в небо»
 *    перед подвалом, секция .approach);
 * 7. `mission` → `final` — нос поворачивается вниз, немного пролетает;
 * 8. `landing` — разворот носом вверх и посадка на площадку.
 *
 * Где каждая точка «срабатывает» — атрибуты data-flight / data-flight-start в index.html.
 * @type {Record<string, FlightState>}
 */
export const WAYPOINTS = {
  hero: { x: 0.46, y: -0.05, scale: 0.85, roll: 0, yaw: 24, thrust: 0.14, ground: 0 },
  manifesto: { x: 0.56, y: 0.2, scale: 0.8, roll: 4, yaw: 22, thrust: 0.9, ground: 1 },
  // Дуга держится правее текста манифеста (он занимает левые ~62% экрана).
  turn: { x: 0.64, y: 0.46, scale: 0.7, roll: 75, yaw: 22, thrust: 1, ground: 1 },
  flip: { x: 0.56, y: 0.44, scale: 0.72, roll: 140, yaw: 22, thrust: 0.9, ground: 1 },
  story: { x: 0.56, y: 0.3, scale: 0.85, roll: 180, yaw: 22, thrust: 0.8, ground: 1 },
  apogee: { x: 0.6, y: 0.22, scale: 0.75, roll: 180, yaw: 22, thrust: 0.6, ground: 1 },
  // В «Орбите» по центру — схема орбиты: ракета идёт вдоль правого края, не закрывая её.
  orbit: { x: 0.87, y: 0.3, scale: 0.5, roll: 184, yaw: 22, thrust: 0.7, ground: 1 },
  bank: { x: 0.87, y: 0.0, scale: 0.5, roll: 215, yaw: 22, thrust: 0.9, ground: 1 },
  dive: { x: 0.9, y: -0.3, scale: 0.52, roll: 262, yaw: 22, thrust: 1, ground: 1 },
  exit: { x: 1.9, y: -0.34, scale: 0.6, roll: 270, yaw: 22, thrust: 1, ground: 1 },
  return: { x: 1.9, y: -0.3, scale: 0.6, roll: 450, yaw: 22, thrust: 1, ground: 1 },
  glide: { x: 0.66, y: -0.08, scale: 0.68, roll: 452, yaw: 22, thrust: 0.8, ground: 1 },
  mission: { x: 0.52, y: 0.3, scale: 0.75, roll: 540, yaw: 22, thrust: 0.6, ground: 1 },
  final: { x: 0.54, y: 0.14, scale: 0.8, roll: 540, yaw: 22, thrust: 0.5, ground: 1 },
  landing: { x: 0.55, y: -0.05, scale: 0.85, roll: 720, yaw: 24, thrust: 0.04, ground: 0 },
}

/**
 * Тот же сценарий для портретного экрана (телефон). Текст там занимает почти
 * всю ширину, поэтому ракета меньше и держится в свободных зонах: на старте —
 * внизу справа на площадке, в полёте — у правого края над/под текстом, садится
 * снова внизу. Манёвры те же, что на широком экране.
 * @type {Record<string, FlightState>}
 */
export const WAYPOINTS_PORTRAIT = {
  hero: { x: 0.5, y: -0.98, scale: 0.62, roll: 0, yaw: 24, thrust: 0.14, ground: 0 },
  manifesto: { x: 0.6, y: -0.6, scale: 0.5, roll: 4, yaw: 22, thrust: 0.9, ground: 1 },
  turn: { x: 0.55, y: -0.25, scale: 0.45, roll: 75, yaw: 22, thrust: 1, ground: 1 },
  flip: { x: 0.4, y: -0.2, scale: 0.45, roll: 140, yaw: 22, thrust: 0.9, ground: 1 },
  story: { x: 0.45, y: 0.3, scale: 0.7, roll: 180, yaw: 22, thrust: 0.8, ground: 1 },
  apogee: { x: 0.55, y: 0.5, scale: 0.55, roll: 180, yaw: 22, thrust: 0.6, ground: 1 },
  orbit: { x: 0.65, y: -0.5, scale: 0.42, roll: 188, yaw: 22, thrust: 0.7, ground: 1 },
  bank: { x: 0.62, y: -0.66, scale: 0.42, roll: 222, yaw: 22, thrust: 0.9, ground: 1 },
  dive: { x: 0.7, y: -0.8, scale: 0.42, roll: 262, yaw: 22, thrust: 1, ground: 1 },
  exit: { x: 1.9, y: -0.82, scale: 0.5, roll: 270, yaw: 22, thrust: 1, ground: 1 },
  return: { x: 1.9, y: -0.5, scale: 0.5, roll: 450, yaw: 22, thrust: 1, ground: 1 },
  glide: { x: 0.65, y: -0.2, scale: 0.5, roll: 452, yaw: 22, thrust: 0.8, ground: 1 },
  mission: { x: 0.5, y: 0.25, scale: 0.5, roll: 540, yaw: 22, thrust: 0.6, ground: 1 },
  final: { x: 0.55, y: 0.05, scale: 0.55, roll: 540, yaw: 22, thrust: 0.5, ground: 1 },
  landing: { x: 0.55, y: -0.98, scale: 0.62, roll: 720, yaw: 24, thrust: 0.04, ground: 0 },
}

/** Портретный экран (телефон в вертикальном положении). */
export const isPortrait = (aspect) => aspect < 0.8

/** Таблица точек под форму экрана. */
export const waypointsFor = (aspect) => (isPortrait(aspect) ? WAYPOINTS_PORTRAIT : WAYPOINTS)

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

// ─── Запуск по кнопке «Пуск» ─────────────────────────────────────────────────
// После отсчёта страница сама едет наверх, а ракета проходит ТОТ ЖЕ путь в
// обратную сторону. Положение остаётся от сценария (sampleFlight по прокрутке) —
// меняется только нос: ракета летит носом вверх, а не «пятится» хвостом вперёд.

/** Настройки обратного полёта. */
export const LAUNCH = {
  /** Наклон в сторону движения на боковых участках, градусы (0 — строго вертикально). */
  lean: 32,
  /** Тяга, не ниже которой держим факел на обратном пути. */
  thrust: 1.2,
}

/** Кратчайшая разница углов b − a, в диапазоне −180…180. */
export const angleDelta = (a, b) => wrap(b - a, -180, 180)

/**
 * Крен «носом вверх» для обратного пути.
 *
 * Берём, куда нос смотрит по сценарию, и разворачиваем горизонталь: там, где
 * вперёд ракета улетала носом вправо, обратно она возвращается с наклоном влево.
 * По вертикали нос всегда вверх. Результат — небольшой наклон ±lean вокруг нуля.
 * @param {number} roll Крен по сценарию, градусы.
 * @param {number} [lean]
 */
export const noseUpRoll = (roll, lean = LAUNCH.lean) => -Math.sin(rad(roll)) * lean

/**
 * Состояние на обратном пути: позиция из сценария, нос — вверх.
 * @param {FlightState} scripted Состояние по сценарию для текущей прокрутки.
 * @param {number} mix 1 — полностью «обратный полёт», 0 — обычный сценарий
 *   (между ними — плавная передача управления).
 * @param {typeof LAUNCH} [o]
 * @returns {FlightState}
 */
export function returnState(scripted, mix, o = LAUNCH) {
  const k = clamp(mix, 0, 1)

  return {
    ...scripted,
    // Идём к цели кратчайшей дугой — без лишнего оборота (720° и 0° — одно и то же).
    roll: scripted.roll + angleDelta(scripted.roll, noseUpRoll(scripted.roll, o.lean)) * k,
    thrust: lerp(scripted.thrust, Math.max(scripted.thrust, o.thrust), k),
  }
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
  // На узких экранах ракета меньше. Где ей быть на телефоне — решает отдельная
  // таблица WAYPOINTS_PORTRAIT (waypointsFor), здесь только масштаб и край.
  const portrait = isPortrait(aspect)
  const fit = clamp(aspect / 1.2, portrait ? 0.34 : 0.42, 1)

  // Горизонталь НЕ прижимаем к краю. Раньше x до 1 зажимался в 0.9, а после 1 — нет:
  // на уходе за экран ракета перескакивала с 0.9 сразу на 1.0 (заметный рывок).
  // Чтобы ракета не вылезала на узком экране — задайте x в таблице точек.
  const x = state.x

  return {
    x: x * halfWidth,
    y: state.y * 0.8 * halfHeight,
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
