/**
 * Геометрия 3D-кольца — чистые функции (тесты — math.test.js).
 *
 * ringStep(8)          → 45     угол между карточками (360° / число карточек)
 * ringRadius(280, 8)   → ~372   радиус, при котором карточки шириной 280 px
 *                               стоят вплотную с зазором (хорда правильного
 *                               многоугольника: 2·R·tan(π/n) = ширина + зазор)
 * snapRotation(50, 8)  → 45     ближайший «правильный» угол (для доводки)
 * activeIndex(-45, 8)  → 1      какая карточка сейчас спереди
 * rotationFor(5, 1000, 8)       угол, при котором карточка 5 спереди, ближайший
 *                               к текущему (чтобы не крутить лишний полный круг)
 * facing(90)           → 0.5    насколько карточка смотрит на зрителя (1…0) —
 *                               по нему CSS затемняет дальние карточки
 * @module sliders/ring/math
 */
import { mod, rad } from '../../../core/math.js'

/** Угол между соседними карточками, градусы. */
export const ringStep = (count) => 360 / count

/**
 * Радиус кольца, на котором `count` карточек шириной `width` стоят с
 * зазором `gap` (по хорде).
 */
export function ringRadius(width, count, gap = 24) {
  if (count < 3) return width
  return (width + gap) / (2 * Math.tan(Math.PI / count))
}

/** Ближайший к повороту «фиксированный» угол. */
export const snapRotation = (rotation, count) => Math.round(rotation / ringStep(count)) * ringStep(count)

/** Карточка, которая смотрит на зрителя при данном повороте. */
export const activeIndex = (rotation, count) => mod(Math.round(-rotation / ringStep(count)), count)

/** Поворот, при котором карточка `index` спереди, ближайший к текущему. */
export function rotationFor(index, current, count) {
  const step = ringStep(count)
  const base = -index * step
  const turns = Math.round((current - base) / 360)

  return base + turns * 360
}

/** Насколько карточка повёрнута к зрителю: 1 — анфас, 0 — спиной. */
export const facing = (angleDeg) => (Math.cos(rad(angleDeg)) + 1) / 2
