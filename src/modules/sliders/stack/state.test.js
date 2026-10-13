import { describe, expect, it } from 'vitest'
import { VISIBLE_DEPTH, createStack, createVelocityTracker, stackPose, swipeDecision } from './state.js'

describe('sliders/stack/state', () => {
  it('next/prev крутят стопку по кругу', () => {
    const stack = createStack(3)

    expect(stack.top).toBe(0)
    expect(stack.next()).toBe(0)
    expect(stack.order).toEqual([1, 2, 0])
    expect(stack.depthOf(0)).toBe(2)
    expect(stack.prev()).toBe(0)
    expect(stack.order).toEqual([0, 1, 2])
  })

  it('stackPose: верхняя ровная, глубокие спрятаны', () => {
    const top = stackPose(0, 6)
    const deep = stackPose(VISIBLE_DEPTH + 1, 6)

    expect(top).toMatchObject({ y: 0, scale: 1, rotation: 0, autoAlpha: 1, zIndex: 6 })
    expect(deep.autoAlpha).toBe(0)
    expect(stackPose(1, 6).rotation).toBeLessThan(0)
    expect(stackPose(2, 6).rotation).toBeGreaterThan(0)
  })

  it('swipeDecision: по расстоянию, по скорости или назад', () => {
    expect(swipeDecision(200, 0, 300)).toBe(1)
    expect(swipeDecision(-200, 0, 300)).toBe(-1)
    expect(swipeDecision(40, 1200, 300)).toBe(1)
    expect(swipeDecision(-40, -1200, 300)).toBe(-1)
    expect(swipeDecision(40, -1200, 300)).toBe(0)
    expect(swipeDecision(40, 100, 300)).toBe(0)
  })

  it('трекер скорости по окну', () => {
    const tracker = createVelocityTracker(100)

    expect(tracker.velocity).toBe(0)
    tracker.push(0, 0)
    tracker.push(50, 50)
    tracker.push(100, 100)
    expect(tracker.velocity).toBeCloseTo(1000)
    tracker.push(100, 300)
    tracker.push(100, 400)
    expect(tracker.velocity).toBe(0)
    tracker.reset()
    tracker.push(0, 0)
    tracker.push(0, 0)
    expect(tracker.velocity).toBe(0)
  })
})
