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
 * @property {number} [lift] Высота ракеты НАД площадкой (в тех же долях, что y). Нужна
 *   только при запуске по кнопке: ракета поднимается, а площадка остаётся на земле.
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

/**
 * Тот же сценарий для портретного экрана (телефон). Текст там занимает почти
 * всю ширину, поэтому ракета меньше и держится в свободных зонах: на старте —
 * внизу справа на площадке, в полёте — у правого края над/под текстом, садится
 * снова внизу. Подобрано по скриншотам 390×844.
 * @type {Record<string, FlightState>}
 */
export const WAYPOINTS_PORTRAIT = {
  hero: { x: 0.5, y: -0.98, scale: 0.62, roll: 0, yaw: 24, thrust: 0.14, ground: 0 },
  manifesto: { x: 0.75, y: -0.2, scale: 0.45, roll: -3, yaw: 22, thrust: 0.9, ground: 1 },
  story: { x: 0.45, y: 0.3, scale: 0.7, roll: -3, yaw: 22, thrust: 1, ground: 1 },
  apogee: { x: 0.55, y: 0.6, scale: 0.55, roll: 0, yaw: 22, thrust: 0.5, ground: 1 },
  orbit: { x: 0.7, y: -0.55, scale: 0.42, roll: 180, yaw: 22, thrust: 0.7, ground: 1 },
  dive: { x: 0.75, y: -0.8, scale: 0.42, roll: 185, yaw: 22, thrust: 0.9, ground: 1 },
  exit: { x: 1.9, y: -0.9, scale: 0.5, roll: 200, yaw: 22, thrust: 1, ground: 1 },
  return: { x: 1.9, y: 0.5, scale: 0.55, roll: 160, yaw: 22, thrust: 0.6, ground: 1 },
  mission: { x: 0.6, y: 0.75, scale: 0.5, roll: 180, yaw: 22, thrust: 0.5, ground: 1 },
  landing: { x: 0.55, y: -0.98, scale: 0.62, roll: 360, yaw: 24, thrust: 0.04, ground: 0 },
}

/** Портретный экран (телефон в вертикальном положении). */
export const isPortrait = (aspect) => aspect < 0.8

/** Таблица точек под форму экрана. */
export const waypointsFor = (aspect) => (isPortrait(aspect) ? WAYPOINTS_PORTRAIT : WAYPOINTS)

const KEYS = ['x', 'y', 'scale', 'roll', 'yaw', 'thrust', 'ground', 'lift']

