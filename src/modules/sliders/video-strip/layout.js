/**
 * Геометрия видеоленты — чистые функции без DOM (легко тестировать и
 * переносить).
 *
 * ─── Как устроена лента ────────────────────────────────────────────────────
 * Карточки стоят в ряд (flex) внутри «дорожки» (track). Дорожка шире окна,
 * её тянут мышью (Draggable двигает её `x`). Одна карточка может быть
 * раскрыта: она шире остальных в EXPAND_RATIO раз.
 *
 *   окно:     |<───────────── viewport ─────────────>|
 *   дорожка:  [ 1 ][ 2 ][    3 раскрыта    ][ 4 ][ 5 ]
 *             ^ x дорожки (0 или отрицательный — сдвинута влево)
 *
 * @module sliders/video-strip/layout
 */
import { clamp } from '../../../core/math.js'

/** Во сколько раз раскрытая карточка шире обычной. */
export const EXPAND_RATIO = 3

/**
 * Ширина раскрытой карточки: в EXPAND_RATIO раз шире обычной, но не шире
 * окна минус поля (иначе на узком окне раскрытая карточка вылезла бы за край).
 * @param {number} base Обычная ширина карточки, px.
 * @param {number} viewport Ширина окна ленты, px.
 * @param {number} [gutter] Отступ от краёв окна, px.
 */
export const expandedWidth = (base, viewport, gutter = 16) =>
  Math.max(base, Math.min(base * EXPAND_RATIO, viewport - gutter * 2))

/**
 * Границы перетаскивания дорожки: правее 0 нельзя (первая карточка у левого
 * края), левее «ширина окна − ширина дорожки» нельзя (последняя у правого).
 * Если дорожка уже окна — двигать некуда, обе границы 0.
 * @returns {{ minX: number, maxX: number }}
 */
export const trackBounds = (viewport, track) => ({ minX: Math.min(0, viewport - track), maxX: 0 })

/**
 * Куда сдвинуть дорожку, чтобы раскрытая карточка `index` оказалась по
 * центру окна. Крайние карточки центр не догоняют — упираются в границы.
 * Считается на КОНЕЦ анимации: слева от карточки к тому времени только
 * обычные (раскрыта одна).
 *
 * @param {{ index: number, count: number, base: number, expanded: number, gap: number, viewport: number }} p
 * @returns {number} x дорожки (≤ 0)
 */
export function focusX({ index, count, base, expanded, gap, viewport }) {
  const left = index * (base + gap) // левый край карточки на дорожке
  const track = (count - 1) * (base + gap) + expanded // ширина дорожки после раскрытия
  const { minX } = trackBounds(viewport, track)

  return clamp((viewport - expanded) / 2 - left, minX, 0)
}

/**
 * Видна ли карточка хоть немного в окне (раскрытую, утащенную за край,
 * сворачиваем — ролик, которого не видно, играть не должен).
 * @param {{ left: number, right: number }} card Прямоугольник карточки.
 * @param {{ left: number, right: number }} view Прямоугольник окна.
 */
export const isInView = (card, view) => card.right > view.left && card.left < view.right
