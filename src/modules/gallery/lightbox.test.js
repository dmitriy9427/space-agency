import { describe, expect, it, vi } from 'vitest'
import { gsap } from '../../core/gsap.js'
import { mount } from '../../../test/helpers.js'
import { createLightbox } from './lightbox.js'

// Промотать до конца все верхнеуровневые анимации (и твины, и таймлайны — Flip возвращает таймлайн).
const finish = () => gsap.globalTimeline.getChildren(false, true, true).forEach((animation) => animation.progress(1))

describe('gallery/lightbox (Flip)', () => {
  it('переносит ту же картинку в окно и возвращает обратно', () => {
    mount('<div class="card"><img src="/photos/p13.jpg" alt="Уран" width="1280" height="1280"><span class="caption"></span></div>')

    const img = document.querySelector('img')
    const card = document.querySelector('.card')
    const smoother = { paused: vi.fn() }
    const onOpen = vi.fn()
    const onClose = vi.fn()
    const box = createLightbox({ reduced: true, smoother, onOpen, onClose })

    box.open(img, { title: 'Уран', meta: 'Voyager 2', credit: 'NASA/JPL' })
    finish()
    expect(box.isOpen).toBe(true)
    expect(document.querySelector('[data-lightbox-frame]').contains(img)).toBe(true)
    expect(document.querySelector('.lightbox').hidden).toBe(false)
    expect(document.querySelector('.lightbox__title').textContent).toBe('Уран')
    expect(document.querySelector('[data-lightbox-frame]').style.getPropertyValue('--ar')).toBe('1.0000')
    expect(smoother.paused).toHaveBeenCalledWith(true)
    expect(onOpen).toHaveBeenCalled()

    // Повторный open во время открытого — игнорируется.
    box.open(img)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    finish()
    expect(box.isOpen).toBe(false)
    expect(card.firstElementChild).toBe(img) // вернулась на своё место (перед подписью)
    expect(document.querySelector('.lightbox').hidden).toBe(true)
    expect(smoother.paused).toHaveBeenLastCalledWith(false)
    expect(onClose).toHaveBeenCalled()

    box.destroy()
    expect(document.querySelector('.lightbox')).toBeNull()
  })

  it('закрывается по клику на фон; destroy при открытом окне возвращает картинку', () => {
    mount('<div class="card"><img src="/a.jpg" alt=""></div>')

    const img = document.querySelector('img')
    const box = createLightbox({ reduced: true })

    box.open(img)
    finish()
    document.querySelector('.lightbox__backdrop').click()
    finish()
    expect(box.isOpen).toBe(false)

    box.open(img)
    finish()
    box.destroy()
    expect(document.querySelector('.card').contains(img)).toBe(true)
  })
})
