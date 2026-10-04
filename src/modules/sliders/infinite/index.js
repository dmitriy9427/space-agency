/**
 * Слайдеры №3 и №4 — бесконечная лента (обычная и WebGL-«барабан»).
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Ряд слайдов без начала и конца. Тяните мышью — лента едет за рукой,
 * наклоняясь на скорости; отпустили — плавно (пружиной) докатывается до
 * ближайшего слайда. Сильный бросок пролистывает несколько. Ещё: кнопки,
 * стрелки клавиатуры, горизонтальная прокрутка тачпада, клик по боковому слайду.
 * №4 — то же самое, но слайды нарисованы в WebGL на изогнутом «барабане»
 * с отражением в полу и RGB-расслоением на скорости.
 *
 * ─── Архитектура: движок + рендерер ────────────────────────────────────────────
 *   engine.js          — ЛОГИКА (где каждый слайд, пружина, бросок), без DOM;
 *   dom-renderer.js    — РИСУЕТ DOM-трансформами (№3);
 *   infinite.scene.js  — РИСУЕТ в WebGL (№4);
 *   index.js (этот)    — СВЯЗЫВАЕТ жесты → движок → рендерер.
 * Один движок, два рендерера с одинаковым интерфейсом { resize, render,
 * dispose }. Так же устроен InfiniteSlider в UguKit (референс).
 *
 * ─── Цикл кадров ────────────────────────────────────────────────────────────────
 * На тикере GSAP: если лента видна и движется (`engine.step()` вернул true)
 * или что-то поменялось (`dirty`) — рисуем. В покое кадр выходит сразу.
 *
 * ─── Жесты ──────────────────────────────────────────────────────────────────────
 * Observer (мышь и палец) с lockAxis: начали тянуть вбок — вертикальная
 * часть жеста игнорируется (не мешаем прокрутке страницы). Колесо — только
 * горизонтальное (свайп тачпада, Shift+колесо); вертикальное остаётся странице.
 *
 * Без WebGL `init3d` тихо откатывается на DOM-версию той же разметки.
 * @module sliders/infinite
 */
import { gsap, Observer } from '../../../core/gsap.js'
import { supportsWebGL } from '../../../core/env.js'
import { createDisposer, onViewport } from '../../../core/lifecycle.js'
import { loadImage } from '../../../core/media.js'
import { createInfiniteEngine } from './engine.js'
import { createDomRenderer } from './dom-renderer.js'

/** Пауза колеса, после которой лента доводится до слайда, мс. */
export const WHEEL_IDLE = 140

/**
 * Общая часть обеих версий.
 * @param {HTMLElement} el
 * @param {{ reduced: boolean }} ctx
 * @param {(parts: { viewport: HTMLElement, slides: HTMLElement[] }) => { resize: Function, render: Function, dispose: Function }} makeRenderer
 */
