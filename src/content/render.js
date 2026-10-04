/**
 * Генерация повторяющейся разметки (карточки слайдеров, ячейки галереи,
 * панели аккордеона) из данных: фото NASA и роликов. Чистые функции
 * «данные → HTML-строка»; `renderSlots` заполняет места `[data-render]`.
 * @module content/render
 */
import { DESTINATIONS } from './destinations.js'
import { MISSIONS } from './missions.js'
import { PHOTOS, categoryOf, getPhoto } from './photos.js'
import { VIDEOS } from './videos.js'

/** Экранирование для вставки в HTML. */
export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

/**
 * Список фото из атрибута: «p01,p05» — по id, «all» — все, пусто — ничего.
 * Неизвестные id пропускаются.
 * @param {string} raw
 */
export function parsePhotos(raw = '') {
  const value = String(raw).trim()

  if (value === 'all') return PHOTOS.slice()
  return value
    .split(',')
    .map((part) => getPhoto(part.trim()))
    .filter(Boolean)
}

/** `<img>` фото: ленивое, с размерами (без скачков вёрстки), не перетаскивается. */
export const img = (photo, { eager = false, className = 'photo' } = {}) =>
  `<img class="${className}" src="${photo.src}" width="${photo.w}" height="${photo.h}" alt="${escapeHtml(photo.title)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" draggable="false" data-photo="${photo.id}">`

const pad = (n) => String(n).padStart(2, '0')

