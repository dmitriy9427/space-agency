/**
 * Единая точка входа в GSAP для всего проекта.
 *
 * ─── Зачем отдельный файл ──────────────────────────────────────────────────
 * Плагин GSAP нужно один раз «зарегистрировать» (`gsap.registerPlugin`),
 * иначе свойства вроде `scrollTrigger`, `drawSVG`, `morphSVG` в твинах
 * просто не сработают — без ошибок, что очень сбивает с толку.
 * Если каждый модуль будет регистрировать плагины сам, легко забыть.
 * Поэтому: регистрируем ВСЁ здесь, а остальной код импортирует GSAP и
 * плагины ТОЛЬКО отсюда:
 *
 *   import { gsap, Flip } from '../../core/gsap.js'   // ✓
 *   import { gsap } from 'gsap'                        // ✗ плагины могут быть не зарегистрированы
 *
 * Бонус: в тестах этот файл можно подменить (vi.mock) одним местом.
 *
 * ─── Лицензия ──────────────────────────────────────────────────────────────
 * С версии 3.13 (2025) GSAP и все плагины бесплатны, в том числе для
 * коммерческих проектов, и лежат в обычном пакете `gsap` (npm i gsap).
 * Раньше часть плагинов (SplitText, MorphSVG, ScrollSmoother…) была платной
 * («Club GSAP») — в старых статьях это упоминается, сейчас неактуально.
 *
 * ─── Что делает каждый плагин ───────────────────────────────────────────────
 * Подробно, с примерами и местами в проекте — docs/03-gsap-plugins.md.
 * @module core/gsap
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger' // анимации от скролла, закрепление (pin)
import { ScrollSmoother } from 'gsap/ScrollSmoother' // плавный скролл, параллакс data-speed
import { ScrollToPlugin } from 'gsap/ScrollToPlugin' // плавная прокрутка к якорю
import { SplitText } from 'gsap/SplitText' // разрезать текст на буквы/слова/строки
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin' // «расшифровка» текста
import { TextPlugin } from 'gsap/TextPlugin' // печать текста по буквам
import { Draggable } from 'gsap/Draggable' // перетаскивание
import { InertiaPlugin } from 'gsap/InertiaPlugin' // инерция после броска + доводка (snap)
import { Observer } from 'gsap/Observer' // единое API для мыши, пальца, колеса
import { Flip } from 'gsap/Flip' // анимация переноса/перестройки элементов
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin' // прорисовка линий SVG
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin' // перетекание SVG-фигур
import { MotionPathPlugin } from 'gsap/MotionPathPlugin' // движение по кривой
import { Physics2DPlugin } from 'gsap/Physics2DPlugin' // полёт по физике (скорость, угол, гравитация)
import { CustomEase } from 'gsap/CustomEase' // свои кривые сглаживания
import { EasePack } from 'gsap/EasePack' // RoughEase («дрожь»), SlowMo, ExpoScaleEase

gsap.registerPlugin(
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  SplitText,
  ScrambleTextPlugin,
  TextPlugin,
  Draggable,
  InertiaPlugin,
  Observer,
  Flip,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Physics2DPlugin,
  CustomEase,
  EasePack,
)

/**
 * Своя кривая «взлёт»: медленный старт, резкий разгон, мягкий финиш.
 * После регистрации её можно использовать по имени, как встроенную:
 * `gsap.to(el, { x: 100, ease: 'liftoff' })`. Используется в лайтбоксе архива.
 * Строка — это SVG-путь кривой от (0,0) до (1,1); удобно нарисовать её в
 * визуальном редакторе на gsap.com/docs/v3/Eases/CustomEase и скопировать.
 */
CustomEase.create('liftoff', 'M0,0 C0.7,0 0.1,1 1,1')

export {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  SplitText,
  ScrambleTextPlugin,
  TextPlugin,
  Draggable,
  InertiaPlugin,
  Observer,
  Flip,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Physics2DPlugin,
  CustomEase,
  EasePack,
}