/** Интерполяция всех полей состояния (поле, которого нет в точке, считается нулём). */
export function mixState(a, b, t) {
  const out = {}

  for (const key of KEYS) out[key] = lerp(a[key] ?? 0, b[key] ?? 0, t)
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
// Обычно ракетой управляет прокрутка. Запуск — исключение: на несколько секунд
// сценарий задают функции ниже (время → состояние), а не позиция страницы.
//
//   1. ascent  — старт с площадки и уход за верх экрана;
//   2. страница плавно едет наверх, ракета за кадром (держим последнее состояние);
//   3. descent — ракета спускается сверху и садится на площадку первого экрана.
//
// Всё, что определяет ХАРАКТЕР траектории, собрано в LAUNCH — крутите цифры здесь.

/** Настройки траектории запуска. */
export const LAUNCH = {
  /** Длительность взлёта, с. */
  ascent: 2.4,
  /** Длительность посадки, с. */
  descent: 2.8,
  /** Высота «за кадром» (y): ракета целиком над экраном. */
  exitY: 2.7,
  /** Разгон на взлёте: 1 — равномерно, больше — дольше «висит» над площадкой и резче уходит. */
  liftoffPower: 2.6,
  /** Гравитационный разворот: наклон носа на взлёте, градусы (плюс — влево, к тексту). */
  tilt: 9,
  /** Снос по горизонтали на взлёте (доля полуширины экрана, минус — влево). */
  drift: -0.16,
  /** Насколько ракета «уменьшается», уходя вверх (0 — не меняется). */
  shrink: 0.18,
  /** С какой стороны заходит на посадку (доля полуширины, плюс — справа). */
  approach: 0.14,
  /** Наклон на заходе, градусы: ракета выравнивается к моменту касания. */
  approachTilt: -7,
  /** Торможение на посадке: больше — раньше гасит скорость и дольше «подкрадывается». */
  brakingPower: 3.2,
  /** Тяга на взлёте и на тормозном импульсе. */
  thrust: 1.5,
}

/**
 * Взлёт: состояние ракеты в момент t (0 — стоит, 1 — за верхом экрана).
 *
 * Высота растёт как t^liftoffPower: тяжёлая ракета сначала еле отрывается, потом
 * разгоняется. Наклон и снос начинаются не сразу — первые ~15% ракета идёт строго
 * вверх (как настоящая: сначала уйти от башни, потом разворот).
 * @param {FlightState} from Состояние в момент старта.
 * @param {number} t 0…1
 * @param {typeof LAUNCH} [o]
 * @returns {FlightState}
 */
export function ascentState(from, t, o = LAUNCH) {
  const p = clamp(t, 0, 1)
  const rise = Math.pow(p, o.liftoffPower)
  const turn = smoothstep(0.15, 1, p)
  const y = lerp(from.y, o.exitY, rise)

  return {
    x: from.x + o.drift * turn * rise,
    y,
    scale: from.scale * (1 - o.shrink * rise),
    roll: from.roll + o.tilt * turn,
    yaw: from.yaw,
    // Тяга выходит на максимум за первую десятую — «зажигание».
    thrust: lerp(from.thrust, o.thrust, smoothstep(0, 0.1, p)),
    // Площадка стоит на месте, пока ракета не ушла высоко; потом «земля уходит вниз».
    ground: smoothstep(0.5, 0.85, p),
    lift: y - from.y,
  }
}

/**
 * Посадка: состояние в момент t (0 — за верхом экрана, 1 — стоит на площадке).
 *
 * Высота убывает как (1−t)^brakingPower: быстро входит в кадр и всё медленнее
 * подходит к площадке — как ступень с реактивной посадкой. Тяга: тормозной
 * импульс почти до конца, у самой площадки спадает до дежурной.
 * @param {FlightState} to Состояние на площадке (точка `hero`).
 * @param {number} t 0…1
 * @param {typeof LAUNCH} [o]
 * @returns {FlightState}
 */
export function descentState(to, t, o = LAUNCH) {
  const p = clamp(t, 0, 1)
  const left = Math.pow(1 - p, o.brakingPower) // сколько пути осталось, 1 → 0
  const y = lerp(to.y, o.exitY, left)

  return {
    x: to.x + o.approach * left,
    y,
    scale: to.scale * (1 - o.shrink * left),
    roll: to.roll + o.approachTilt * left,
    yaw: to.yaw,
    thrust: lerp(o.thrust, to.thrust, smoothstep(0.8, 1, p)),
    // Площадка поднимается на место в начале захода — ракета садится уже на неё.
    ground: 1 - smoothstep(0, 0.3, p),
    lift: y - to.y,
  }
}

/**
 * Перевести состояние полёта в мировые координаты сцены.
 *
 * @param {FlightState} state
 * @param {number} aspect Ширина / высота экрана.
 * @param {number} halfHeight Полувысота видимой области на плоскости ракеты.
 * @returns {{ x: number, y: number, scale: number, lift: number }} lift — на сколько ракета
 *   выше площадки (мировые единицы).
 */
export function toWorld(state, aspect, halfHeight) {
  const halfWidth = halfHeight * aspect
  // На узких экранах ракета меньше. Где ей быть на телефоне — решает отдельная
  // таблица WAYPOINTS_PORTRAIT (waypointsFor), здесь только масштаб и край.
  const portrait = isPortrait(aspect)
  const fit = clamp(aspect / 1.2, portrait ? 0.34 : 0.42, 1)
  const maxX = portrait ? 0.75 : 0.9
  const shiftY = 0

  // |x| > 1 — ракета намеренно за краем экрана: не прижимаем.
  const x = Math.abs(state.x) > 1 ? state.x : clamp(state.x, -maxX, maxX)

  return {
    x: x * halfWidth,
    y: (state.y * 0.8 + shiftY) * halfHeight,
    scale: state.scale * fit,
    lift: (state.lift ?? 0) * 0.8 * halfHeight,
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
