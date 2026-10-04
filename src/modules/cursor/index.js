/**
 * Курсор «неоновая тянучка» + подсказки + магнитные кнопки.
 * Общий слой: живёт на всех страницах и не пересоздаётся при переходах.
 *
 * ─── Из чего состоит ──────────────────────────────────────────────────────────
 * 1. Хвост — светящаяся линия за курсором. Физика — в rope.js (цепочка точек,
 *    каждая догоняет предыдущую). Рисуем в <canvas> на весь экран.
 * 2. Звёздная пыль — на резком движении из курсора сыплются искорки.
 * 3. Подсказка — над элементом с `data-cursor="тяни"` появляется белый круг
 *    с текстом. Сам элемент ничего не делает — это только атрибут в HTML.
 * 4. Магнитные кнопки — элементы с `data-magnetic` смещаются к курсору и
 *    упруго возвращаются, когда курсор уходит.
 *
 * ─── Делегирование событий (важно для смены страниц) ──────────────────────────
 * Мы НЕ вешаем обработчики на каждую кнопку. Слушаем события на всём
 * документе и в момент события смотрим, над каким элементом курсор:
 * `event.target.closest('[data-magnetic]')`. Так подсказки и магнит сразу
 * работают и на страницах, которые роутер подгрузил позже, — без
 * перезапуска модуля.
 *
 * ─── Почему canvas, а не DOM-элементы ──────────────────────────────────────────
 * Хвост — 26 точек, пыль — до 70 частиц. Двигать столько DOM-элементов
 * каждый кадр дороже, чем один раз перерисовать canvas. И canvas рисуется
 * только пока что-то движется: курсор замер — цикл засыпает.
 *
 * ─── Настройки ──────────────────────────────────────────────────────────────
 * POINTS (длина хвоста), HEAD_WIDTH (толщина), COLORS (градиент), MAX_DUST;
 * жёсткость хвоста — параметры createRope в rope.js; сила магнита —
 * значение атрибута: `data-magnetic="0.5"`.
 *
 * МОБИЛКА: на тач-экранах курсора нет — модуль удаляет свою разметку
 * (первая проверка в init). Ничего менять не нужно; магнитные кнопки на
 * телефоне тоже не работают (и не должны).
 * @module cursor
 */
import { gsap } from '../../core/gsap.js'
import { isCoarsePointer } from '../../core/env.js'
import { createDisposer } from '../../core/lifecycle.js'
import { magneticOffset } from './magnetic.js'
import { createRope, segmentWidth } from './rope.js'

/** Сколько точек в хвосте: больше — длиннее и «тягучее». */
export const POINTS = 26
/** Толщина хвоста у курсора, px. */
export const HEAD_WIDTH = 9
/** На сколько цельных кусков режется хвост при рисовании (ступени толщины). */
export const CHUNKS = 4
/** Цвета хвоста от курсора к кончику. */
export const COLORS = ['#ffffff', '#5ee6ff', '#8b6bff', '#ff5b2e']
/** Предел частиц пыли одновременно. */
const MAX_DUST = 70

/**
 * @param {HTMLElement} el Корень `.cursor`: `.cursor__trail` (canvas),
 *   `.cursor__ring` (едет за курсором) > `.cursor__bubble` (подсказка) > `.cursor__label`.
 * @param {{ reduced: boolean, quality?: { dpr: number } }} ctx
 */
