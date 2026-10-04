# sliders/ring — 3D-кольцо

Карточки стоят по окружности в CSS 3D (`preserve-3d`), кольцо вращается.

- **Перетаскивание**: Draggable на невидимом прокси (`type: 'x'`), `trigger` — сцена. Поворот = `x × DEG_PER_PX`.
- **Инерция и доводка**: `inertia: true` + `snap` докручивают кольцо до ближайшей карточки после броска.
- **Кнопки и стрелки**: `[data-prev]`, `[data-next]`, клавиши ←/→ на сцене, клик по боковой карточке.
- **Глубина**: каждая карточка получает `--facing` (1 анфас … 0 спиной), CSS затемняет и размывает дальние.

`math.js` содержит чистые функции `ringRadius`, `ringStep`, `snapRotation`, `activeIndex`, `rotationFor` (ближайший оборот, без лишнего круга) и `facing`.

Разметка: `[data-ring-stage]` > `[data-ring-spinner]` > `[data-ring-card]` × N (N ≥ 3), а также `[data-ring-counter]`.

## Перенос в другой проект

- **Файлы:** `index.js`, `math.js` + `core/lifecycle.js`; стили `.ring*` (perspective, preserve-3d — обязательны).
- **GSAP:** Draggable, InertiaPlugin.
- Количество карточек любое от 3; радиус посчитается сам.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
