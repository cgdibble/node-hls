const { isSuccess } = require('consistent-failables/failable')
const equal = require('assert').deepEqual
const { createManifest, addOpenTag, addVersionTag, findTargetDuration, greaterThan, extractFrameTimeAsInt, extractTimes } = require('./manifest')

const expectedManifestTopHalf = '#EXTM3U\n#EXT-X-VERSION:4\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-I-FRAMES-ONLY'


describe('manifest.js', () => {
  const iFrames = [
    {
      pkt_dts_time: '0.000000',
      pkt_pos: '40223',
      pkt_size: '1222',
      pict_type: 'I'
    },
    { pkt_dts_time: '2.000000',
      pkt_pos: '159174',
      pkt_size: '4576',
      pict_type: 'I'
    },
    { pkt_dts_time: '4.000000',
      pkt_pos: '224053',
      pkt_size: '5503',
      pict_type: 'I'
    }
  ]
  describe.skip('generate()', () => {
    it('should return correctly formatted keyframe manifest', () => {
      const iFrames = [
        {
          pkt_dts_time: '0.000000',
          pkt_pos: '48',
          pkt_size: '293393',
          pict_type: 'I'
        },
        {
          pkt_dts_time: '4.838167',
          pkt_pos: '9145933',
          pkt_size: '160962',
          pict_type: 'I'
        }
      ]

      const result = createManifest(iFrames)
      equal(isSuccess(result), true)
      equal(result.payload, expectedManifestTopHalf)
    })
  })

  describe('addOpenTag()', () => {
    it('should return a string with m3u8 opening tag', () => {
      const expectedResult = '#EXTM3U'
      const result = addOpenTag()
      equal(isSuccess(result), true)
      equal(result.payload, expectedResult)
    })
  })

  describe('addVersionTag()', () => {
    it('should append the version tag', () => {
      const version = 4
      const expectedResult = [`#EXT-X-VERSION:${version}`]
      const result = addVersionTag(version)([])
      equal(isSuccess(result), true)
      equal(result.payload, expectedResult)
    })
  })

  describe('findTargetDuration()', () => {
    it('should return the target duration', () => {
      const iFrames = [
        {
          pkt_dts_time: '0.000000',
          pkt_pos: '40223',
          pkt_size: '1222',
          pict_type: 'I'
        },
        { pkt_dts_time: '2.000000',
          pkt_pos: '159174',
          pkt_size: '4576',
          pict_type: 'I'
        },
        { pkt_dts_time: '4.000000',
          pkt_pos: '224053',
          pkt_size: '5503',
          pict_type: 'I'
        }
      ]
      const expectedResult = 2
      const result = findTargetDuration(iFrames)
      equal(isSuccess(result), true)
      equal(result.payload, expectedResult)
    })
  })
  describe('greaterThan()', () => {
    it('should return the larger number', () => {
      const result = greaterThan(5,4)
      equal(result, 5)
    })

    it('should return the larger number again', () => {
      const result = greaterThan(4,5)
      equal(result, 5)
    })
  })

  describe('extractFrameTimeAsInt()', () => {
      it('should return the keyframe decode time', () => {
        const frame = {
          pkt_dts_time: '4.000000',
          pkt_pos: '224053',
          pkt_size: '5503',
          pict_type: 'I'
        }

        const result = extractFrameTimeAsInt(frame)
        equal(result === parseInt(frame.pkt_dts_time), true)
      })
  })

  describe('extractTimes()', () => {
    it('should return list of time integers', () => {
      const result = extractTimes(iFrames)
      equal(result, [0, 2, 4])
    })
  })
})
