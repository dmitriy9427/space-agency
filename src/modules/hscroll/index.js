/**
 * Горизонтальная лента миссий: листаете страницу ВНИЗ — лента едет ВБОК.
 *
 * ─── Что видит пользователь ───────────────────────────────────────────────
 * Секция закрепляется на экране, и обычная прокрутка двигает ряд карточек
 * справа налево. Над карточками прорисовывается линия-«таймлайн» (DrawSVG),
 * а каждая карточка, въезжая в экран, оживает: фото «приближается», год
 * расшифровывается (ScrambleText).
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * 1. Главный твин: `gsap.to(track, { x: -(ширина ленты − ширина окна) })`
 *    со ScrollTrigger: pin (секция стоит), scrub (прогресс = скролл),
 *    end = на столько px прокрутки, сколько лента должна проехать вбок —
 *    тогда скорость ленты совпадает со скоростью скролла.
 * 2. `containerAnimation` — ключевое понятие. Обычный ScrollTrigger следит
 *    за ВЕРТИКАЛЬНЫМ положением элемента на экране. Но карточки внутри
 *    ленты по вертикали не двигаются — они едут вбок. Передав
 *    `containerAnimation: главныйТвин`, мы говорим ScrollTrigger: «считай
 *    положение карточки внутри горизонтальной анимации». Тогда
 *    `start: 'left 80%'` значит «левый край карточки дошёл до 80% ширины окна».
 * 3. `ease: 'none'` у главного твина ОБЯЗАТЕЛЬНО: иначе связь скролла и
 *    положения карточек нелинейна, и containerAnimation посчитает неверно.
 * 4. Размеры — функциями с `invalidateOnRefresh: true`: при ресайзе окна
 *    длина пути пересчитывается.
 *
 * ─── Разметка ────────────────────────────────────────────────────────────────
 *   <section data-module="hscroll">
 *     <div data-hscroll-pin>
 *       <svg><path data-hscroll-line …/></svg>   (по желанию)
 *       <div data-hscroll-track> …карточки [data-hscroll-card]… </div>
 *     </div>
 *   </section>
 *
 * МОБИЛКА: на телефоне горизонтальный «скролл через вертикальный» работает,
 * но карточки нужно сделать уже (CSS --hscroll-card в pages.css), иначе в
 * экран влезает меньше одной. docs/11-mobile.md.
 * @module hscroll
 */
import { gsap } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'

/**
 * Сколько px ленте нужно проехать влево, чтобы последняя карточка
 * встала к правому краю окна. Не меньше 0 (лента уже окна — ехать некуда).
 */
export const travelDistance = (trackWidth, viewportWidth) => Math.max(0, trackWidth - viewportWidth)

/**
 * @param {HTMLElement} el
 * @param {{ reduced: boolean }} ctx
 */
export function init(el, ctx) {
  const d = createDisposer()
  const pin = el.querySelector('[data-hscroll-pin]') ?? el
  const track = el.querySelector('[data-hscroll-track]')
  const line = el.querySelector('[data-hscroll-line]')
  const progress = el.querySelector('[data-hscroll-progress]')

  if (!track) return { destroy() {} }

  const distance = () => travelDistance(track.scrollWidth, window.innerWidth)

  const g = gsap.context(() => {
    // 1. Главный твин: лента едет влево на всю «лишнюю» ширину.
    const move = gsap.to(track, {
      x: () => -distance(),
      ease: 'none', // линейно! см. п. 3 в шапке
      scrollTrigger: {
        trigger: el,
        pin,
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: ctx.reduced ? true : 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (progress) progress.style.transform = `scaleX(${self.progress.toFixed(4)})`
        },
      },
    })

    // Линия-таймлайн прорисовывается синхронно с лентой.
    if (line) {
      gsap.fromTo(
        line,
        { drawSVG: '0% 0%' },
        {
          drawSVG: '0% 100%',
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true },
        },
      )
    }

    if (ctx.reduced) return

    // 2. Анимации карточек — относительно горизонтального движения (containerAnimation).
    el.querySelectorAll('[data-hscroll-card]').forEach((card) => {
      const photo = card.querySelector('img')
      const year = card.querySelector('[data-hscroll-year]')

      // Фото «приближается», пока карточка проезжает от правого края до середины.
      if (photo) {
        gsap.fromTo(
          photo,
          { scale: 1.35 },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: move, start: 'left right', end: 'center center', scrub: true },
          },
        )
      }

      // Год расшифровывается один раз, когда карточка въехала на 80% окна.
      if (year) {
        gsap.from(year, {
          duration: 1,
          scrambleText: { text: year.textContent, chars: '0123456789', speed: 0.5 },
          scrollTrigger: { trigger: card, containerAnimation: move, start: 'left 80%', toggleActions: 'play none none none' },
        })
      }
    })
  }, el)

  d.add(() => g.revert())
  return { destroy: () => d.dispose() }
}