/** Шаблоны по имени слота. */
export const templates = {
  ring: (photos) =>
    photos
      .map(
        (p, i) => `<article class="ring__card" data-ring-card data-cursor="тяни">
  ${img(p)}
  <div class="card__meta"><span class="card__code">${pad(i + 1)} · ${escapeHtml(p.kind)}</span><h4 class="card__title">${escapeHtml(p.title)}</h4><span class="card__kind">${escapeHtml(p.meta)}</span></div>
</article>`,
      )
      .join('\n'),

  stack: (photos) =>
    photos
      .map(
        (p) => `<article class="stack__card" data-stack-card data-cursor="смахни">
  ${img(p)}
  <div class="card__meta"><span class="card__code">${escapeHtml(p.kind)}</span><h4 class="card__title">${escapeHtml(p.title)}</h4><span class="card__kind">${escapeHtml(p.meta)}</span></div>
</article>`,
      )
      .join('\n'),

  infinite: (photos) =>
    photos
      .map(
        (p, i) => `<article class="infinite__slide" data-infinite-slide data-title="${escapeHtml(p.title)}" data-photo-id="${p.id}">
  <div class="infinite__art" data-infinite-art>${img(p)}</div>
  <span class="infinite__code">${pad(i + 1)} · ${escapeHtml(p.kind)}</span>
</article>`,
      )
      .join('\n'),

  shader: (photos) =>
    photos
      .map(
        (p) =>
          `<div class="shader-slider__slide" data-shader-slide data-title="${escapeHtml(p.title)}" data-text="${escapeHtml(`${p.kind} · ${p.meta}`)}" data-photo-id="${p.id}">${img(p)}</div>`,
      )
      .join('\n'),

  gallery: (photos) =>
    photos
      .map(
        (p, i) => `<figure class="gallery__item" data-gallery-item tabindex="${i === 0 ? 0 : -1}">
  <div class="gallery__card">${img(p)}<figcaption class="gallery__caption"><span>${escapeHtml(p.kind)} · ${escapeHtml(p.meta)}</span>${escapeHtml(p.title)}</figcaption></div>
</figure>`,
      )
      .join('\n'),

  /**
   * Карточки видеоленты; `photos` не нужны — ролики берутся из VIDEOS.
   * У <video> нет src — только data-src: ролик начнёт грузиться лишь при
   * первом раскрытии карточки (см. sliders/video-strip/index.js).
   */
  videos: () =>
    VIDEOS.map((video, i) => {
      const poster = getPhoto(video.poster)

      return `<article class="vstrip__card" data-vstrip-card tabindex="0" aria-label="${escapeHtml(video.title)}">
  ${img(poster, { className: 'photo vstrip__poster' })}
  <video class="vstrip__video" muted loop playsinline preload="none" poster="${poster.src}" data-src="${escapeHtml(video.src)}" data-start="${video.start}"${video.end ? ` data-end="${video.end}"` : ''}></video>
  <span class="vstrip__index">${pad(i + 1)}</span>
  <span class="vstrip__label">${escapeHtml(video.title)}</span>
  <span class="vstrip__content">
    <span class="vstrip__kind" data-vstrip-content>${escapeHtml(video.meta)}</span>
    <span class="vstrip__title" data-vstrip-content>${escapeHtml(video.title)}</span>
    <span class="vstrip__text" data-vstrip-content>${escapeHtml(video.text)}</span>
  </span>
</article>`
    }).join('\n'),

  /** Карточки горизонтальной ленты миссий (страница «Миссии»). Данные — content/missions.js. */
  missions: () =>
    MISSIONS.map((mission, i) => {
      const photo = getPhoto(mission.photo)

      return `<article class="hscroll__card" data-hscroll-card>
  <div class="hscroll__photo">${img(photo)}</div>
  <span class="hscroll__year" data-hscroll-year>${escapeHtml(mission.year)}</span>
  <h3 class="hscroll__title">${escapeHtml(mission.title)}</h3>
  <p class="hscroll__text">${escapeHtml(mission.text)}</p>
  <span class="hscroll__num">${pad(i + 1)} / ${pad(MISSIONS.length)}</span>
</article>`
    }).join('\n'),

  /** Сетка снимков с категориями для фильтра на Flip (страница «Миссии»). */
  'filter-grid': (photos) =>
    photos
      .map(
        (p) => `<figure class="fgrid__item" data-flip-item data-category="${escapeHtml(categoryOf(p))}">
  ${img(p)}
  <figcaption class="fgrid__caption"><span>${escapeHtml(p.kind)}</span>${escapeHtml(p.title)}</figcaption>
</figure>`,
      )
      .join('\n'),

  /** Полноэкранные слайды направлений (страница «Направления»). Данные — content/destinations.js. */
  destinations: () =>
    DESTINATIONS.map((place, i) => {
      const photo = getPhoto(place.photo)

      return `<article class="fslide" data-fslide aria-label="${escapeHtml(place.name)}">
  <div class="fslide__outer" data-fslide-outer>
    <div class="fslide__inner" data-fslide-inner>
      <div class="fslide__bg" data-fslide-bg>${img(photo, { eager: i === 0 })}</div>
      <div class="fslide__content">
        <p class="eyebrow">// направление ${pad(i + 1)}</p>
        <h2 class="fslide__title" data-fslide-title>${escapeHtml(place.name)}</h2>
        <p class="fslide__tagline">${escapeHtml(place.tagline)}</p>
        <dl class="fslide__stats">${place.stats
          .map((stat) => `<div><dt>${escapeHtml(stat.label)}</dt><dd data-fslide-stat>${escapeHtml(stat.value)}</dd></div>`)
          .join('')}</dl>
      </div>
    </div>
  </div>
</article>`
    }).join('\n'),
}

/**
 * Повторять список по кругу, пока не наберётся `count` элементов.
 * Нужно бесконечной сетке: число ячеек должно делиться на число колонок,
 * иначе последний ряд неполный и при завороте сетки видны дыры.
 * fillTo([a, b, c], 5) → [a, b, c, a, b]
 */
export function fillTo(list, count) {
  if (!list.length || !(count > 0)) return list
  return Array.from({ length: count }, (_, i) => list[i % list.length])
}

/**
 * Заполнить все `[data-render]` в `root`. Фото — из `data-photos`;
 * `data-count="40"` — повторить их по кругу до 40 штук.
 * @returns {number} Сколько слотов заполнено.
 */
export function renderSlots(root = document) {
  let filled = 0

  root.querySelectorAll('[data-render]').forEach((slot) => {
    const template = templates[slot.dataset.render]

    if (!template) return
    const photos = parsePhotos(slot.dataset.photos)

    slot.innerHTML = template(slot.dataset.count ? fillTo(photos, Number(slot.dataset.count)) : photos)
    slot.removeAttribute('data-render')
    filled++
  })
  return filled
}
