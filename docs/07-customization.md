# 7. Рецепты: как поменять и добавить

Короткие пошаговые инструкции для самых частых задач.

## Цвета, шрифты, рамки, фон

Всё оформление — CSS-переменные в начале `src/styles/base.css`:

| Переменная | Что | Пример |
| --- | --- | --- |
| `--bg`, `--bg-2` | фон страницы и карточек | `#05060d` |
| `--fg`, `--muted` | основной и приглушённый текст | |
| `--accent`, `--cyan` | акцентные цвета (оранжевый, голубой) | |
| `--font`, `--display`, `--mono` | шрифты текста, заголовков, моноширинный | |
| `--frame-line`, `--frame-shadow` | рамка и тень всех фото | |
| `--frame-glow-cyan`, `--frame-glow-orange` | свечение активных карточек | |
| `--space-bg` | фон секций слайдеров и архива (цветные пятна) | |

Цвета внутри WebGL-сцен (огонь, кант перехода, занавес) задаются в JS — ищите `Color(` в
файлах `*.scene.js` и `ACCENTS` в `sliders/shader/index.js`.

**Сменить шрифт:** `npm i @fontsource-variable/<шрифт>`, заменить импорт в `src/main.js` и
значение переменной `--font` / `--display`. Проверьте, что шрифт поддерживает кириллицу
(на fontsource.org — фильтр «Cyrillic»).

## Тексты

Все тексты страниц — прямо в `index.html`, `missions.html`, `destinations.html`. Тексты
повторяющихся карточек — в данных `src/content/` (`photos.js`, `videos.js`, `missions.js`,
`destinations.js`).

## Заменить или добавить фото

1. Положите файл в `public/photos/` (лучше JPG до ~500 КБ, ширина 1280–1920 px).
2. Добавьте запись в `PHOTOS` (`src/content/photos.js`): `id`, `src`, размеры `w`/`h`
   (узнать: `sips -g pixelWidth -g pixelHeight файл.jpg` на macOS или свойства файла),
   `title`, `kind`, `meta`, `credit`.
3. Используйте `id` в атрибуте `data-photos="p01,p33"` нужного слайдера.
4. Если фото чужое — добавьте строку в `CREDITS.md`.

**Важно для WebGL-слайдеров:** фото должно лежать на вашем сервере (CORS).

## Заменить видео в видеоленте

`src/content/videos.js`: `src` (ссылка на mp4), `poster` (id фото), `start`/`end` (какой
отрезок крутить, секунды). Ролики NASA ищутся на images.nasa.gov; ссылка вида
`https://images-assets.nasa.gov/video/<id>/<id>~mobile.mp4` (функция `asset(id)`).

## Поменять траекторию ракеты

1. **Где ракета в каждой точке** — таблица `WAYPOINTS` в `src/modules/rocket/flight.js`:
   `x` (−1 слева … 1 справа, >1 — за краем), `y` (−1 низ … 1 верх), `scale`, `roll` (0 — нос
   вверх, 180 — нос вниз), `yaw`, `thrust` (сила огня 0…1), `ground` (0 — стоит на
   площадке).
2. **Когда ракета приходит в точку** — атрибуты в HTML: `data-flight="id"` на секции или
   невидимом маркере `<i class="flight-marker" data-flight="id">`, и
   `data-flight-start="top 25%"` («когда верх элемента дойдёт до 25% высоты экрана»).
3. Добавить точку: новая запись в `WAYPOINTS` + элемент с `data-flight` в HTML.

Совет: откройте страницу с `?debug` и в консоли смотрите `__orbita.ctx.rocket.state` при
прокрутке.

## Добавить свой эффект (модуль)

1. Создайте папку `src/modules/my-effect/` и файл `index.js`:
   ```js
   import { gsap } from '../../core/gsap.js'
   import { createDisposer } from '../../core/lifecycle.js'

   export function init(el, ctx) {
     const d = createDisposer()
     const g = gsap.context(() => {
       gsap.from(el.querySelectorAll('[data-my-item]'), { y: 40, opacity: 0, stagger: 0.1 })
     }, el)

     d.add(() => g.revert())
     return { destroy: () => d.dispose() }
   }
   ```
2. Зарегистрируйте в `src/main.js`: `import * as myEffect from './modules/my-effect/index.js'`
   и `'my-effect': myEffect.init` в `PAGE_MODULES`.
3. В HTML: `<section data-module="my-effect">…</section>`.
4. Добавьте `README.md` и тест (`index.test.js` — образец в любом модуле).

## Добавить секцию на главную

Скопируйте блок `<section>` в `index.html` внутрь `<main data-page="home">`, поставьте ему
нужный `data-module`. Если секция с непрозрачным фоном перекрывает экран — добавьте
`data-occlude`, тогда ракета под ней не будет рисоваться (экономия). Если хотите, чтобы
ракета куда-то прилетала к этой секции — `data-flight` (см. выше).

## Добавить страницу

1. Скопируйте `missions.html` → `about.html`. Поменяйте `<title>`, содержимое
   `<main data-page="about" data-sky="1">` (атрибут `data-sky` — тёмное небо сразу; без него
   — закат, как на главной) и при необходимости `<div data-page-fixed>`.
2. Шапку, курсор, небо **не трогайте** — они общие (если меняете — меняйте во всех HTML).
3. Добавьте ссылку в меню **во всех HTML-файлах**: `<a href="/about.html">О нас</a>`.
4. Добавьте страницу в `vite.config.js` (`rollupOptions.input`), иначе она не попадёт в
   `npm run build`.

Переход с занавесом заработает сам: роутер перехватывает все ссылки на страницы сайта.

## Отключить эффект

- На всём сайте — удалите элемент с `data-module` из HTML (или сам атрибут).
- Временно — уберите строку модуля из `PAGE_MODULES` в `main.js` (в консоли будет
  предупреждение «нет модуля», страница продолжит работать).
- Плавный скролл — в `src/app.js` замените создание ScrollSmoother на `null`.
- Курсор — удалите блок `.cursor` из всех HTML.

## Поменять качество графики

`QUALITY_TABLE` в `src/core/env.js` — плотность пикселей, звёзды, искры для уровней
`high`/`medium`/`low`. Проверить слабый уровень: временно верните из `getQuality()`
`{ tier: 'low', ... }`.

Дальше — [08-performance.md](08-performance.md).
