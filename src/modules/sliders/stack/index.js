/**
 * Слайдер №2 — стопка карточек «как в Tinder».
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Карточки лежат стопкой. Верхнюю можно схватить и потянуть: она едет за
 * рукой и наклоняется. Отпустили далеко или резко — карточка улетает в ту
 * сторону, куда её бросили, и тихо ложится под низ стопки. Не дотянули —
 * упруго возвращается на место.
 *
 * Правило: КАРТОЧКА ВСЕГДА УЛЕТАЕТ ПО НАПРАВЛЕНИЮ ДЕЙСТВИЯ — и у жеста, и
 * у кнопок. Потянули или нажали → — верхняя улетела вправо; ← — влево.
 * Возвратов нет: ушедшая карточка ложится под низ и снова окажется сверху,
 * когда до неё дойдёт очередь.
 *
 * ─── Как устроено ─────────────────────────────────────────────────────────
 * Порядок карточек хранит чистая логика (state.js → createStack): кто
 * сверху, кто под ним. Поза каждой карточки (сдвиг вниз, уменьшение, лёгкий
 * поворот) зависит только от глубины в стопке — stackPose(depth).
 * После любого изменения порядка `layout()` плавно ставит все карточки в
 * позы своей глубины.
 *
 * Перед анимацией ухода — `killTweensOf`: на карточку никогда не действуют
 * два твина сразу. Пока идёт анимация (`busy`), новые нажатия игнорируются.
 *
 * Телефон: карточка тянется только по горизонтали (type 'x'), а у колоды
 * touch-action: pan-y — вертикальный жест остаётся прокруткой страницы.
 * @module sliders/stack
 */
import { gsap, Draggable } from '../../../core/gsap.js'
import { isCoarsePointer } from '../../../core/env.js'
import { createDisposer } from '../../../core/lifecycle.js'
import { createStack, createVelocityTracker, stackPose, swipeDecision } from './state.js'
/** Длительность ухода карточки, секунды. */
export const FLY_DURATION = 0.5

/**
 * @param {HTMLElement} el Корень (`[data-module="stack"]`).
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const cards = Array.from(el.querySelectorAll('[data-stack-card]'))
  const counter = el.querySelector('[data-stack-counter]')
  const stack = createStack(cards.length)
  const tracker = createVelocityTracker()
  const time = (seconds) => (ctx.reduced ? 0 : seconds)
  let busy = false

  if (cards.length < 2) return { destroy() {} }

  /** Счётчик «02 / 06» по верхней карточке. */
  const writeCounter = () => {
    if (counter) counter.textContent = `${String(stack.top + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`
  }

  /**
   * Поставить все карточки в позы их глубины и включить перетаскивание
   * только у верхней.
   */
  const layout = ({ immediate = false } = {}) => {
    cards.forEach((card, i) => {
      gsap.to(card, {
        ...stackPose(stack.depthOf(i), cards.length),
        x: 0,
        duration: immediate ? 0 : time(0.6),
        ease: 'power3.out',
        overwrite: 'auto',
      })
    })
    draggables.forEach((draggable, i) => (i === stack.top ? draggable.enable() : draggable.disable()))
    writeCounter()
  }

  /** Синхронизировать Draggable с реальным положением карточки после анимации. */
  const syncDraggable = (card) => draggables[cards.indexOf(card)]?.update()

  /**
   * Верхняя карточка улетает в сторону `direction` (1 — вправо, −1 — влево)
   * и ложится под низ стопки.
   * @param {number} [vy] Вертикальная скорость броска — карточка чуть уходит вверх/вниз.
   */
  const flyAway = (card, direction, vy = 0) => {
    busy = true
    gsap.killTweensOf(card)
    gsap.to(card, {
      x: direction * card.offsetWidth * 1.6,
      y: `+=${vy * 0.15}`,
      rotation: direction * 28,
      duration: time(FLY_DURATION),
      ease: 'power2.in',
      onComplete: () => {
        stack.next()
        // Под низ — незаметно (прозрачной), затем стопка подтягивается вверх.
        gsap.set(card, { x: 0, ...stackPose(cards.length - 1, cards.length), autoAlpha: 0 })
        syncDraggable(card)
        layout()
        busy = false
      },
    })
  }

  /** Нажатие стрелки: верхняя карточка улетает в сторону `direction` (1 → вправо, −1 ← влево). */
  const press = (direction) => {
    if (busy) return
    flyAway(cards[stack.top], direction)
  }

  const next = () => press(1)
  const prev = () => press(-1)

  // --- перетаскивание: Draggable на каждой карточке, включён только у верхней ----
  const draggables = cards.map((card) =>
    Draggable.create(card, {
      // Палец: только вбок — вертикальный свайп прокручивает страницу.
      type: isCoarsePointer() ? 'x' : 'x,y',
      zIndexBoost: false, // z-index управляем сами (поза стопки)
      onPress() {
        if (busy) return
        tracker.reset()
        tracker.push(this.x, performance.now())
      },
      onDrag() {
        tracker.push(this.x, performance.now())
        // Наклон за рукой: чем дальше утащили вбок, тем сильнее.
        gsap.set(card, { rotation: this.x * 0.06 })
      },
      onRelease() {
        if (busy) return
        // Смахнуть (по расстоянию или скорости броска) или вернуть — state.js.
        const direction = swipeDecision(this.x, tracker.velocity, card.offsetWidth)

        if (direction) flyAway(card, direction, this.y)
        else {
          gsap.to(card, {
            x: 0,
            y: stackPose(0, cards.length).y,
            rotation: 0,
            duration: time(0.8),
            ease: 'elastic.out(1, 0.5)', // упругое возвращение
            onComplete: () => syncDraggable(card),
          })
        }
      },
    })[0],
  )

  d.add(() => draggables.forEach((draggable) => draggable.kill()))

  // --- кнопки и клавиатура ------------------------------------------------------------
  const prevButton = el.querySelector('[data-prev]')
  const nextButton = el.querySelector('[data-next]')

  if (prevButton) d.listen(prevButton, 'click', prev)
  if (nextButton) d.listen(nextButton, 'click', next)
  d.listen(el, 'keydown', (event) => {
    if (event.key === 'ArrowRight') next()
    if (event.key === 'ArrowLeft') prev()
  })

  layout({ immediate: true })
  d.add(() => gsap.killTweensOf(cards))

  return {
    next,
    prev,
    get order() {
      return stack.order
    },
    get busy() {
      return busy
    },
    destroy: () => d.dispose(),
  }
}
