/**
 * Логика шейдерного слайдера — без WebGL и DOM, поэтому легко тестируется.
 *
 * ─── Направление перехода ──────────────────────────────────────────────────
 * Переход описывается вектором `dir` — куда ЕДЕТ граница между старой и новой
 * картинкой (в координатах текстуры: x вправо, y ВВЕРХ):
 *
 *   тянем влево  (или «вперёд», →)  → dir = (−1,  0): новая входит справа
 *   тянем вправо (или «назад», ←)   → dir = ( 1,  0): новая входит слева
 *   тянем вверх  (или «вниз», ↓)    → dir = ( 0,  1): новая входит снизу
 *   тянем вниз   (или «вверх», ↑)   → dir = ( 0, −1): новая входит сверху
 *
 * То есть граница всегда движется ВМЕСТЕ с рукой — как будто вы сдвигаете
 * старую картинку и под ней открывается новая.
 * Влево и вверх — следующий слайд (`step: 1`), вправо и вниз — предыдущий.
 * @module sliders/shader/logic
 */
import { clamp, mod } from '../../../core/math.js'

/** Индекс соседнего слайда по кругу: после последнего — первый. */
export const neighbour = (index, step, count) => mod(index + step, count)

/**
 * Направление «вперёд/назад» по горизонтали и вертикали.
 * @type {Record<'next-x'|'prev-x'|'next-y'|'prev-y', { step: 1 | -1, dir: [number, number] }>}
 */
export const DIRECTIONS = {
  'next-x': { step: 1, dir: [-1, 0] },
  'prev-x': { step: -1, dir: [1, 0] },
  'next-y': { step: 1, dir: [0, 1] },
  'prev-y': { step: -1, dir: [0, -1] },
}

/**
 * Что пользователь «тянет»: по какой оси, вперёд или назад, и насколько.
 *
 * @param {number} dx Сдвиг руки по X с начала жеста, px (вправо — плюс).
 * @param {number} dy Сдвиг руки по Y, px (вниз — плюс, как у экрана).
 * @param {number} width Сколько px нужно протянуть по X для полного перехода.
 * @param {number} height То же по Y.
 * @param {'x' | 'y' | null} [axis] Ось, если она уже определена (Observer с lockAxis).
 * @returns {{ key: keyof DIRECTIONS | null, progress: number }} `key: null` — жеста ещё нет.
 */
export function dragIntent(dx, dy, width, height, axis = null) {
  const useX = axis ? axis === 'x' : Math.abs(dx) >= Math.abs(dy)
  const delta = useX ? dx : dy
  const size = useX ? width : height

  if (!delta || !size) return { key: null, progress: 0 }

  // Тянем влево/вверх (delta < 0) — следующий слайд.
  const key = `${delta < 0 ? 'next' : 'prev'}-${useX ? 'x' : 'y'}`

  return { key, progress: clamp(Math.abs(delta) / size, 0, 1) }
}

/** Направление для клавиши. Неизвестная клавиша — null. */
export function keyIntent(key) {
  return { ArrowRight: 'next-x', ArrowLeft: 'prev-x', ArrowDown: 'next-y', ArrowUp: 'prev-y' }[key] ?? null
}

/**
 * Довести переход до конца или откатить: если протянули больше `threshold`
 * пути или бросили быстрее 700 px/с.
 */
export const shouldComplete = (progress, velocity = 0, threshold = 0.25) =>
  progress > threshold || Math.abs(velocity) > 700
