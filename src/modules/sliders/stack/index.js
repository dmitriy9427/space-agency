/**
 * Слайдер №2 — стопка карточек «как в Tinder».
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Карточки лежат стопкой. Верхнюю можно схватить и потянуть: она едет за
 * рукой и наклоняется. Отпустили далеко или резко — карточка улетает в ту
 * сторону, куда её бросили, и тихо ложится под низ стопки. Не дотянули —
 * упруго возвращается на место.
 *
 * Правило: КАРТОЧКА ВСЕГДА ДВИЖЕТСЯ ПО НАПРАВЛЕНИЮ ДЕЙСТВИЯ.
 *   - Потянули вправо → карточка улетела вправо.
 *   - Нажали ← → карточка, ушедшая вправо, возвращается справа, двигаясь
 *     влево (движение «влево» вернуло её). Нажали ← ещё раз — возвращать
 *     больше нечего (последняя ушла не вправо), и верхняя карточка
 *     улетает влево.
 *   - С → всё зеркально.
 * Для этого модуль помнит историю ушедших карточек и сторону ухода
 * (createExitHistory в state.js), а решение «вернуть или бросить» принимает
 * чистая функция pressAction.
 *
 * ─── Как устроено ─────────────────────────────────────────────────────────
 * Порядок карточек хранит чистая логика (state.js → createStack): кто
 * сверху, кто под ним. Поза каждой карточки (сдвиг вниз, уменьшение, лёгкий
 * поворот) зависит только от глубины в стопке — stackPose(depth).
 * После любого изменения порядка `layout()` плавно ставит все карточки в
 * позы своей глубины.
 *
 * Анимации ухода и прилёта — через `fromTo` (явно «откуда» и «куда»),
 * перед ними `killTweensOf` — так на карточку никогда не действуют два
 * твина сразу. Пока идёт анимация (`busy`), новые нажатия игнорируются.
 *
 * МОБИЛКА: у колоды touch-action: none (sliders.css) — пальцем нельзя
 * прокрутить страницу, начав жест на стопке. См. docs/11-mobile.md.
 * @module sliders/stack
 */
import { gsap, Draggable } from '../../../core/gsap.js'
import { createDisposer } from '../../../core/lifecycle.js'
import { createExitHistory, createStack, createVelocityTracker, pressAction, stackPose, swipeDecision } from './state.js'
/** Длительности, секунды. */
export const FLY_DURATION = 0.5
export const ARRIVE_DURATION = 0.7

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
  // Помним не больше «карточек − 1»: сверху всегда должна остаться хотя бы одна.
  const history = createExitHistory(cards.length - 1)
  const time = (seconds) => (ctx.reduced ? 0 : seconds)
  let busy = false

  if (cards.length < 2) return { destroy() {} }

  /** Счётчик «02 / 06» по верхней карточке. */
  const writeCounter = () => {
    if (counter) counter.textContent = `${String(stack.top + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`
  }

  /**
   * Поставить все карточки (кроме `skip`) в позы их глубины и включить
   * перетаскивание только у верхней.
   */
  const layout = ({ immediate = false, skip = null } = {}) => {
    cards.forEach((card, i) => {
      if (card === skip) return
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
    history.push(card, direction)
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

  /**
   * Вернуть последнюю ушедшую карточку. Она прилетает С ТОЙ СТОРОНЫ, куда
   * ушла (`side`), и движется в противоположную — по направлению нажатой стрелки.
   */
  const bringBack = (side) => {
    busy = true
    history.pop()

    // Ушедшие карточки ложатся под низ, поэтому последняя ушедшая — самая нижняя.
    const card = cards[stack.prev()]
    const from = side * card.offsetWidth * 1.4

    gsap.killTweensOf(card)
    // Сначала — остальные карточки на новые (более глубокие) места.
    layout({ skip: card })
    // Прилетающая: поверх всех, из-за края, с поворотом — в позу верхней.
    gsap.fromTo(
      card,
      { x: from, y: 0, rotation: side * 24, autoAlpha: 0, zIndex: cards.length + 1 },
      {
        ...stackPose(0, cards.length),
        x: 0,
        autoAlpha: 1,
        duration: time(ARRIVE_DURATION),
        ease: 'power3.out',
        onComplete: () => {
          gsap.set(card, { zIndex: cards.length }) // обычный z-index верхней
          syncDraggable(card)
          busy = false
        },
      },
    )
  }

  /**
   * Нажатие стрелки в сторону `direction` (1 → вправо, −1 ← влево):
   * вернуть карточку, ушедшую в противоположную сторону, или бросить верхнюю.
   */
  const press = (direction) => {
    if (busy) return
    const last = history.peek()

    if (pressAction(direction, last) === 'return') bringBack(last.side)
    else flyAway(cards[stack.top], direction)
  }

  const next = () => press(1)
  const prev = () => press(-1)

  // --- перетаскивание: Draggable на каждой карточке, включён только у верхней ----
  const draggables = cards.map((card) =>
    Draggable.create(card, {
      type: 'x,y',
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
