/**
 * Слайдер №6 — шейдерный переход на всю ширину экрана.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Фото во всю ширину. Потяните его мышью влево/вправо или вверх/вниз —
 * старая картинка «уезжает» вслед за рукой, а под ней с рваной светящейся
 * границей открывается следующая (или предыдущая). Отпустили на полпути —
 * переход доезжает сам или откатывается. Кнопки и стрелки клавиатуры
 * (←→↑↓) делают то же самое. Заголовок меняется по буквам (SplitText).
 *
 * ─── Как это устроено ─────────────────────────────────────────────────────
 * Состояние перехода — три числа: какой слайд сейчас (`index`), какой
 * открываем (`target`) и прогресс 0…1 (`transition.progress`). Плюс
 * направление (`intent`, см. DIRECTIONS в logic.js).
 *
 *   жест / кнопка ──► prepare(target, направление) ──► progress 0…1 ──► шейдер
 *                                                     (рукой или твином)
 *   progress дошёл до 1 ──► finish(): index = target, подписи, сброс в 0
 *
 * Шейдер рисует кадр, только когда что-то изменилось (флаг `dirty`) и
 * слайдер на экране — в покое видеокарта не работает.
 *
 * Без WebGL слайды — обычные <img>, и переход делается простым
 * кроссфейдом (прозрачностью).
 *
 * ─── Настройки ──────────────────────────────────────────────────────────────
 * ACCENTS — цвета канта; DRAG_DISTANCE — какую долю экрана протянуть для
 * полного перехода; длительность — в animateTo; порог «довести или откатить» —
 * shouldComplete в logic.js.
 *
 * Телефон: листание только горизонтальными свайпами (lockAxis + проверка оси),
 * у сцены touch-action: pan-y — вертикальный свайп прокручивает страницу.
 * @module sliders/shader
 */
import { gsap, Observer, SplitText } from '../../../core/gsap.js'
import { isCoarsePointer, supportsWebGL } from '../../../core/env.js'
import { createDisposer, onViewport } from '../../../core/lifecycle.js'
import { loadImage } from '../../../core/media.js'
import { DIRECTIONS, dragIntent, keyIntent, neighbour, shouldComplete } from './logic.js'

/** Цвета светящегося канта на границе перехода — по кругу для каждого слайда. */
export const ACCENTS = ['#ff5b2e', '#5ee6ff', '#b05bff', '#ffd23d', '#3dffd2']
/** Какую долю ширины/высоты сцены нужно протянуть для полного перехода. */
export const DRAG_DISTANCE = 0.6

/**
 * @param {HTMLElement} el Корень слайдера (`[data-module="shader"]`).
 * @param {{ reduced: boolean, quality: object }} ctx
 */
