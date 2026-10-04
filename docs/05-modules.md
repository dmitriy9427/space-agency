# 5. Все модули проекта

Краткий обзор каждого эффекта. Подробности — в README папки модуля (ссылки в первой колонке):
как работает по шагам, все настройки, разметка, перенос, мобилка.

## Общий слой (на всех страницах)

| Модуль | Что делает | GSAP / техника |
| --- | --- | --- |
| [cursor](../src/modules/cursor/README.md) | Неоновый хвост за курсором, подсказки над `data-cursor`, магнитные кнопки `data-magnetic` | quickTo, тикер, canvas 2D |
| [nav](../src/modules/nav/README.md) | Шапка: прокрутка к якорям, прячется при прокрутке вниз, прогресс, подсветка текущей страницы | ScrollTrigger, ScrollToPlugin |
| [page-transition](../src/modules/page-transition/README.md) | «Занавес» при переходе между страницами | шейдер (three.js) |
| `src/core/router.js` | Перехват ссылок, загрузка страниц без перезагрузки | — |
| `src/app.js` | Монтаж/демонтаж страниц, подмена DOM под занавесом | ScrollSmoother |

## Главная (`index.html`)

| Модуль | Что делает | GSAP / техника |
| --- | --- | --- |
| [rocket](../src/modules/rocket/README.md) | 3D-ракета по скроллу: взлёт, разворот, уход за край, посадка | ScrollTrigger (замеры) + three.js |
| [hero](../src/modules/hero/README.md) | Первый экран: буквы заголовка, расшифровка, параллакс | SplitText, ScrambleText, ScrollTrigger |
| [manifesto](../src/modules/manifesto/README.md) | Слова загораются по скроллу, счётчики | SplitText, ScrollTrigger, ScrambleText |
| [story](../src/modules/story/README.md) | Закреплённая история из 4 сцен, HUD, небо темнеет | ScrollTrigger (pin + scrub) |
| [orbit](../src/modules/orbit/README.md) | SVG: орбита рисуется, спутник летит, планета перетекает | DrawSVG, MotionPath, MorphSVG |
| [sliders/ring](../src/modules/sliders/ring/README.md) | 3D-кольцо карточек | Draggable + InertiaPlugin |
| [sliders/stack](../src/modules/sliders/stack/README.md) | Стопка, смахивание | Draggable |
| [sliders/infinite](../src/modules/sliders/infinite/README.md) | Бесконечная лента (DOM) и барабан (WebGL) | Observer (+ three.js) |
| [sliders/video-strip](../src/modules/sliders/video-strip/README.md) | Видеолента с раскрытием по наведению | Draggable + InertiaPlugin |
| [sliders/shader](../src/modules/sliders/shader/README.md) | Шейдерный переход на всю ширину, 4 направления | Observer, SplitText + three.js |
| [liquid](../src/modules/liquid/README.md) | Водная гладь: волновое уравнение на GPU | three.js (ping-pong) |
| [gallery](../src/modules/gallery/README.md) | Бесконечный архив + лайтбокс | Observer, ScrollTrigger, Flip, CustomEase |
| [mission](../src/modules/mission/README.md) | Терминал, отсчёт, салют, бегущая строка | TextPlugin, ScrambleText, Physics2D, EasePack |

## «Миссии» (`missions.html`)

| Модуль | Что делает | GSAP / техника |
| --- | --- | --- |
| [page-intro](../src/modules/page-intro/README.md) | Заголовок по строкам из-под маски | SplitText (lines, autoSplit) |
| [hscroll](../src/modules/hscroll/README.md) | Горизонтальная лента от вертикального скролла | ScrollTrigger (containerAnimation), DrawSVG |
| [flip-filter](../src/modules/flip-filter/README.md) | Фильтр сетки по категориям | Flip |

## «Направления» (`destinations.html`)

| Модуль | Что делает | GSAP / техника |
| --- | --- | --- |
| [fullscreen-slides](../src/modules/fullscreen-slides/README.md) | Полноэкранные слайды колесом/свайпом, маршрут-схема | Observer, SplitText, MotionPath |

## Данные

| Файл | Что внутри |
| --- | --- |
| `src/content/photos.js` | 30 фото NASA: файл, размеры, подпись, автор; категории для фильтра |
| `src/content/videos.js` | Ролики видеоленты: ссылка, постер, отрезок |
| `src/content/missions.js` | Миссии для горизонтальной ленты |
| `src/content/destinations.js` | Планеты для полноэкранных слайдов |
| `src/content/render.js` | Шаблоны «данные → HTML» и `renderSlots()` ([README](../src/content/README.md)) |

Дальше — [06-porting.md](06-porting.md).
