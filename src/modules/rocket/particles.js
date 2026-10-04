/**
 * Частицы выхлопа ракеты — «пул» на типизированных массивах.
 *
 * ─── Зачем пул ──────────────────────────────────────────────────────────────
 * Каждую секунду рождается около сотни искр. Если создавать для каждой
 * новый объект `{ x, y, … }`, браузеру придётся постоянно убирать мусор
 * (garbage collection) — это даёт заметные «подёргивания». Поэтому все
 * частицы живут в нескольких заранее выделенных массивах Float32Array:
 *   positions[i*3 + 0/1/2] — x, y, z частицы i;
 *   velocities             — скорости;
 *   ages                   — возраст 0 (родилась) … 1 (умерла);
 *   sizes                  — размер (у мёртвых 0 — не видны).
 * Новая искра занимает место самой старой («кольцевой буфер»).
 *
 * Бонус: эти же массивы three.js отдаёт видеокарте как BufferAttribute —
 * без копирования. Логика пула не зависит от three и тестируется отдельно
 * (particles.test.js).
 * @module rocket/particles
 */

export class ParticlePool {
  /** @param {number} capacity Максимум живых частиц. */
  constructor(capacity) {
    this.capacity = capacity
    this.positions = new Float32Array(capacity * 3)
    this.velocities = new Float32Array(capacity * 3)
    /** 0 — родилась, 1 — умерла (так удобно шейдеру). */
    this.ages = new Float32Array(capacity).fill(1)
    this.lifetimes = new Float32Array(capacity).fill(1)
    this.sizes = new Float32Array(capacity)
    this.cursor = 0
    this.alive = 0
  }

  /**
   * Родить частицу по кольцевому буферу (самая старая заменяется).
   * @param {{ x: number, y: number, z: number }} origin
   * @param {{ x: number, y: number, z: number }} velocity
   * @param {number} life Время жизни, секунды.
   * @param {number} size
   */
  emit(origin, velocity, life, size) {
    const i = this.cursor
    const o = i * 3

    this.positions[o] = origin.x
    this.positions[o + 1] = origin.y
    this.positions[o + 2] = origin.z
    this.velocities[o] = velocity.x
    this.velocities[o + 1] = velocity.y
    this.velocities[o + 2] = velocity.z
    this.ages[i] = 0
    this.lifetimes[i] = Math.max(life, 0.001)
    this.sizes[i] = size
    this.cursor = (i + 1) % this.capacity
  }

  /**
   * Продвинуть симуляцию. Возвращает число живых частиц.
   * @param {number} dt Секунды.
   * @param {number} [drag] Затухание скорости в секунду (0 — нет).
   */
  update(dt, drag = 0) {
    const damping = Math.max(0, 1 - drag * dt)
    let alive = 0

    for (let i = 0; i < this.capacity; i++) {
      if (this.ages[i] >= 1) continue

      this.ages[i] = Math.min(1, this.ages[i] + dt / this.lifetimes[i])
      if (this.ages[i] >= 1) {
        this.sizes[i] = 0
        continue
      }

      const o = i * 3

      this.velocities[o] *= damping
      this.velocities[o + 1] *= damping
      this.velocities[o + 2] *= damping
      this.positions[o] += this.velocities[o] * dt
      this.positions[o + 1] += this.velocities[o + 1] * dt
      this.positions[o + 2] += this.velocities[o + 2] * dt
      alive++
    }

    this.alive = alive
    return alive
  }

  /** Убить все частицы. */
  clear() {
    this.ages.fill(1)
    this.sizes.fill(0)
    this.alive = 0
  }
}

/**
 * Сколько частиц родить за кадр при данной тяге — накопительно, чтобы при
 * 144 Гц и 30 Гц частиц в секунду было поровну.
 * @param {number} thrust 0…1.5
 * @param {number} dt
 * @param {number} carry Остаток с прошлого кадра.
 * @param {number} [perSecond] Частиц в секунду при тяге 1.
 * @returns {{ count: number, carry: number }}
 */
export function spawnBudget(thrust, dt, carry, perSecond = 90) {
  const wanted = Math.max(thrust, 0) * perSecond * dt + carry
  const count = Math.floor(wanted)

  return { count, carry: wanted - count }
}
