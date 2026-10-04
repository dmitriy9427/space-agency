# hscroll — горизонтальная лента от вертикального скролла

Секция закрепляется, и обычная прокрутка вниз двигает ряд карточек справа налево. Линия-таймлайн над ними прорисовывается (DrawSVG), а каждая карточка, въезжая, оживает: фото «приближается», год «расшифровывается». Используется на странице «Миссии».

## Разметка

```html
<section data-module="hscroll">
  <div data-hscroll-pin>
    <i data-hscroll-progress></i>
    <div data-hscroll-track>
      <svg …><path data-hscroll-line d="…"/></svg>
      <article data-hscroll-card> <img> <span data-hscroll-year>1977</span> … </article>
    </div>
  </div>
</section>
```

## Как работает: `containerAnimation`

1. **Главный твин** `gsap.to(track, { x: -(ширина ленты − ширина окна), ease: 'none' })` со ScrollTrigger: `pin` закрепляет секцию, `scrub` привязывает прогресс к скроллу, а `end: '+=' + расстояние` делает скорость ленты равной скорости прокрутки.
2. **Карточки** по вертикали не двигаются, они едут вбок. Обычный ScrollTrigger этого не видит. Опция `containerAnimation: главныйТвин` говорит: «считай положение карточки внутри горизонтальной анимации». Тогда `start: 'left 80%'` означает «левый край карточки дошёл до 80% ширины окна».
3. **`ease: 'none'`** у главного твина обязателен, иначе связь «скролл → положение» нелинейна и `containerAnimation` считает неверно.
4. **Размеры** заданы функциями с `invalidateOnRefresh: true`, поэтому при ресайзе всё пересчитывается.

## Настройки

Ширина карточки — `--hscroll-card` (`src/styles/pages.css`), высота фото — `.hscroll__photo`. Данные — `src/content/missions.js` (шаблон `missions`).

## Мобилка

Работает, но карточку нужно сделать уже (около 78vw).

## Перенос в другой проект

- **Файлы:** `index.js` + разметка `data-hscroll-*`; стили `.hscroll*` из `pages.css`.
- **GSAP:** ScrollTrigger (pin, containerAnimation), DrawSVG, ScrambleText.
- Если на странице есть ScrollSmoother, пин работает через transform автоматически.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
