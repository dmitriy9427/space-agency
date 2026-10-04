# manifesto

Секция с крупным абзацем и цифрами.

| Атрибут | Эффект |
| --- | --- |
| `data-reveal-words` | SplitText режет текст на слова, при прокрутке (`scrub`) они загораются с 12% до 100% непрозрачности. |
| `data-count="384"` (+ `data-prefix`, `data-suffix`) | Счётчик от 0 до значения при появлении. Число знаков после точки берётся из значения (`7.8` → 1). |
| `data-scramble` | ScrambleText расшифровывает подпись при появлении. |

`format.js` содержит чистые функции `formatCount` (разряды через тонкий пробел, знак, префикс и суффикс) и `decimalsOf`.

## Перенос в другой проект

- **Файлы:** `index.js`, `format.js` + разметка `data-reveal-words`, `data-count`, `data-scramble`.
- **GSAP:** SplitText, ScrollTrigger, ScrambleText.
- Счётчики можно использовать отдельно: это 10 строк вокруг `formatCount`.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
