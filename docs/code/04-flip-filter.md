# 4. Фильтр снимков

[src/modules/flip-filter/index.js](../../src/modules/flip-filter/index.js)

## Где на экране

Страница «Миссии»: кнопки «Все / Планеты / Туманности / …» и сетка снимков. Нажали
«Планеты» — лишние снимки уменьшаются и тают, оставшиеся **плавно переезжают** на новые места, а
сетка становится ниже — и страница при этом не прыгает.

## Почему без Flip это сложно

Скрыть элемент — `display: none`. Сетка мгновенно перестраивается, и все карточки **прыгают**.
`display` не анимируется, а считать новые координаты каждой карточки вручную — долго и хрупко.

## FLIP за четыре слова

| Шаг | Что делаем | Код |
| --- | --- | --- |
| **F**irst | запомнить, где все сейчас | `Flip.getState(items)` |
| **L**ast | мгновенно поменять DOM — сетка встанет в итоговый вид | `classList.toggle('is-hidden')` |
| **I**nvert | сдвинуть каждую карточку туда, где она была (визуально «ничего не изменилось») | `Flip.from(state)` |
| **P**lay | плавно убрать сдвиг — карточки «едут» на новые места | `Flip.from(state)` |

Хитрость в том, что браузер **уже** посчитал новую раскладку — мы лишь анимируем разницу через
`transform`, а это быстро.

## Код по частям

```js
function apply(filter) {
  if (filter === current) return
  current = filter
  buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)))
```

`aria-pressed` — кнопки-переключатели: скринридер скажет, какой фильтр выбран.

```js
  const anchorTop = tabs.getBoundingClientRect().top
  const maxScroll = ScrollTrigger.maxScroll(window)
  const scroll = ctx.getScroll?.() ?? window.scrollY
  grid.style.minHeight = ''
  const startHeight = grid.offsetHeight
  gsap.killTweensOf(grid)
  gsap.set(grid, { clearProps: 'height' })
```

Подготовка — запоминаем, **где табы на экране** (вернём их туда же), и честно меряем высоту сетки:
снимаем запас от прошлого фильтра и промежуточную высоту незаконченной анимации (быстрый второй
клик).

```js
  const state = Flip.getState(items)                                                           // First
  items.forEach((item) => item.classList.toggle('is-hidden', !matchesFilter(item.dataset.category, filter)))  // Last
  const endHeight = keepRoomFor(startHeight, grid.offsetHeight, maxScroll, scroll)
```

```js
  flip?.kill()
  flip = Flip.from(state, {
    duration, ease: 'power3.inOut',
    absolute: true,
    onEnter: (elements) => gsap.fromTo(elements, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, … }),
    onLeave: (elements) => gsap.to(elements, { opacity: 0, scale: 0.7, … }),
  })
```

- **`absolute: true`** — на время анимации карточки вынимаются из сетки (`position: absolute`).
  Иначе исчезающие карточки занимали бы место и мешали остальным ехать.
- **`onEnter` / `onLeave`** — что делать с появившимися (были скрыты) и исчезающими: вырастают и
  проявляются / сжимаются и тают.
- `flip?.kill()` — прошлая анимация не спорит с новой.

**Порядок важен:** Flip вызывается **до** анимации высоты. В этот момент он меряет конечные
позиции карточек — сетка должна быть своей естественной высоты. Если сначала зажать её в
стартовую высоту, ряды сплющатся, карточки поедут в «сжатые» места, лягут друг на друга и только в
конце рывком встанут на места (так и было при переключении на «Все»).

### Страница не прыгает

Две причины прыжка и два лекарства:

**1. Сетка схлопывается.** `absolute: true` вынимает **все** карточки — сетка мгновенно становится
нулевой высоты, страница резко короче. Лечим анимацией высоты:

```js
  gsap.fromTo(grid, { height: startHeight }, {
    height: endHeight, duration, ease: 'power3.inOut',
    onComplete: () => {
      gsap.set(grid, { clearProps: 'height' })
      grid.style.minHeight = `${endHeight}px`
      ScrollTrigger.refresh()
      keepTabsAt(anchorTop)
    },
  })
```

**2. Страница стала короче прокрученного.** Вы внизу страницы, сетка уменьшилась — браузер
«подтягивает» прокрутку (нельзя быть ниже конца). Лечим запасом:

```js
export const keepRoomFor = (startHeight, endHeight, maxScroll, scroll) =>
  Math.max(endHeight, startHeight - Math.max(0, maxScroll - scroll))
```

Сетка может уменьшиться **не больше**, чем «осталось прокрутить ниже текущего места». Пример:
сетка 2000 px, после фильтра 800, до конца страницы осталось 500 → сетка станет 1500, а не 800.
Лишнее место исчезнет при следующем фильтре. Чистая функция — проверена тестом на числах.

После анимации — `ScrollTrigger.refresh()` (всё ниже сдвинулось) и `keepTabsAt`: если табы всё же
сдвинулись на экране, подкручиваем прокрутку, чтобы они остались ровно под пальцем.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| без `absolute: true` | исчезающие карточки мешают остальным ехать, «рывок» в конце |
| высоту анимировать до `Flip.from` | карточки ложатся друг на друга и в конце прыгают |
| без `keepRoomFor` | внизу страницы клик по фильтру резко прокручивает страницу вверх |
| без `ScrollTrigger.refresh()` | анимации ниже сетки срабатывают не там |

## Проверьте себя

1. `keepRoomFor(2000, 800, 5000, 4800)` — какая высота у сетки?
2. Почему Flip анимирует `transform`, а не `top/left`?

<details>
<summary>Ответы</summary>

1. До конца 200 px → `max(800, 2000 − 200) = 1800`.
2. `transform` не вызывает пересчёт раскладки страницы — анимация идёт на видеокарте и не
   тормозит (глава [02. Понятия](../02-concepts.md), раздел 2.3).
</details>
