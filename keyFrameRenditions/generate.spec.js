const equal = require('assert').deepEqual
const { isSuccess, isFailure } = require('consistent-failables/failable')
const { isolateIFrames, isIFrame } = require('./generate')

describe.only('generate.js', () => {
  describe('isolateIFrames()', () => {
    it('should filter out I frames', () => {
      const iFrame = {
        pict_type: 'I'
      }
      const bFrame = {
        pict_type: 'B'
      }
      const pFrame = {
        pict_type: 'P'
      }

      const frames = [iFrame, bFrame, pFrame]
      const expectedFrames = [iFrame]

      const result = isolateIFrames(frames)
      equal(result, expectedFrames)
    })
  })

  describe('isIFrame()', () => {
    it('should return success', () => {
      const frame = {pict_type: 'I'}
      const result = isIFrame(frame)
      equal(result, true)
    })

    it('should return failure', () => {
      const frame = {pict_type: 'B'}
      const result = isIFrame(frame)
      equal(result, false)
    })
  })
})