export function init(el, ctx) {
  // Нет мыши (телефон, планшет) или просили меньше движения — курсор не нужен.
  if (isCoarsePointer() || ctx.reduced) {
    el.remove()
    return { destroy() {} }
  }

  const d = createDisposer()
  const canvas = el.querySelector('.cursor__trail')
  const ring = el.querySelector('.cursor__ring')
  const label = el.querySelector('.cursor__label')
  const context = canvas?.getContext('2d')
  const rope = createRope(POINTS)
  const dust = []
  const target = { x: 0, y: 0 }
  // quickTo — один переиспользуемый твин вместо нового на каждый pointermove
  // (docs/03-gsap-plugins.md, «gsap.quickTo»).
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' })
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' })
  // Плотность пикселей canvas: не больше 1.5 — хвост мягкий, разница незаметна.
  const dpr = Math.min(ctx.quality?.dpr ?? window.devicePixelRatio ?? 1, 1.5)
  let lastMove = { x: 0, y: 0, time: 0 }
  let drawing = false

  // Класс на <html> прячет системный курсор (см. .has-cursor в effects.css) —
  // только когда наш действительно работает.
  document.documentElement.classList.add('has-cursor')
  d.add(() => document.documentElement.classList.remove('has-cursor'))

  // Canvas на весь экран: размер в реальных пикселях = CSS-размер × dpr.
  const resize = () => {
    if (!canvas) return
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
  }

  resize()
  d.listen(window, 'resize', resize)

  // --- рисование хвоста ------------------------------------------------------------
  const draw = (dt) => {
    if (!context) return

    rope.update(target, dt)
    // Масштаб dpr: дальше рисуем в CSS-пикселях, а canvas сам будет чётким.
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    // 'lighter' — цвета складываются, как свет: пересечения светятся ярче (неон).
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'

    const pts = rope.points
    const n = pts.length - 1
    const head = pts[0]
    const tail = pts[n]
    // Градиент от головы к хвосту (+0.01 — чтобы не было нулевой длины, когда хвост собран).
    const gradient = context.createLinearGradient(head.x, head.y, tail.x + 0.01, tail.y + 0.01)

    COLORS.forEach((color, i) => gradient.addColorStop(i / (COLORS.length - 1), color))

    // Три прохода: широкое мягкое свечение, средний ореол, яркая сердцевина.
    // Хвост режется на CHUNKS цельных кусков со своей толщиной: если рисовать
    // каждый сегмент отдельно, круглые концы перекрываются и в режиме
    // 'lighter' дают «бусины» на стыках.
    context.lineJoin = 'round'
    ;[
      [3.2, 0.1], // [во сколько раз толще, непрозрачность]
      [1.8, 0.26],
      [0.7, 1],
    ].forEach(([scale, alpha]) => {
      context.globalAlpha = alpha
      context.strokeStyle = gradient
      for (let c = 0; c < CHUNKS; c++) {
        const from = Math.floor((c * n) / CHUNKS)
        const to = Math.floor(((c + 1) * n) / CHUNKS)

        context.lineWidth = Math.max(segmentWidth((from + to) / 2, n, HEAD_WIDTH) * scale, 0.5)
        context.beginPath()
        context.moveTo(pts[from].x, pts[from].y)
        for (let i = from + 1; i <= to; i++) context.lineTo(pts[i].x, pts[i].y)
        context.stroke()
      }
    })

    // Звёздная пыль: летит, слегка падает (vy += …), гаснет.
    for (let i = dust.length - 1; i >= 0; i--) {
      const s = dust[i]

      s.life -= dt
      if (s.life <= 0) {
        dust.splice(i, 1)
        continue
      }
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vy += 40 * dt
      context.globalAlpha = Math.min(s.life / s.max, 1)
      context.fillStyle = s.color
      context.beginPath()
      context.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      context.fill()
    }

    // Яркая точка-«голова» прямо под курсором.
    context.globalAlpha = 1
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(head.x, head.y, 2.6, 0, Math.PI * 2)
    context.fill()
    context.globalCompositeOperation = 'source-over'
  }

  const tick = (_time, deltaMs) => {
    if (!drawing) return
    draw(Math.min(deltaMs / 1000, 0.05))
    // Хвост собрался, пыль осела, курсор стоит дольше 0.4 с — засыпаем
    // (последний кадр — точка под курсором — остаётся на canvas).
    if (rope.length < 0.5 && !dust.length && performance.now() - lastMove.time > 400) drawing = false
  }

  gsap.ticker.add(tick)
  d.add(() => gsap.ticker.remove(tick))

  // --- движение мыши ----------------------------------------------------------------
  d.listen(
    window,
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return

      const now = performance.now()
      // Скорость в px/мс — для пыли.
      const speed = Math.hypot(event.clientX - lastMove.x, event.clientY - lastMove.y) / Math.max(now - lastMove.time, 1)

      el.classList.add('is-visible')
      target.x = event.clientX
      target.y = event.clientY
      ringX(event.clientX)
      ringY(event.clientY)
      drawing = true // разбудить цикл

      if (speed > 1.2 && dust.length < MAX_DUST) {
        for (let i = 0; i < 2; i++) {
          dust.push({
            x: event.clientX,
            y: event.clientY,
            vx: (Math.random() - 0.5) * 90,
            vy: (Math.random() - 0.5) * 90,
            size: 0.6 + Math.random() * 1.4,
            life: 0.5 + Math.random() * 0.5,
            max: 1,
            color: COLORS[1 + Math.floor(Math.random() * 3)],
          })
        }
      }
      lastMove = { x: event.clientX, y: event.clientY, time: now }

      updateMagnet(event)
    },
    // passive: true — обещаем браузеру не вызывать preventDefault(): прокрутка не ждёт наш код.
    { passive: true },
  )
  // Курсор ушёл за пределы окна — прячем.
  d.listen(document, 'pointerleave', () => el.classList.remove('is-visible'))

  // --- подсказка: по ближайшему предку с data-cursor (делегирование) -----------------
  d.listen(document, 'pointerover', (event) => {
    const hint = event.target.closest?.('[data-cursor]')

    el.classList.toggle('is-active', !!hint)
    if (label) label.textContent = hint?.dataset.cursor ?? ''
  })
  d.listen(document, 'pointerdown', () => el.classList.add('is-pressed'))
  d.listen(window, 'pointerup', () => el.classList.remove('is-pressed'))

  // --- магнитные элементы (делегирование) ----------------------------------------------
  // Каждое движение — короткий твин с overwrite: 'auto': он заменяет только
  // предыдущий твин x/y этого же элемента. (Первая версия использовала
  // quickTo и возврат с overwrite: true — возврат убивал quickTo навсегда,
  // и магнит работал лишь при первом наведении. См. README.md.)
  let magnet = null // элемент, к которому сейчас «прилип» курсор

  const release = (item) => gsap.to(item, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' })

  function updateMagnet(event) {
    const item = event.target.closest?.('[data-magnetic]') ?? null

    // Ушли с прошлого магнита на другой элемент — отпустить прошлый.
    if (magnet && magnet !== item) release(magnet)
    magnet = item
    if (!item) return

    const strength = Number(item.dataset.magnetic) || 0.35
    const offset = magneticOffset(event.clientX, event.clientY, item.getBoundingClientRect(), strength)

    gsap.to(item, { x: offset.x, y: offset.y, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
  }

  d.listen(document, 'pointerleave', () => {
    if (magnet) release(magnet)
    magnet = null
  })
  d.add(() => {
    if (magnet) gsap.set(magnet, { clearProps: 'transform' })
  })

  return {
    rope,
    get drawing() {
      return drawing
    },
    destroy: () => d.dispose(),
  }
}
