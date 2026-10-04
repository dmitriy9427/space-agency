/**
 * Логика пуска — чистые функции (тесты — countdown.test.js).
 *
 * formatCountdown(5)  → «T−05»
 * countdownSteps(3)   → [3, 2, 1, 0]
 * sparkParams(random) → { velocity, angle, gravity, size, duration } для одной искры.
 *   Углы 200…340° — это «вверх веером» (в Physics2D 0° — вправо, 90° — вниз,
 *   270° — вверх: ось Y экрана направлена вниз).
 * @module mission/countdown
 */

/** «T−05», «T−00». */
export const formatCountdown = (seconds) => `T−${String(Math.max(0, Math.floor(seconds))).padStart(2, '0')}`

/** Шаги отсчёта от `from` до 0 включительно. */
export const countdownSteps = (from) => Array.from({ length: Math.max(0, Math.floor(from)) + 1 }, (_, i) => from - i)

/**
 * Параметры разлёта искры для Physics2D: угол «веером» вверх.
 * @param {() => number} random 0…1
 */
export function sparkParams(random) {
  return {
    velocity: 260 + random() * 520,
    angle: 200 + random() * 140, // 200…340° — вверх и в стороны
    gravity: 900,
    size: 3 + random() * 6,
    duration: 1.2 + random() * 0.8,
  }
}