export async function init(el, ctx) {
  const d = createDisposer()
  const stage = el.querySelector('[data-shader-stage]')
  const slides = Array.from(el.querySelectorAll('[data-shader-slide]'))
  const title = el.querySelector('[data-shader-title]')
  const text = el.querySelector('[data-shader-text]')
  const counter = el.querySelector('[data-shader-counter]')
  const count = slides.length

  if (!stage || count < 2) return { destroy() {} }

  // --- WebGL (или запасной вариант) --------------------------------------------
  let gl = null

  if (supportsWebGL()) {
    // Картинки должны быть ЗАГРУЖЕНЫ до создания текстур, иначе текстура пустая.
    const sources = slides.map((slide) => {
      const image = slide.querySelector('img')

      return image?.currentSrc || image?.src
    })
    // three.js и сцена грузятся отдельным файлом (динамический import) —
    // параллельно с картинками.
    const [{ createShaderRenderer }, images] = await Promise.all([
      import('./shader.scene.js'),
      Promise.all(sources.map(loadImage)),
    ])

    gl = createShaderRenderer(stage, images, ctx.quality)
    // Класс прячет DOM-слайды (их заменяет canvas), см. .shader-slider.is-gl в CSS.
    el.classList.add('is-gl')
    d.add(() => {
      gl.dispose()
      el.classList.remove('is-gl')
    })
  } else {
    slides.forEach((slide, i) => gsap.set(slide, { autoAlpha: i === 0 ? 1 : 0 }))
  }

  // --- состояние ------------------------------------------------------------------
  let index = 0 // какой слайд показан
  let target = 0 // какой открываем (равен index, когда перехода нет)
  let intent = DIRECTIONS['next-x'] // { step, dir } — куда и как
  const transition = { progress: 0 } // объект, чтобы его мог анимировать gsap.to
  let tween = null
  let dirty = true // нужно ли перерисовать кадр
  let inView = false
  let split = null
  let labelIndex = -1 // для какого слайда сейчас показаны подписи

  const accentOf = (i) => ACCENTS[i % ACCENTS.length]

  /**
   * Подписи слайда: счётчик, текст, заголовок по буквам.
   * Вызывается В МОМЕНТ переключения (нажали кнопку или отпустили жест так,
   * что переход доедет), а не после окончания перехода — иначе текст
   * отставал бы от картинки на полторы секунды.
   */
  const writeLabels = (i) => {
    if (i === labelIndex) return
    labelIndex = i

    const slide = slides[i]

    if (counter) counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`
    if (text) text.textContent = slide.dataset.text ?? ''
    if (!title) return
    // Прошлую нарезку обязательно откатываем, иначе буквы «вложатся» друг в друга.
    split?.revert()
    title.textContent = slide.dataset.title ?? ''
    if (ctx.reduced) return
    // 'words, chars': сначала слова, потом буквы внутри. Если резать только на
    // буквы, каждая становится отдельным inline-block, и браузер переносит
    // строку посреди слова («КИ / ЛЯ»). Слово-обёртка не даёт его разорвать.
    split = SplitText.create(title, { type: 'words, chars', mask: 'chars' })
    gsap.from(split.chars, { yPercent: 110, duration: 0.7, stagger: 0.025, ease: 'expo.out' })
  }

  /** Передать текущий прогресс в шейдер (или в прозрачность слайдов без WebGL). */
  const apply = () => {
    dirty = true
    if (gl) gl.setProgress(transition.progress, intent.dir)
    else {
      gsap.set(slides[index], { autoAlpha: 1 - transition.progress })
      gsap.set(slides[target], { autoAlpha: transition.progress })
    }
  }

  /** Начать переход в направлении `key` (например, 'next-y'). */
  const prepare = (key) => {
    intent = DIRECTIONS[key]
    target = neighbour(index, intent.step, count)
    if (gl) {
      gl.setPair(index, target)
      gl.setAccent(accentOf(target))
    }
  }

  /** Переход завершён: новая картинка становится «текущей». */
  const finish = () => {
    index = target
    transition.progress = 0
    if (gl) gl.setPair(index, index)
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index))
    apply()
    writeLabels(index) // обычно уже показаны (см. go и onRelease) — тогда ничего не делает
  }

  /** Анимировать прогресс до `value` (1 — довести, 0 — откатить). */
  const animateTo = (value, onComplete) => {
    tween?.kill()
    tween = gsap.to(transition, {
      progress: value,
      // Чем больше осталось пройти, тем дольше: доводка с 0.9 до 1 не тянется секунду.
      duration: ctx.reduced ? 0 : 1.3 * Math.abs(value - transition.progress) + 0.2,
      ease: 'power2.inOut',
      onUpdate: apply,
      onComplete,
    })
  }

  /** Перейти по направлению (кнопки и клавиши). Во время перехода — игнорируем. */
  const go = (key) => {
    if (animating() || !DIRECTIONS[key]) return
    prepare(key)
    writeLabels(target) // текст меняется сразу, вместе с началом перехода
    animateTo(1, finish)
  }

  // --- перетаскивание мышью/пальцем ---------------------------------------------
  // Observer сообщает дельты жеста; lockAxis — после первых пикселей ось
  // фиксируется (начал тянуть вбок — вертикальная составляющая игнорируется).
  let dragX = 0
  let dragY = 0
  // Жест, начатый во время анимации перехода, игнорируется ЦЕЛИКОМ (до отпускания):
  // иначе нажатие прерывало бы переход, и слайд откатывался назад.
  let ignoreGesture = false
  /** Идёт ли анимация перехода (доводка или откат). */
  const animating = () => !!tween?.isActive()
  const touchOnly = isCoarsePointer()
  const observer = Observer.create({
    target: stage,
    type: 'pointer,touch',
    dragMinimum: 4,
    lockAxis: true,
    onPress: () => {
      ignoreGesture = animating()
      dragX = 0
      dragY = 0
    },
    onDrag: (self) => {
      if (ignoreGesture) return
      // Палец: вертикальный жест — это прокрутка страницы, не листание.
      if (touchOnly && self.axis === 'y') return
      dragX += self.deltaX
      dragY += self.deltaY

      const drag = dragIntent(dragX, dragY, stage.clientWidth * DRAG_DISTANCE, stage.clientHeight * DRAG_DISTANCE, self.axis)

      if (!drag.key) return
      // Направление поменялось (тянули влево, повели вправо) — готовим другой слайд.
      if (DIRECTIONS[drag.key] !== intent || target === index) prepare(drag.key)
      transition.progress = drag.progress
      apply()
    },
    onRelease: (self) => {
      if (ignoreGesture) {
        ignoreGesture = false
        return
      }
      if (target === index || !transition.progress) return

      const velocity = self.axis === 'y' ? self.velocityY : self.velocityX

      if (shouldComplete(transition.progress, velocity)) {
        writeLabels(target) // решено: доводим — меняем текст сразу
        animateTo(1, finish)
      } else animateTo(0)
    },
  })

  d.add(() => observer.kill())

  // Курсор над сценой — лёгкий параллакс картинки.
  d.listen(
    stage,
    'pointermove',
    (event) => {
      if (!gl) return
      const rect = stage.getBoundingClientRect()

      gl.setMouse((event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height)
      dirty = true
    },
    { passive: true },
  )

  // --- кнопки и клавиатура ---------------------------------------------------------
  const prev = el.querySelector('[data-prev]')
  const next = el.querySelector('[data-next]')

  if (prev) d.listen(prev, 'click', () => go('prev-x'))
  if (next) d.listen(next, 'click', () => go('next-x'))
  d.listen(stage, 'keydown', (event) => {
    const key = keyIntent(event.key)

    if (!key) return
    event.preventDefault() // стрелки не должны прокручивать страницу, пока фокус на слайдере
    go(key)
  })

  // --- цикл отрисовки и размеры -----------------------------------------------------
  if (gl) {
    const resize = () => {
      gl.resize(stage.clientWidth, stage.clientHeight)
      dirty = true
    }
    // Рисуем только если слайдер на экране И что-то поменялось с прошлого кадра.
    const tick = (time) => {
      if (!inView || !dirty) return
      gl.render(time)
      dirty = false
    }
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null

    resizeObserver?.observe(stage)
    d.add(() => resizeObserver?.disconnect())
    resize()
    gsap.ticker.add(tick)
    d.add(() => gsap.ticker.remove(tick))
  }

  d.add(onViewport(el, { rootMargin: '200px', enter: () => ((inView = true), (dirty = true)), leave: () => (inView = false) }))
  d.add(() => tween?.kill())
  d.add(() => split?.revert())

  // Стартовое состояние: первый слайд, подписи.
  prepare('next-x')
  target = 0
  finish()

  return {
    /** Перейти: 'next-x' | 'prev-x' | 'next-y' | 'prev-y'. */
    go,
    get index() {
      return index
    },
    destroy: () => d.dispose(),
  }
}