export function mountInfinite(el, ctx, makeRenderer) {
  const d = createDisposer()
  const viewport = el.querySelector('[data-infinite-viewport]')
  const slides = Array.from(el.querySelectorAll('[data-infinite-slide]'))
  const title = el.querySelector('[data-infinite-title]')
  const counter = el.querySelector('[data-infinite-counter]')

  if (!viewport || slides.length < 3) return { destroy() {} }

  const engine = createInfiniteEngine({
    count: slides.length,
    lag: ctx.reduced ? 0 : 0.08,
    snapDuration: ctx.reduced ? 0.2 : 0.75,
    bounce: ctx.reduced ? 0 : 0.18,
  })
  const renderer = makeRenderer({ viewport, slides })
  let dirty = true
  let index = -1
  let inView = false
  let moved = false

  d.add(() => renderer.dispose())

  const measure = () => {
    const gap = parseFloat(getComputedStyle(el).getPropertyValue('--infinite-gap')) || 24
    const slideWidth = slides[0].offsetWidth || 1

    engine.setSize(slideWidth + gap)
    renderer.resize(viewport.clientWidth, slideWidth, slides[0].offsetHeight || 1, viewport.clientHeight)
    dirty = true
  }

  const updateLabels = () => {
    const next = engine.targetIndex

    if (next === index) return
    index = next
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index))
    if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`
    if (title) {
      const text = slides[index].dataset.title ?? ''

      gsap.timeline()
        .to(title, { yPercent: -100, autoAlpha: 0, duration: ctx.reduced ? 0 : 0.2, ease: 'power2.in' })
        .add(() => (title.textContent = text))
        .fromTo(title, { yPercent: 100 }, { yPercent: 0, autoAlpha: 1, duration: ctx.reduced ? 0 : 0.45, ease: 'power3.out' })
    }
  }

  const tick = (_time, deltaMs) => {
    if (!inView) return

    const moving = engine.step(Math.min(deltaMs / 1000, 0.05))

    if (moving || dirty) {
      renderer.render(engine)
      dirty = false
      updateLabels()
    }
  }

  gsap.ticker.add(tick)
  d.add(() => gsap.ticker.remove(tick))
  d.add(onViewport(el, { rootMargin: '200px', enter: () => ((inView = true), (dirty = true)), leave: () => (inView = false) }))

  // --- жесты -----------------------------------------------------------------
  const observer = Observer.create({
    target: viewport,
    type: 'pointer,touch',
    dragMinimum: 4,
    lockAxis: true,
    onPress: () => {
      moved = false
      engine.press()
    },
    onDrag: (self) => {
      if (self.axis === 'y') return
      moved = true
      engine.drag(self.deltaX)
    },
    onRelease: (self) => engine.release(self.axis === 'y' ? 0 : self.velocityX),
  })

  d.add(() => observer.kill())

  let wheelTimer = 0

  d.listen(
    viewport,
    'wheel',
    (event) => {
      // Только горизонтальное колесо (свайп тачпада, Shift+колесо): вертикальное — странице.
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      engine.drag(-event.deltaX)
      clearTimeout(wheelTimer)
      wheelTimer = setTimeout(() => engine.release(0), WHEEL_IDLE)
    },
    { passive: false },
  )
  d.add(() => clearTimeout(wheelTimer))

  // Клик по боковому слайду — подвезти его в центр (но не после перетаскивания).
  slides.forEach((slide, i) =>
    d.listen(slide, 'click', () => {
      if (!moved) engine.goTo(i)
    }),
  )

  const prev = el.querySelector('[data-prev]')
  const next = el.querySelector('[data-next]')

  if (prev) d.listen(prev, 'click', () => engine.shift(-1))
  if (next) d.listen(next, 'click', () => engine.shift(1))
  d.listen(viewport, 'keydown', (event) => {
    if (event.key === 'ArrowLeft') engine.shift(-1)
    if (event.key === 'ArrowRight') engine.shift(1)
  })

  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null

  resizeObserver?.observe(viewport)
  d.add(() => resizeObserver?.disconnect())
  measure()
  updateLabels()
  el.classList.add('is-ready')
  d.add(() => el.classList.remove('is-ready'))

  return { engine, destroy: () => d.dispose() }
}

/** DOM-версия. */
export function init(el, ctx) {
  return mountInfinite(el, ctx, ({ slides }) => createDomRenderer(slides))
}

/** WebGL-версия (барабан) с откатом на DOM. */
export async function init3d(el, ctx) {
  if (!supportsWebGL()) return init(el, ctx)

  // Фото грузятся заранее: текстура из незагруженной картинки была бы пустой.
  const sources = Array.from(el.querySelectorAll('[data-infinite-slide] img')).map((image) => image.currentSrc || image.src)
  const [{ createGlRenderer }, images] = await Promise.all([import('./infinite.scene.js'), Promise.all(sources.map(loadImage))])

  el.classList.add('is-gl')

  const instance = mountInfinite(el, ctx, ({ viewport }) => {
    return createGlRenderer(viewport, images, ctx.quality, {
      curve: Number(el.dataset.curve ?? 1.1),
      reflection: ctx.quality.tier === 'low' ? 0 : 0.35,
    })
  })

  return {
    engine: instance.engine,
    destroy() {
      instance.destroy()
      el.classList.remove('is-gl')
    },
  }
}
