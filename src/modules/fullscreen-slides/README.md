# fullscreen-slides — полноэкранные слайды (страница «Направления»)

Экран целиком занят одной планетой. Одно движение колеса, свайп или ↑↓, и следующая планета въезжает, а старая уходит, с параллаксом фона. Название собирается по буквам, цифры «расшифровываются». В углу мини-схема: кораблик летит по кривой к текущей планете. Страница **не прокручивается**: слайды переключает Observer.

## Разметка

Генерирует шаблон `destinations` по данным `src/content/destinations.js`:

```html
<section data-module="fullscreen-slides">
  <article data-fslide>
    <div data-fslide-outer><div data-fslide-inner>
      <div data-fslide-bg><img …></div>
      <h2 data-fslide-title>Марс</h2>
      <dd data-fslide-stat>225 млн км</dd>
    </div></div>
  </article>
  <span data-fslides-counter></span>
  <button data-fslides-dot></button> …
  <svg><path data-route-path …/><circle data-route-dot/> … <path data-route-ship …/></svg>
</section>
```

## Как работает

1. **Observer** на `window`, `type: 'wheel,touch,pointer'`, `preventDefault: true`. Колесо вниз и свайп вверх вызывают `onUp`, и это значит «следующий». `tolerance: 10` — лёгкое касание тачпада не листает. Пока идёт анимация (`animating`), новые жесты игнорируются.
2. **Шторка из двух обёрток.** `outer` сдвинут на +100%, `inner` на −100%: картинка стоит на месте, но обрезана до нуля. Обе анимируются к 0, и слайд раскрывается как шторка. Это классический приём из демо GSAP «Observer: full screen sections».
3. **Мини-схема.** Точки расставляются вдоль кривой (`getPointAtLength`), а кораблик летит через `motionPath: { path, start, end }`, где `start` и `end` — доли пути прошлой и новой планеты (`routeFraction`).

## Настройки

`DURATION` — скорость смены. Данные планет — `src/content/destinations.js`. Добавили планету: добавьте точку `<circle data-route-dot>` и кнопку-точку `[data-fslides-dot]` в `destinations.html`.

## Мобилка

Свайпы уже работают (`type: 'touch'`), но мини-схема перекрывает текст, а заголовки слишком крупные (`pages.css`, пометки «МОБИЛКА»).

## Перенос в другой проект

- **Файлы:** `index.js` + разметка слайдов; стили `.fslide*`, `.fslides*`, `.route*` из `pages.css`.
- **GSAP:** Observer, SplitText, ScrambleText, MotionPath.
- Observer вешается на `window` и блокирует прокрутку — на странице не должно быть другого контента для прокрутки.

Общий порядок переноса и примеры для React/Vue/Next — `docs/06-porting.md`.
