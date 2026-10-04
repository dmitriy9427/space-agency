# orbit

SVG-секция, закреплённая на 180% прокрутки.

| Элемент | Плагин | Что происходит |
| --- | --- | --- |
| `[data-orbit-path]` | DrawSVG | Эллипс орбиты прорисовывается от 0 до 100%. |
| `[data-orbit-satellite]` | MotionPath | Спутник летит по той же орбите (`align`, `autoRotate`). |
| `[data-morph]` + `data-morph-to="#a,#b"` | MorphSVG | Центральная фигура по очереди перетекает в пути из `<defs>`. |
| `[data-orbit-caption]` | ScrollTrigger | Подписи появляются по одной. |
| `[data-orbit-glow]` | gsap | Бесконечное «дыхание» свечения. |

`parseMorphTargets` превращает `data-morph-to` в список селекторов.

## Перенос в другой проект

- **Файлы:** `index.js` + SVG-разметка с `data-orbit-*` и целевыми фигурами в `<defs>`; стили `.orbit*`.
- **GSAP:** ScrollTrigger, DrawSVG, MorphSVG, MotionPath.
- SVG должен быть встроен в HTML (inline), а не подключён как <img> — иначе к его элементам не добраться.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
