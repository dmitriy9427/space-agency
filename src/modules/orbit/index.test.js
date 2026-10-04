import { describe, expect, it } from 'vitest'
import { parseMorphTargets } from './index.js'

// Сам модуль (DrawSVG, MorphSVG, MotionPath) опирается на геометрию SVG
// (getTotalLength, getBBox), которой нет в jsdom, — его проверяем в браузере.
describe('orbit', () => {
  it('parseMorphTargets', () => {
    expect(parseMorphTargets('#a, #b,,#c ')).toEqual(['#a', '#b', '#c'])
    expect(parseMorphTargets()).toEqual([])
  })
})
