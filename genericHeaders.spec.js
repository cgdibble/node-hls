const equal = require('assert').deepEqual
const { addOpenTag, addVersionTag, findTargetDuration, extractTimes, extractFrameTimeAsInt, getLargestDuration, greaterThan, extractDiffFromList, mediaSequence, closingTag } = require('./genericHeaders')

describe('genericHeaders.js', () => {
  const iFrames = [
    {
      pkt_dts_time: '0.000000',
      pkt_pts_time: '0.000000',
      pkt_pos: '40223',
      pkt_size: '1222',
      pict_type: 'I'
    },
    {
      pkt_dts_time: '2.000000',
      pkt_pts_time: '2.000000',
      pkt_pos: '159174',
      pkt_size: '4576',
      pict_type: 'I'
    },
    {
      pkt_dts_time: '4.000000',
      pkt_pts_time: '4.000000',
      pkt_pos: '224053',
      pkt_size: '5503',
      pict_type: 'I'
    }
  ]
  describe('addOpenTag()', () => {
    it('should return a string with m3u8 opening tag', () => {
      const expectedResult = ['#EXTM3U']
      const result = addOpenTag()
      equal(result, expectedResult)
    })
  })

  describe('addVersionTag()', () => {
    it('should append the version tag', () => {
      const version = 4
      const expectedResult = [`#EXT-X-VERSION:${version}`]
      const result = addVersionTag(version)([])
      equal(result, expectedResult)
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
      const largestDuration = 2
      const expectedResult = [`#EXT-X-TARGETDURATION:${largestDuration}`]
      const result = findTargetDuration(iFrames)([])
      equal(result, expectedResult)
    })

    describe('extractDiffFromList()', () => {
      it('should return the diff', () => {
        const list = [[2,0],[2,1,5]]
        const result = extractDiffFromList(list)
        equal(result, 2)
      })
    })

    describe('greaterThan()', () => {
      it('should return the larger number', () => {
        const result = greaterThan([0, 0], 4)
        equal(result, [[4,4], 4])
      })

      it('should return the larger number again', () => {
        const result = greaterThan([0, 2], 5)
        equal(result, [[3, 5], 5])
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
  })

  describe('mediaSequence()', () => {
    it('should include that line', () => {
      const sequence = 0
      const result = mediaSequence(sequence)([])
      equal(result, [`#EXT-X-MEDIA-SEQUENCE:${sequence}`])
    })
  })

  describe('closingTag()', () => {
    it('should add closing tag', () => {
      const result = closingTag([])
      equal(result, ['#EXT-X-ENDLIST'])
    })
  })
})
