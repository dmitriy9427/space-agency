/**
 * Манифест: абзац, который «загорается» по словам, и счётчики-цифры.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * - Крупный абзац сначала почти прозрачный; пока вы прокручиваете, слова
 *   по очереди загораются — читаешь в темпе прокрутки.
 * - Цифры «384+», «7.8 км/с», «1 204» отсчитываются от нуля, когда
 *   появляются на экране (один раз).
 * - Подписи над цифрами «расшифровываются» из символов 0, 1, <, >, /, #.
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * Слова: SplitText (type: 'words') → массив <div>-слов → один твин
 * opacity 0.12 → 1 со stagger и scrollTrigger + scrub. Stagger внутри
 * scrub распределяет слова по пути прокрутки: каждое загорается на своём
 * отрезке.
 *
 * Счётчики: анимируем не текст, а обычный объект `{ value: 0 }` — GSAP умеет
 * анимировать любые числовые свойства любых объектов. На каждом кадре
 * (onUpdate) пишем число в текст через formatCount (разряды через тонкий
 * пробел, нужное число знаков после запятой). Этот приём — «анимировать
 * объект-посредник» — пригодится везде, где значение нельзя анимировать
 * напрямую.
 *
 * ─── Разметка ────────────────────────────────────────────────────────────────
 *   <p data-reveal-words>…</p>
 *   <dd data-count="384" data-suffix="+">0</dd>   (+ data-prefix)
 *   <dt data-scramble>Запусков</dt>
 * Число знаков после запятой берётся из значения: data-count="7.8" → 1 знак.
 * @module manifesto
 */
import { gsap, SplitText, ScrollTrigger } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'
import { decimalsOf, formatCount } from './format.js'

/**
 * @param {HTMLElement} el
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()

  const g = gsap.context(() => {
    // --- слова загораются по прокрутке ----------------------------------------------
    el.querySelectorAll('[data-reveal-words]').forEach((text) => {
      if (ctx.reduced) return

      const split = SplitText.create(text, { type: 'words' })

      gsap.fromTo(
        split.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          // От «верх абзаца на 78% высоты экрана» до «низ абзаца на середине».
          scrollTrigger: { trigger: text, start: 'top 78%', end: 'bottom 50%', scrub: true },
        },
      )
    })

    // --- счётчики -----------------------------------------------------------------------
    el.querySelectorAll('[data-count]').forEach((counter) => {
      const raw = counter.dataset.count
      const target = Number(raw)
      const options = {
        decimals: decimalsOf(raw),
        prefix: counter.dataset.prefix ?? '',
        suffix: counter.dataset.suffix ?? '',
      }
      const state = { value: 0 } // объект-посредник, его и анимируем
      const write = () => (counter.textContent = formatCount(state.value, options))

      // Без анимаций — сразу итоговое число.
      if (ctx.reduced) {
        state.value = target
        write()
        return
      }

      write()
      // once: true — сработать один раз и удалить триггер.
      ScrollTrigger.create({
        trigger: counter,
        start: 'top 85%',
        once: true,
        onEnter: () => gsap.to(state, { value: target, duration: 2.2, ease: 'power3.out', onUpdate: write }),
      })
    })

    // --- подписи «расшифровываются» ------------------------------------------------------
    el.querySelectorAll('[data-scramble]').forEach((label) => {
      if (ctx.reduced) return

      gsap.from(label, {
        duration: 1.2,
        scrambleText: { text: label.textContent, chars: '01<>/#', revealDelay: 0.2 },
        scrollTrigger: { trigger: label, start: 'top 85%', once: true },
      })
    })
  }, el)

  d.add(() => g.revert())
  return { destroy: () => d.dispose() }
}
