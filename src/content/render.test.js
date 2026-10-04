import { describe, expect, it } from 'vitest'
import { PHOTOS, getPhoto } from './photos.js'
import { escapeHtml, img, parsePhotos, renderSlots, templates } from './render.js'
import { VIDEOS } from './videos.js'

describe('content/photos', () => {
  it('у каждого фото есть файл, размеры, подпись и авторство', () => {
    const ids = new Set()

    PHOTOS.forEach((photo) => {
      expect(photo.src).toBe(`/photos/${photo.id}.jpg`)
      expect(photo.w).toBeGreaterThan(400)
      expect(photo.h).toBeGreaterThan(400)
      expect(photo.title).toMatch(/[А-Яа-яЁё]/)
      expect(photo.credit).toBeTruthy()
      ids.add(photo.id)
    })
    expect(ids.size).toBe(PHOTOS.length)
  })

  it('getPhoto по id и по номеру (по кругу)', () => {
    expect(getPhoto('p16').title).toBe('Космические скалы Киля')
    expect(getPhoto(0)).toBe(PHOTOS[0])
    expect(getPhoto(PHOTOS.length)).toBe(PHOTOS[0])
    expect(getPhoto(-1)).toBe(PHOTOS.at(-1))
    expect(getPhoto('нет')).toBeNull()
  })
})

describe('content/videos', () => {
  it('ролики NASA с постерами из наших фото', () => {
    VIDEOS.forEach((video) => {
      expect(video.src).toMatch(/^https:\/\/images-assets\.nasa\.gov\/video\/.+~mobile\.mp4$/)
      expect(getPhoto(video.poster)).toBeTruthy()
      expect(video.title).toMatch(/[А-Яа-яЁё]/)
      if (video.end !== undefined) expect(video.end).toBeGreaterThan(video.start)
    })
  })
})

describe('content/render', () => {
  it('parsePhotos: список id, all и неизвестные', () => {
    expect(parsePhotos('p01, p05').map((p) => p.id)).toEqual(['p01', 'p05'])
    expect(parsePhotos('p01,zzz')).toHaveLength(1)
    expect(parsePhotos('all')).toHaveLength(PHOTOS.length)
    expect(parsePhotos()).toEqual([])
  })

  it('escapeHtml', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })

  it('img: ленивая, с размерами и без перетаскивания', () => {
    const host = document.createElement('div')

    host.innerHTML = img(getPhoto('p08'))

    const image = host.querySelector('img')

    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('width')).toBe(String(getPhoto('p08').w))
    expect(image.getAttribute('draggable')).toBe('false')
    expect(image.alt).toBe(getPhoto('p08').title)
    host.innerHTML = img(getPhoto('p08'), { eager: true })
    expect(host.querySelector('img').getAttribute('loading')).toBe('eager')
  })

  it('каждый шаблон отдаёт по элементу на фото', () => {
    const photos = parsePhotos('p01,p02,p03')
    const counts = {
      ring: '[data-ring-card]',
      stack: '[data-stack-card]',
      infinite: '[data-infinite-slide]',
      shader: '[data-shader-slide]',
      gallery: '[data-gallery-item]',
    }

    Object.entries(counts).forEach(([name, selector]) => {
      const host = document.createElement('div')

      host.innerHTML = templates[name](photos)
      expect(host.querySelectorAll(selector)).toHaveLength(3)
      expect(host.querySelectorAll('img')).toHaveLength(3)
    })
  })

  it('videos: карточка на ролик, видео без src до наведения', () => {
    const host = document.createElement('div')

    host.innerHTML = templates.videos()

    const videos = host.querySelectorAll('video')

    expect(host.querySelectorAll('[data-vstrip-card]')).toHaveLength(VIDEOS.length)
    expect(videos[0].getAttribute('src')).toBeNull()
    expect(videos[0].dataset.src).toBe(VIDEOS[0].src)
    expect(videos[0].getAttribute('preload')).toBe('none')
    expect(videos[0].hasAttribute('muted')).toBe(true)
    // Отрезок: у роликов с end есть data-end, у остальных нет.
    VIDEOS.forEach((video, i) => expect(videos[i].dataset.end).toBe(video.end ? String(video.end) : undefined))
  })

  it('missions, filter-grid, destinations: по элементу на запись данных', () => {
    const host = document.createElement('div')

    host.innerHTML = templates.missions()
    expect(host.querySelectorAll('[data-hscroll-card]').length).toBeGreaterThan(3)
    expect(host.querySelector('[data-hscroll-year]').textContent).toMatch(/^\d{4}$/)

    host.innerHTML = templates['filter-grid'](parsePhotos('p02,p16,p30'))
    expect([...host.querySelectorAll('[data-flip-item]')].map((el) => el.dataset.category)).toEqual(['Планеты', 'Туманности', 'Запуски'])

    host.innerHTML = templates.destinations()
    expect(host.querySelectorAll('[data-fslide]').length).toBe(6)
    expect(host.querySelectorAll('[data-fslide-stat]').length).toBe(18)
    // Первый слайд грузится сразу, остальные — лениво.
    expect(host.querySelector('[data-fslide] img').getAttribute('loading')).toBe('eager')
  })

  it('renderSlots заполняет и снимает пометку слота', () => {
    document.body.innerHTML = '<div data-render="ring" data-photos="p01,p02"></div><div data-render="nope"></div>'

    expect(renderSlots()).toBe(1)
    expect(document.querySelectorAll('[data-ring-card]')).toHaveLength(2)
    expect(document.querySelector('[data-render="ring"]')).toBeNull()
  })
})
