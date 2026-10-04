/**
 * Форматирование чисел для счётчиков — чистые функции (тесты в format.test.js).
 *
 * formatCount(1204)                         → «1 204» (разряды через тонкий пробел U+2009,
 *                                              как принято в русской типографике)
 * formatCount(7.8, { decimals: 1, suffix: ' км/с' }) → «7.8 км/с»
 * formatCount(-5)                           → «−5» (настоящий минус, а не дефис)
 * @module manifesto/format
 */

/**
 * Число с разделением разрядов тонким пробелом.
 * @param {number} value
 * @param {{ decimals?: number, prefix?: string, suffix?: string }} [options]
 */
export function formatCount(value, { decimals = 0, prefix = '', suffix = '' } = {}) {
  const fixed = Math.abs(value).toFixed(decimals)
  const [int, frac] = fixed.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = value < 0 && Number(fixed) !== 0 ? '−' : ''

  return `${prefix}${sign}${grouped}${frac ? `.${frac}` : ''}${suffix}`
}

/** Сколько знаков после точки в строке-числе из data-атрибута («7.8» → 1). */
export const decimalsOf = (raw) => (String(raw).split('.')[1] ?? '').length
