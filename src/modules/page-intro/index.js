/**
 * Интро страницы: заголовок появляется по СТРОКАМ из-под «маски».
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Каждая строка заголовка выезжает снизу, как будто из щели, со сдвигом
 * по времени (stagger). Надпись над заголовком «расшифровывается», а
 * подзаголовок и прочее плавно проявляются.
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * SplitText с `type: 'lines'` режет текст на строки ТАК, КАК ИХ ПЕРЕНЁС
 * БРАУЗЕР при текущей ширине, а `mask: 'lines'` оборачивает каждую строку
 * в контейнер с overflow: clip. Строку сдвигаем вниз на 100% её высоты —
 * она полностью прячется под «полом» маски — и анимируем обратно в 0.
 *
 * `autoSplit: true` — если ширина окна изменится и строки перенесутся
 * иначе, SplitText разрежет текст заново и вызовет onSplit ещё раз
 * (анимация, которую мы возвращаем из onSplit, корректно заменится).
 *
 * ─── Разметка ────────────────────────────────────────────────────────────────
 *   <header data-module="page-intro">
 *     <p data-intro-eyebrow>…</p>
 *     <h1 data-intro-lines>Длинный заголовок в несколько строк</h1>
 *     <p data-intro-fade>…</p>
 *   </header>
 * @module page-intro
 */
import { gsap, SplitText } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'

/**
 * @param {HTMLElement} el
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()

  if (ctx.reduced) return { destroy() {} }

  const g = gsap.context(() => {
    const eyebrow = el.querySelector('[data-intro-eyebrow]')

    el.querySelectorAll('[data-intro-lines]').forEach((title) => {
      SplitText.create(title, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        // onSplit вызывается при первой нарезке и при каждой повторной (autoSplit).
        onSplit: (self) =>
          gsap.from(self.lines, { yPercent: 105, duration: 1.1, stagger: 0.12, ease: 'expo.out', delay: 0.15 }),
      })
    })

    if (eyebrow) {
      gsap.from(eyebrow, { duration: 1.2, scrambleText: { text: eyebrow.textContent, chars: 'upperCase', speed: 0.6 } })
    }
    gsap.from(el.querySelectorAll('[data-intro-fade]'), { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1, delay: 0.5, ease: 'power3.out' })
  }, el)

  d.add(() => g.revert())
  return { destroy: () => d.dispose() }
}
