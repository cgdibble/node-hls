const { isSuccess, success } = require('consistent-failables/failable')
const equal = require('assert').deepEqual
const {
  createManifest,
  findVideoLength,
  addOpenTag,
  addVersionTag,
  findTargetDuration,
  greaterThan,
  extractFrameTimeAsInt,
  extractTimes,
  extractDiffFromList,
  isolateSegmentDurations,
  mediaSequence,
  iFrameOnlyTag
} = require('./manifest')
const { map } = require('ramda')
const expectedManifestTopHalf = ['#EXTM3U', '#EXT-X-VERSION:4', '#EXT-X-TARGETDURATION:4', '#EXT-X-MEDIA-SEQUENCE:0', '#EXT-X-I-FRAMES-ONLY'].join('\n')

describe('manifest.js', () => {
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
  describe('generate()', () => {
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

  describe('iFrameOnlyTag()', () => {
    it('should add the tag', () => {
      const tag = '#EXT-X-I-FRAMES-ONLY'
      const result = iFrameOnlyTag([])
      equal(result, [tag])
    })
  })

  describe.skip('segmentDuration()', () => {
    it('should determine duration of each segment', () => {
      const result = isolateSegmentDurations(iFrames)
      // Need to do difference between iframe times, and the last one is the time from there to end of clip
      // need to provide all the frames, or pass in the length of the vid (aka the pkt_pst_time of any vid frame)
      equal(isSuccess(result), true)
      equal(result.payload, map(num => parseFloat(num), ['0.00000', '2.000000', '4.000000']))
    })
  })

  describe('buildKeyFrameBlock()', () => {
    // iterate over the frames, and use that data to build the entry for each individual frame
    // this should be a pipe itself, so each "frame" gets data such as: EXTINF = segment duration, EXT-X-BYTERANGE = pkt_size@pkt_pos
  })


  describe('findVideoLength()', () => {
    it('should return vid length', () => {
      const expected = 4
      const length = findVideoLength(iFrames)
      equal(length, expected)
    })
  })
})
