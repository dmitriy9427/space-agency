/**
 * «Тянучка» за курсором: цепочка точек. Голова догоняет курсор, каждая
 * следующая точка — предыдущую, с небольшой инерцией; хвост растягивается
 * при быстром движении и подтягивается, когда курсор стоит.
 *
 * Звено устроено так: x' = x + pull·(prev − x) + inertia·(x − x_old).
 * При pull = 0.5 и inertia = 0.15 у звена два вещественных корня меньше 1
 * (передемпфированное звено): оно не раскачивается, и цепочка из десятков
 * звеньев не накапливает колебания. Недодемпфированная пружина в такой
 * цепочке усиливала бы колебания от звена к звену — хвост «взрывался».
 *
 * Физика идёт фиксированными шагами 60 Гц, поэтому на 120 Гц хвост такой же.
 * @module cursor/rope
 */

export const STEP = 1 / 60

/**
 * @param {number} count Число точек.
 * @param {{ pull?: number, inertia?: number, follow?: number }} [options]
 *   `pull` — как сильно звено тянется к предыдущему за шаг (0…1),
 *   `inertia` — доля прошлой скорости (0…<1), `follow` — как быстро голова догоняет курсор.
 */
export function createRope(count, { pull = 0.5, inertia = 0.15, follow = 0.6 } = {}) {
  const points = Array.from({ length: count }, () => ({ x: 0, y: 0, px: 0, py: 0 }))
  let placed = false
  let accumulator = 0

  const step = (target) => {
    const head = points[0]

    head.px = head.x
    head.py = head.y
    head.x += (target.x - head.x) * follow
    head.y += (target.y - head.y) * follow

    for (let i = 1; i < points.length; i++) {
      const p = points[i]
      const prev = points[i - 1]
      const vx = p.x - p.px
      const vy = p.y - p.py

      p.px = p.x
      p.py = p.y
      p.x += (prev.x - p.x) * pull + vx * inertia
      p.y += (prev.y - p.y) * pull + vy * inertia
    }
  }

  return {
    points,
    /** Поставить всю цепочку в точку (первое появление курсора). */
    reset(x, y) {
      points.forEach((p) => Object.assign(p, { x, y, px: x, py: y }))
      placed = true
      accumulator = 0
    },
    /** Продвинуть физику на `dt` секунд (фиксированными шагами, не больше 4 за кадр). */
    update(target, dt) {
      if (!placed) this.reset(target.x, target.y)

      accumulator = Math.min(accumulator + Math.max(dt, 0), STEP * 4)
      while (accumulator >= STEP) {
        step(target)
        accumulator -= STEP
      }
    },
    /** Длина хвоста, px: 0 — цепочка собралась в точку и её можно не рисовать. */
    get length() {
      let total = 0

      for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
      return total
    },
    get placed() {
      return placed
    },
  }
}

/** Ширина сегмента `i` из `n`: от `head` у курсора до нуля на хвосте. */
export const segmentWidth = (i, n, head) => head * Math.pow(1 - i / n, 1.4)
