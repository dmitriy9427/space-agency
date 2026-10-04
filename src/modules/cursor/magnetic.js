/**
 * Математика «магнитной» кнопки (тест — magnetic.test.js).
 *
 * Кнопка смещается к курсору на долю расстояния от своего центра:
 * курсор правее центра на 50 px, сила 0.35 → кнопка сдвигается на 17.5 px.
 * Поэтому при наведении кажется, что кнопка «тянется» за курсором.
 * @module cursor/magnetic
 */

/**
 * Смещение элемента к курсору.
 * @param {number} x Курсор, clientX.
 * @param {number} y Курсор, clientY.
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @param {number} [strength] Доля расстояния от центра до курсора.
 */
export function magneticOffset(x, y, rect, strength = 0.35) {
  return {
    x: (x - (rect.left + rect.width / 2)) * strength,
    y: (y - (rect.top + rect.height / 2)) * strength,
  }
}
