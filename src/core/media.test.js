import { describe, expect, it, vi } from 'vitest'
import { loadImage, loopSegment, pauseVideo, playVideo } from './media.js'

describe('core/media', () => {
  it('loadImage: успех и ошибка', async () => {
    const OriginalImage = window.Image

    class FakeImage {
      set src(value) {
        this._src = value
        setTimeout(() => (value.includes('bad') ? this.onerror() : this.onload()), 0)
      }
      get src() {
        return this._src
      }
    }

    window.Image = FakeImage
    globalThis.Image = FakeImage
    try {
      await expect(loadImage('/ok.jpg')).resolves.toBeInstanceOf(FakeImage)
      await expect(loadImage('/bad.jpg')).rejects.toThrow('/bad.jpg')
    } finally {
      window.Image = OriginalImage
      globalThis.Image = OriginalImage
    }
  })

  it('playVideo: с первой попытки ставит старт, ошибка play не выбрасывается', async () => {
    const video = document.createElement('video')

    video.play = vi.fn(() => Promise.resolve())
    expect(await playVideo(video, 4)).toBe(true)
    expect(video.currentTime).toBe(4)
    expect(video.muted).toBe(true)

    video.currentTime = 10
    await playVideo(video, 4)
    expect(video.currentTime).toBe(10)

    video.play = vi.fn(() => Promise.reject(new Error('NotAllowedError')))
    expect(await playVideo(video)).toBe(false)
    expect(await playVideo(null)).toBe(false)
  })

  it('pauseVideo безопасен без видео', () => {
    const video = { pause: vi.fn() }

    pauseVideo(video)
    pauseVideo(null)
    expect(video.pause).toHaveBeenCalled()
  })
})

describe('core/media: loopSegment', () => {
  it('возвращает видео к началу отрезка, дойдя до конца', () => {
    const video = document.createElement('video')
    const stop = loopSegment(video, 2, 5)

    video.currentTime = 3
    video.dispatchEvent(new Event('timeupdate'))
    expect(video.currentTime).toBe(3)
    video.currentTime = 5.1
    video.dispatchEvent(new Event('timeupdate'))
    expect(video.currentTime).toBe(2)
    // Перемотали раньше отрезка — тоже к началу.
    video.currentTime = 0
    video.dispatchEvent(new Event('timeupdate'))
    expect(video.currentTime).toBe(2)

    stop()
    video.currentTime = 9
    video.dispatchEvent(new Event('timeupdate'))
    expect(video.currentTime).toBe(9)
  })

  it('без конца отрезка или видео ничего не делает', () => {
    const video = document.createElement('video')

    loopSegment(video, 2, undefined)()
    loopSegment(null, 0, 5)()
    video.currentTime = 7
    video.dispatchEvent(new Event('timeupdate'))
    expect(video.currentTime).toBe(7)
  })
})
