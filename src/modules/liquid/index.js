/**
 * Секция «Водная гладь»: фото туманности лежит под водой. Курсор оставляет
 * за собой рябь, клик бросает «камень», в простое на воду падает лёгкий
 * дождь. Волны считаются на GPU (волновое уравнение), только пока секция
 * на экране.
 *
 * Телефон: рисования пальцем нет (жест — это прокрутка страницы); рябь от тапа
 * (капля) и от «дождя» в покое. Мышь рисует рябь движением, как раньше.
 * @module liquid
 */
import { gsap } from '../../core/gsap.js'
import { supportsWebGL } from '../../core/env.js'
import { createDisposer, onViewport } from '../../core/lifecycle.js'
import { loadImage } from '../../core/media.js'
import { createDropQueue, createRain, dropsAlongPath, pointerToUv, strengthFromSpeed } from './ripple.js'

/** Через сколько секунд без курсора начинается дождь. */
export const RAIN_DELAY = 1.2

/**
 * @param {HTMLElement} el
 * @param {{ reduced: boolean, quality: { tier: string, dpr: number } }} ctx
 */
export async function init(el, ctx) {
  const stage = el.querySelector('[data-liquid-stage]') ?? el
  const photo = el.querySelector('[data-liquid-photo]')

  if (!supportsWebGL() || !photo) return { destroy() {} }

  const [{ createRippleRenderer }, image] = await Promise.all([
    import('./ripple.scene.js'),
    loadImage(photo.currentSrc || photo.src),
  ])
  const gl = createRippleRenderer(stage, image, ctx.quality)

  if (!gl) return { destroy() {} }

  const d = createDisposer()
  const queue = createDropQueue()
  const rain = createRain(Math.random)
  let inView = false
  let idle = RAIN_DELAY
  let last = null

  el.classList.add('is-gl')
  d.add(() => {
    gl.dispose()
    el.classList.remove('is-gl')
  })

  const resize = () => gl.resize(stage.clientWidth || 1, stage.clientHeight || 1)
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null

  resizeObserver?.observe(stage)
  d.add(() => resizeObserver?.disconnect())
  resize()

  d.listen(
    stage,
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return
      const point = pointerToUv(event.clientX, event.clientY, stage.getBoundingClientRect())
      const now = performance.now()

      idle = 0
      if (last) {
        const dt = Math.max((now - last.time) / 1000, 1 / 240)
        const speed = (Math.hypot(point.x - last.x, point.y - last.y) * stage.clientWidth) / dt
        const strength = strengthFromSpeed(speed)

        dropsAlongPath(last, point, 0.012, 4).forEach((p) => queue.push({ ...p, radius: 0.022, strength }))
      }
      last = { ...point, time: now }
    },
    { passive: true },
  )
  d.listen(stage, 'pointerleave', () => (last = null))
  d.listen(stage, 'pointerdown', (event) => {
    const point = pointerToUv(event.clientX, event.clientY, stage.getBoundingClientRect())

    queue.push({ ...point, radius: 0.06, strength: 0.8 })
  })

  const tick = (_time, deltaMs) => {
    if (!inView) return

    const dt = Math.min(deltaMs / 1000, 0.05)

    idle += dt
    if (!ctx.reduced && idle > RAIN_DELAY) rain.step(dt).forEach((drop) => queue.push(drop))
    gl.step(queue.flush())
    gl.render()
  }

  gsap.ticker.add(tick)
  d.add(() => gsap.ticker.remove(tick))
  d.add(onViewport(el, { enter: () => (inView = true), leave: () => (inView = false) }))

  return { queue, destroy: () => d.dispose() }
}
