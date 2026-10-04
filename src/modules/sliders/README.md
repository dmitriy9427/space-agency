# sliders — шесть кастомных слайдеров

У каждого слайдера своя папка, свой README, чистая логика отдельным файлом и тесты.

| № | Папка | Идея | GSAP |
| --- | --- | --- | --- |
| 1 | [`ring`](ring/README.md) | 3D-кольцо карточек на CSS 3D | Draggable (прокси) + InertiaPlugin (snap) |
| 2 | [`stack`](stack/README.md) | Стопка, смахивание как в Tinder | Draggable, elastic |
| 3 | [`infinite`](infinite/README.md) (`init`) | Бесконечная лента: пружина, наклон на скорости, параллакс | Observer + тикер |
| 4 | [`infinite`](infinite/README.md) (`init3d`) | Та же лента в WebGL: барабан, отражение, RGB-сдвиг | Observer + three.js |
| 5 | [`video-strip`](video-strip/README.md) | Видеолента: раскрытие по наведению, ролики NASA | Draggable + InertiaPlugin |
| 6 | [`shader`](shader/README.md) | Шейдерный переход на всю ширину, 4 направления | Observer, SplitText + three.js |

## Общие приёмы

- **Движок отдельно от отрисовки.** Ленты №3 и №4 используют один `engine.js`.
- **Кадры только когда что-то движется** и слайдер на экране (`onViewport`).
- **Клавиатура** у всех: стрелки, у некоторых ещё Enter. Атрибут `tabindex="0"` на сцене слайдера.
- **`touch-action`** в CSS говорит браузеру, какие жесты отдать странице (прокрутку), а какие — слайдеру.

## Перенос в другой проект

- **Файлы:** см. README каждого слайдера.
- **GSAP:** см. таблицу выше.
- Везде одинаковый контракт: `init(el, ctx) → { destroy }`.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
