# sliders/infinite — бесконечная лента (обычная и 3D)

Устроена так же, как InfiniteSlider из UguKit: движок с логикой и сменный рендерер для отрисовки.

| Файл | Что делает |
| --- | --- |
| `engine.js` | Чистый движок: `createInfiniteEngine` (лаг при перетаскивании, пружинная доводка с подхватом скорости, проекция броска, `shift`/`goTo` кратчайшим путём), `springStep`, `springFrom`, `slideOffset` (заворот по кругу), `nearestIndex`. |
| `dom-renderer.js` | DOM: `translate3d` + `skewX` от скорости, масштаб и затемнение боковых слайдов, параллакс картинки. Слайды за краем прячутся (`visibility`). |
| `infinite.scene.js` | WebGL (three): по две плоскости на слайд (слайд и отражение), 1 юнит = 1 CSS px. |
| `infinite.glsl.js` | Цилиндр-барабан (`uCurve`), изгиб листа на скорости, отражение с затуханием, затенение краёв, RGB-сдвиг, скруглённые углы. |
| `index.js` | Обвязка: GSAP **Observer** (мышь и палец, блокировка оси), горизонтальное колесо, кнопки, стрелки, клик по слайду, смена заголовка; `init` и `init3d`. |

## Разметка

```html
<div data-module="infinite" style="--infinite-gap: 24px">   <!-- или infinite3d, data-curve="1.1" -->
  <div data-infinite-viewport tabindex="0">
    <article data-infinite-slide data-title="Kepler">
      <div data-infinite-art><img src="/photos/p16.jpg" alt="…"></div>
    </article>
    …
  </div>
  <p data-infinite-title></p> <span data-infinite-counter></span>
  <button data-prev></button><button data-next></button>
</div>
```

## Производительность

- Кадры считаются только пока лента движется и секция рядом с экраном. В покое цикл ничего не делает.
- 3D-версия грузит three отдельным чанком. Текстуры — фото слайдов из `public/photos` (тот же домен, без CORS), грузятся заранее через `loadImage`. На слабых устройствах отражение выключено.

## Перенос в другой проект

- **Файлы:** `engine.js`, `dom-renderer.js`, `index.js` (+ `infinite.scene.js`, `infinite.glsl.js` для 3D) + `core/*`; стили `.infinite*`.
- **GSAP:** Observer (+ three.js для 3D).
- Движок `engine.js` не зависит ни от чего — его можно использовать с любым своим рендером (Canvas 2D, PixiJS, React Native).

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
