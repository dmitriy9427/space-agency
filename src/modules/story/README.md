# story

Закреплённая (pin) история миссии из 4 сцен.

- Секция пинится на `scenes × 100vh` прокрутки, таймлайн со `scrub: 0.8` по очереди показывает и уводит сцены `[data-scene]`, а их части `[data-scene-part]` появляются с задержкой (stagger).
- HUD: `[data-story-clock]`, `[data-story-alt]`, `[data-story-speed]` и полоса `[data-story-bar]` берут значения из `telemetry(progress)`.
- Точки `[data-story-dot]` подсвечивают текущую сцену.
- Номер сцены отправляется в шину `story:scene`. Начиная со сцены 2 ракета отстреливает ускорители.
- Переменная `--sky-mix` (0…1) на `<html>` затемняет небо страницы к орбите.

`steps.js` содержит чистые функции `stepFromProgress` и `telemetry`.

## Перенос в другой проект

- **Файлы:** `index.js`, `steps.js` + разметка `data-story-*`, `data-scene`; стили `.story*`.
- **GSAP:** ScrollTrigger (pin + scrub).
- Если ракеты нет — событие `story:scene` просто никто не слушает. `--sky-mix` уберите, если нет фона-неба.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
