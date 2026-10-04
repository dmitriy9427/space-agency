/**
 * Первый экран главной.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * 1. Заголовок «ВЫШЕ ШУМА» собирается по буквам: каждая буква выезжает
 *    снизу из-под невидимой «маски» с лёгким поворотом, волной слева направо.
 * 2. Надпись над заголовком «расшифровывается» из случайных букв.
 * 3. Подзаголовок и кнопки плавно проявляются.
 * 4. При прокрутке весь блок уезжает вверх медленнее страницы и гаснет
 *    (параллакс), а подсказка «прокрутите» мягко покачивается.
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * SplitText режет заголовок на буквы (`chars`) и слова (`words` — чтобы
 * браузер не переносил строку посреди слова). `mask: 'chars'` оборачивает
 * каждую букву в контейнер с overflow: clip — буква, сдвинутая вниз на 115%,
 * полностью спрятана, и при анимации «выезжает из щели».
 *
 * Всё создаётся внутри `gsap.context(…, el)`: тогда `g.revert()` в destroy
 * откатывает и анимации, и ScrollTrigger, и нарезку SplitText — HTML
 * возвращается в исходный вид (это проверяет тест index.test.js).
 *
 * ─── Разметка ────────────────────────────────────────────────────────────────
 *   [data-hero-title]    — заголовок (режется на буквы)
 *   [data-hero-eyebrow]  — надпись над заголовком (ScrambleText)
 *   [data-hero-fade]     — подзаголовок, кнопки (проявляются)
 *   [data-hero-parallax] — то, что уезжает при прокрутке
 *   [data-hero-hint]     — подсказка «прокрутите» (покачивается)
 *
 * ─── Настройки ──────────────────────────────────────────────────────────────
 * Скорость волны букв — stagger.each; «высота» вылета — yPercent; сила
 * параллакса — yPercent: -35 у твина со scrollTrigger.
 * При reduced motion анимаций нет — страница показывается как есть.
 * @module hero
 */
import { gsap, SplitText } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'

/**
 * @param {HTMLElement} el Секция `[data-module="hero"]`.
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const title = el.querySelector('[data-hero-title]')
  const eyebrow = el.querySelector('[data-hero-eyebrow]')
  const fades = el.querySelectorAll('[data-hero-fade]')

  const g = gsap.context(() => {
    if (ctx.reduced) return

    const split = title && SplitText.create(title, { type: 'chars, words', mask: 'chars', charsClass: 'hero__char' })
    // Таймлайн интро: все шаги по расписанию. defaults — общие настройки для всех твинов внутри.
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.2 })

    if (split) {
      intro.from(split.chars, {
        yPercent: 115, // из-под «пола» маски
        rotate: 12,
        duration: 1.4,
        stagger: { each: 0.035, from: 'start' }, // каждая следующая буква на 35 мс позже
      })
    }
    if (eyebrow) {
      // Третий аргумент 0 — начать в момент 0 таймлайна, одновременно с буквами.
      intro.from(eyebrow, { duration: 1.4, scrambleText: { text: eyebrow.textContent, chars: 'upperCase', speed: 0.6 } }, 0)
    }
    intro.from(fades, { y: 30, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.6)

    // Уход при прокрутке: от «верх секции у верха экрана» до «низ секции у верха экрана».
    // scrub: true — прогресс твина = прогресс прокрутки (крутите назад — блок возвращается).
    gsap.to('[data-hero-parallax]', {
      yPercent: -35,
      autoAlpha: 0.15, // autoAlpha = opacity + visibility: hidden при 0 (элемент не ловит клики)
      ease: 'none', // при scrub почти всегда 'none': скорость задаёт сам скролл
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
    })

    // Подсказка покачивается бесконечно: repeat: -1 + yoyo (туда-обратно).
    gsap.to('[data-hero-hint]', { y: 8, repeat: -1, yoyo: true, duration: 1.1, ease: 'sine.inOut' })
  }, el) // второй аргумент — область: селекторы вроде '[data-hero-hint]' ищутся только внутри el

  d.add(() => g.revert())
  return { destroy: () => d.dispose() }
}
