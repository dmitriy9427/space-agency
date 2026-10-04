/**
 * Чистая логика истории (тесты — steps.test.js):
 *
 * stepFromProgress(0.6, 4) → 2   «на 60% прокрутки показываем 3-ю сцену (индекс 2)»
 * telemetry(0.5)           → { clock: 'T+04:30', altitude: 135, speed: '4.40' }
 *
 * «Приборы» не настоящие: высота растёт по степени 1.6 (медленно в начале,
 * быстро потом — как у реальной ракеты), скорость — по степени 0.8.
 * Максимумы (408 км, 7.66 км/с) — параметры МКС.
 * @module story/steps
 */
import { clamp } from '../../core/math.js'

/** Номер сцены (0…n−1) по прогрессу 0…1. */
export function stepFromProgress(progress, count) {
  if (count <= 0) return 0
  return clamp(Math.floor(clamp(progress, 0, 1) * count), 0, count - 1)
}

/** Длительность миссии в «секундах полёта», соответствующая прогрессу 1. */
export const MISSION_SECONDS = 540

/**
 * Показания приборов для прогресса 0…1.
 * @returns {{ clock: string, altitude: number, speed: string }}
 */
export function telemetry(progress) {
  const p = clamp(progress, 0, 1)
  const seconds = Math.round(p * MISSION_SECONDS)
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return {
    clock: `T+${mm}:${ss}`,
    altitude: Math.round(408 * Math.pow(p, 1.6)),
    speed: (7.66 * Math.pow(p, 0.8)).toFixed(2),
  }
}
