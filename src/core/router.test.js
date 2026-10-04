import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRouter, fetchPage, isSamePage, normalizePath, shouldIntercept } from './router.js'

const here = new URL('http://site.test/missions.html')
const link = (href, attrs = {}) => {
  const a = document.createElement('a')

  a.href = new URL(href, here).href
  Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v))
  return a
}
const click = (init = {}) => ({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, ...init })

describe('core/router', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('normalizePath: / и /index.html — одно и то же', () => {
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('/index.html')).toBe('/')
    expect(normalizePath('/missions.html')).toBe('/missions.html')
    expect(normalizePath('/docs/')).toBe('/docs')
  })

  it('isSamePage сравнивает путь без якоря', () => {
    expect(isSamePage(new URL('http://a/#x'), new URL('http://a/index.html'))).toBe(true)
    expect(isSamePage(new URL('http://a/missions.html'), new URL('http://a/'))).toBe(false)
  })

  it('перехватывает обычный клик по своей странице', () => {
    expect(shouldIntercept(click(), link('/'), here)).toBe(true)
    expect(shouldIntercept(click(), link('/#fleet'), here)).toBe(true) // другая страница + якорь
  })

  it('не трогает чужие домены, новые вкладки, якоря на этой странице и т. п.', () => {
    expect(shouldIntercept(click(), null, here)).toBe(false)
    expect(shouldIntercept(click({ defaultPrevented: true }), link('/'), here)).toBe(false)
    expect(shouldIntercept(click({ metaKey: true }), link('/'), here)).toBe(false)
    expect(shouldIntercept(click({ button: 1 }), link('/'), here)).toBe(false)
    expect(shouldIntercept(click(), link('/', { target: '_blank' }), here)).toBe(false)
    expect(shouldIntercept(click(), link('/', { download: '' }), here)).toBe(false)
    expect(shouldIntercept(click(), link('/', { 'data-no-router': '' }), here)).toBe(false)
    expect(shouldIntercept(click(), link('https://nasa.gov/'), here)).toBe(false)
    expect(shouldIntercept(click(), link('/missions.html#top'), here)).toBe(false)
  })

  it('createRouter: клик по ссылке и «назад» зовут onNavigate', () => {
    const onNavigate = vi.fn()
    const router = createRouter(onNavigate)
    const a = document.createElement('a')

    a.href = '/missions.html'
    document.body.appendChild(a)

    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })

    a.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(onNavigate).toHaveBeenCalledWith(expect.any(URL), { push: true })
    expect(onNavigate.mock.calls[0][0].pathname).toBe('/missions.html')

    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(onNavigate).toHaveBeenLastCalledWith(expect.any(URL), { push: false })

    router.destroy()
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })

  it('fetchPage разбирает HTML и сообщает об ошибке ответа', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<title>Т</title><main data-page="x"></main>' })))
    const doc = await fetchPage('/x.html')

    expect(doc.title).toBe('Т')
    expect(doc.querySelector('main').dataset.page).toBe('x')

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    await expect(fetchPage('/nope.html')).rejects.toThrow('404')
  })
})
