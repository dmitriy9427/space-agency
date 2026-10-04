# hero

Первый экран.

- `[data-hero-title]` → SplitText по буквам с маской, буквы выезжают снизу с поворотом.
- `[data-hero-eyebrow]` → ScrambleText расшифровывает надпись над заголовком.
- `[data-hero-fade]` → плавное появление (подзаголовок, кнопки).
- `[data-hero-parallax]` → уезжает вверх и гаснет при прокрутке первого экрана (ScrollTrigger + scrub).
- `[data-hero-hint]` → пульсирующая подсказка «прокрутите».

При `prefers-reduced-motion` анимаций нет, разметка показывается как есть.
Всё собрано в `gsap.context`, поэтому `destroy()` возвращает DOM в исходное состояние (SplitText тоже откатывается).

## Перенос в другой проект

- **Файлы:** `index.js` + разметка с атрибутами `data-hero-*`; стили `.hero*` из `sections.css`.
- **GSAP:** SplitText, ScrambleText, ScrollTrigger.
- Режьте текст после загрузки шрифтов (`document.fonts.ready`), иначе ширина букв будет от запасного шрифта.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
