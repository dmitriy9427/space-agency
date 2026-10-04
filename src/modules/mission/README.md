# mission

Подвал «Mission Control».

| Элемент | Плагин | Что делает |
| --- | --- | --- |
| `[data-terminal-line]` | TextPlugin | Строки лога печатаются по очереди, когда подвал появляется. |
| `[data-launch]` + `[data-countdown]` | ScrambleText | Обратный отсчёт T−05 … ПУСК. |
| `[data-sparks]` | Physics2D | На нуле разлетается салют из 46 искр (скорость, угол, гравитация). |
| кнопка | EasePack (RoughEase) | После старта кнопка дрожит. |
| `[data-marquee]` | ScrollTrigger | Бесконечная бегущая строка, скорость и направление зависят от скорости скролла. |

На нуле в шину уходит `launch`, ракета даёт всплеск тяги.

`countdown.js` содержит чистые функции `formatCountdown`, `countdownSteps` и `sparkParams`.

## Перенос в другой проект

- **Файлы:** `index.js`, `countdown.js`; стили `.terminal`, `.launch*`, `.marquee*` из `sections.css`.
- **GSAP:** TextPlugin, ScrambleText, Physics2D, EasePack, ScrollTrigger.
- Событие `launch` в шину — опционально: без ракеты просто никто его не слушает.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
