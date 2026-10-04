# content

Данные и генерация повторяющейся разметки.

| Файл | Что делает |
| --- | --- |
| `photos.js` | `PHOTOS`: 30 фото NASA из `public/photos` (размеры, подписи на русском, авторство). `getPhoto(id или номер)`. |
| `videos.js` | `VIDEOS`: ролики NASA для аккордеона. Стримятся с images-assets.nasa.gov, в проекте не хранятся. |
| `render.js` | `parsePhotos('p01,p05' / 'all')`; `img(photo)` — `<img>` с размерами и `loading="lazy"`; `templates[имя]` — чистые функции «данные → HTML»; `renderSlots(root)` заполняет `<div data-render="ring" data-photos="p01,p05">` до запуска модулей. |

Тексты пропускаются через `escapeHtml`. Авторство снимков описано в `CREDITS.md` в корне проекта.
