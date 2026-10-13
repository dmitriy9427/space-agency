# mission

Подвал «Mission Control».

| Элемент | Плагин | Что делает |
| --- | --- | --- |
| `[data-terminal-line]` | TextPlugin | Строки лога печатаются по очереди, когда подвал появляется. |
| `[data-launch]` + `[data-countdown]` | ScrambleText | Обратный отсчёт T−05 … ПУСК. |
| `[data-sparks]` | Physics2D | На нуле разлетается салют из 46 искр (скорость, угол, гравитация). |
| кнопка | EasePack (RoughEase) | После старта кнопка дрожит. |
| `[data-marquee]` | ScrollTrigger | Бесконечная бегущая строка, скорость и направление зависят от скорости скролла. |

На нуле в шину уходит `launch` — ракета взлетает. Через `RETURN_DELAY` (1,9 с, ракета уже
за кадром) страница плавно едет наверх за `RETURN_DURATION` (3,4 с). Доехали —
`launch:arrived` (ракета садится на площадку первого экрана). Если пользователь сам крутит
колесо, ведёт пальцем или жмёт клавиши прокрутки — управление отдаётся сразу:
`launch:aborted`. При `prefers-reduced-motion` страница оказывается наверху без анимации.

`countdown.js` содержит чистые функции `formatCountdown`, `countdownSteps` и `sparkParams`.

## Перенос в другой проект

- **Файлы:** `index.js`, `countdown.js`; стили `.terminal`, `.launch*`, `.marquee*` из `sections.css`.
- **GSAP:** TextPlugin, ScrambleText, Physics2D, EasePack, ScrollTrigger.
- События `launch*` в шину — опционально: без ракеты просто никто их не слушает (прокрутка наверх работает и без неё).

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
