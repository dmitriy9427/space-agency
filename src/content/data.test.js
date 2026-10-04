import { describe, expect, it } from 'vitest'
import { DESTINATIONS } from './destinations.js'
import { MISSIONS } from './missions.js'
import { CATEGORIES, PHOTOS, categoryOf, getPhoto } from './photos.js'

describe('content: данные страниц', () => {
  it('у каждой миссии и направления есть существующее фото', () => {
    MISSIONS.forEach((mission) => expect(getPhoto(mission.photo), mission.title).toBeTruthy())
    DESTINATIONS.forEach((place) => expect(getPhoto(place.photo), place.name).toBeTruthy())
  })

  it('годы миссий идут по порядку', () => {
    const years = MISSIONS.map((m) => Number(m.year))

    expect([...years].sort((a, b) => a - b)).toEqual(years)
  })

  it('у каждого направления три показателя', () => {
    DESTINATIONS.forEach((place) => expect(place.stats).toHaveLength(3))
  })

  it('каждое фото попадает в какую-то категорию фильтра', () => {
    PHOTOS.forEach((photo) => expect(Object.keys(CATEGORIES), photo.id).toContain(categoryOf(photo)))
    expect(categoryOf({ kind: 'Неизвестно' })).toBe('Другое')
  })
})
