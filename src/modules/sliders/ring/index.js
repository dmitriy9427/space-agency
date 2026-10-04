/**
 * Слайдер №1 — 3D-кольцо карточек.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Восемь карточек стоят по кругу, как на карусели; видна передняя и по
 * бокам — соседние, уходящие вглубь. Кольцо можно крутить мышью: бросили —
 * оно докручивается по инерции и останавливается ровно на ближайшей
 * карточке. Ещё: кнопки ← →, стрелки клавиатуры, клик по боковой карточке.
 *
 * ─── Как устроено 3D на CSS ────────────────────────────────────────────────
 *   .ring__stage   — perspective: 1800px (как далеко «глаз» от экрана);
 *   .ring__spinner — transform-style: preserve-3d (дети живут в общем 3D);
 *   .ring__card    — rotateY(i × 45°) translateZ(радиус): повернуть карточку
 *                    на свой угол и вынести из центра на радиус.
 * Поворот всего кольца — rotateY у spinner. Радиус считается так, чтобы
 * карточки стояли с зазором (ringRadius в math.js).
 *
 * Порядок трансформаций здесь важен («сначала повернуть, потом вынести»),
 * а GSAP всегда применяет сдвиг ДО поворота — поэтому transform пишем
 * строкой вручную, а не через gsap.set({ rotationY, z }).
 *
 * ─── Перетаскивание через «прокси» ───────────────────────────────────────────
 * Draggable умеет двигать элементы по x/y, а нам нужно крутить УГОЛ.
 * Приём: создаём невидимый div-прокси (его нет на странице), Draggable
 * «тащит» его по x, а мы переводим x прокси в угол: rotation = x × DEG_PER_PX.
 * `inertia: true` + `snap` (InertiaPlugin) — бросок с инерцией и доводкой:
 * snap получает «куда бы доехал прокси» и возвращает ближайший угол карточки.
 *
 * ─── Настройки ──────────────────────────────────────────────────────────────
 * DEG_PER_PX — чувствительность; perspective и размер карточек — в
 * sliders.css (.ring__stage, .ring__card); зазор — третий аргумент ringRadius.
 * @module sliders/ring
 */
import { gsap, Draggable } from '../../../core/gsap.js'
import { createDisposer } from '../../../core/lifecycle.js'
import { activeIndex, facing, ringRadius, ringStep, rotationFor, snapRotation } from './math.js'

/** Градусов поворота на пиксель перетаскивания (больше — чувствительнее). */
export const DEG_PER_PX = 0.22

/**
 * @param {HTMLElement} el
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const stage = el.querySelector('[data-ring-stage]')
  const spinner = el.querySelector('[data-ring-spinner]')
  const cards = Array.from(el.querySelectorAll('[data-ring-card]'))
  const counter = el.querySelector('[data-ring-counter]')
  const count = cards.length

  if (!stage || !spinner || count < 3) return { destroy() {} }

  const proxy = document.createElement('div')
  const step = ringStep(count)
  let rotation = 0
  let current = -1

  let radius = 0

  // Порядок «повернуть, потом выдвинуть» задаём строкой: у gsap перенос
  // всегда идёт раньше поворота, а здесь нужен обратный порядок.
  const layout = () => {
    radius = ringRadius(cards[0].offsetWidth, count, 28)
    cards.forEach((card, i) => {
      card.style.transform = `translate(-50%, -50%) rotateY(${i * step}deg) translateZ(${radius.toFixed(1)}px)`
    })
    render()
  }

  /** Применить текущий угол: поворот кольца, затемнение дальних, счётчик. */
  const render = () => {
    // Центр кольца уезжает вглубь на радиус: передняя карточка — в плоскости экрана.
    spinner.style.transform = `translateZ(${(-radius).toFixed(1)}px) rotateY(${rotation.toFixed(3)}deg)`
    cards.forEach((card, i) => card.style.setProperty('--facing', facing(i * step + rotation).toFixed(3)))

    const index = activeIndex(rotation, count)

    if (index !== current) {
      current = index
      cards.forEach((card, i) => card.classList.toggle('is-active', i === index))
      if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`
    }
  }

  /** Прочитать x прокси (его двигает Draggable или твин) и перевести в угол. */
  const fromProxy = () => {
    rotation = gsap.getProperty(proxy, 'x') * DEG_PER_PX
    render()
  }

  const goTo = (target) => {
    gsap.to(proxy, {
      x: target / DEG_PER_PX,
      duration: ctx.reduced ? 0 : 1,
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: fromProxy,
    })
  }

  const [draggable] = Draggable.create(proxy, {
    type: 'x',
    trigger: stage,
    inertia: true,
    allowContextMenu: true,
    onPress: () => gsap.killTweensOf(proxy),
    onDrag: fromProxy,
    onThrowUpdate: fromProxy,
    snap: { x: (x) => snapRotation(x * DEG_PER_PX, count) / DEG_PER_PX },
  })

  d.add(() => draggable.kill())

  const shift = (dir) => goTo(snapRotation(rotation, count) - dir * step)

  const prev = el.querySelector('[data-prev]')
  const next = el.querySelector('[data-next]')

  if (prev) d.listen(prev, 'click', () => shift(-1))
  if (next) d.listen(next, 'click', () => shift(1))
  d.listen(stage, 'keydown', (event) => {
    if (event.key === 'ArrowLeft') shift(-1)
    if (event.key === 'ArrowRight') shift(1)
  })
  // Клик по боковой карточке — повернуть её к зрителю.
  cards.forEach((card, i) => d.listen(card, 'click', () => goTo(rotationFor(i, rotation, count))))

  layout()

  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null

  observer?.observe(stage)
  d.add(() => observer?.disconnect())
  d.add(() => gsap.killTweensOf(proxy))

  return {
    goTo: (index) => goTo(rotationFor(index, rotation, count)),
    get index() {
      return current
    },
    destroy: () => d.dispose(),
  }
}
