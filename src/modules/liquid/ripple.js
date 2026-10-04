/**
 * Логика «водной глади» без WebGL: куда и с какой силой падают капли.
 * Сама симуляция волн идёт на GPU (ripple.glsl.js), сюда вынесено всё,
 * что можно проверить тестами.
 * @module liquid/ripple
 */
import { clamp } from '../../core/math.js'

/** Сколько капель шейдер принимает за один шаг симуляции. */
export const MAX_DROPS = 8

/**
 * Позиция курсора → координаты поверхности 0…1 (Y вверх, как у текстуры).
 * @param {number} x clientX
 * @param {number} y clientY
 * @param {{ left: number, top: number, width: number, height: number }} rect
 */
export function pointerToUv(x, y, rect) {
  return {
    x: clamp((x - rect.left) / Math.max(rect.width, 1), 0, 1),
    y: clamp(1 - (y - rect.top) / Math.max(rect.height, 1), 0, 1),
  }
}

/**
 * Сила капли от скорости курсора (px/с): медленно — лёгкая рябь, быстро —
 * заметная волна, но не больше `max`.
 */
export const strengthFromSpeed = (speed, max = 0.14) => clamp(0.03 + Math.abs(speed) / 20000, 0.03, max)

/**
 * Капли вдоль пути курсора с шагом `spacing` (в долях ширины), не больше `limit`.
 * Без этого быстрый росчерк оставлял бы редкие отдельные круги.
 */
export function dropsAlongPath(from, to, spacing, limit = MAX_DROPS) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = clamp(Math.ceil(distance / Math.max(spacing, 1e-6)), 1, limit)
  const points = []

  for (let i = 1; i <= steps; i++) {
    const t = i / steps

    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
  }
  return points
}

/**
 * Дождь: редкие случайные капли, пока курсор не трогает воду.
 * @param {() => number} random 0…1
 * @param {{ min?: number, max?: number }} [interval] Пауза между каплями, с.
 */
export function createRain(random, { min = 0.35, max = 1.1 } = {}) {
  let wait = min + random() * (max - min)

  return {
    /** Продвинуть время; вернуть капли, упавшие за `dt`. */
    step(dt) {
      const drops = []

      wait -= dt
      while (wait <= 0 && drops.length < MAX_DROPS) {
        drops.push({
          x: 0.08 + random() * 0.84,
          y: 0.08 + random() * 0.84,
          radius: 0.012 + random() * 0.02,
          strength: 0.12 + random() * 0.16,
        })
        wait += min + random() * (max - min)
      }
      return drops
    },
  }
}

/**
 * Очередь капель до следующего шага симуляции: лишние (сверх MAX_DROPS)
 * отбрасываются — в одном кадре их всё равно не видно по отдельности.
 */
export function createDropQueue() {
  let drops = []

  return {
    push(drop) {
      if (drops.length < MAX_DROPS) drops.push(drop)
    },
    /** Забрать накопленное и очистить. */
    flush() {
      const out = drops

      drops = []
      return out
    },
    get size() {
      return drops.length
    },
  }
}
