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
  segmentDuration,
  mediaSequence,
  iFrameOnlyTag,
  buildKeyFrameBlock,
  frameByteRange,
  isolateIFrames,
  isIFrame,
  closingTag
} = require('./manifest')
const { map } = require('ramda')

const videoFile = 'myVideo_1234.ts'
const expectedManifestTopHalf = ['#EXTM3U', '#EXT-X-VERSION:4', '#EXT-X-TARGETDURATION:2', '#EXT-X-MEDIA-SEQUENCE:0', '#EXT-X-I-FRAMES-ONLY', `#EXTINF:2`, '#EXT-X-BYTERANGE:1222@40223', videoFile, `#EXTINF:2`, '#EXT-X-BYTERANGE:4576@159174', videoFile, `#EXTINF:1`, '#EXT-X-BYTERANGE:5503@224053', videoFile, '#EXT-X-ENDLIST'].join('\n')

describe('manifest.js', () => {
  // EXT-X-BYTERANGE = pkt_size@pkt_pos
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

  const bFrame = {
    pkt_dts_time: '5.000000',
    pkt_pts_time: '5.000000',
    pkt_pos: '224053',
    pkt_size: '5503',
    pict_type: 'B'
  }

  describe('generate()', () => {
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
      },
      bFrame
    ]
    it('should return correctly formatted keyframe manifest', () => {
      const frames = iFrames
      const result = createManifest(videoFile, frames)
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

  describe('buildKeyFrameBlock()', () => {
    // iterate over the frames, and use that data to build the entry for each individual frame
    // this should be a pipe itself, so each "frame" gets data such as: EXTINF = segment duration, EXT-X-BYTERANGE = pkt_size@pkt_pos
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
      }
    ]

    it('should add the EXTINF tag', () => {
      const tag1 = '#EXTINF'
      const tag2 = '#EXT-X-BYTERANGE'
      const videoFile = 'myAwesomeFilePath.ts'
      const result = buildKeyFrameBlock(videoFile, 3, iFrames)([])
      equal(result, [`${tag1}:2`, `${tag2}:${iFrames[0].pkt_size}@${iFrames[0].pkt_pos}`, videoFile, `${tag1}:1`, `${tag2}:${iFrames[1].pkt_size}@${iFrames[1].pkt_pos}`, videoFile])
    })
  })

  describe('frameByteRange()', () => {
    it('should assign byterange entry', () => {
      const tag = '#EXT-X-BYTERANGE'
      const frame = iFrames[0]
      const result = frameByteRange(frame)
      // EXT-X-BYTERANGE = pkt_size@pkt_pos
      equal(result, `${tag}:${frame.pkt_size}@${frame.pkt_pos}`)
    })
  })

  describe('segmentDuration()', () => {
    it('should determine duration of each segment', () => {
      const result = segmentDuration(5, iFrames[0], iFrames[1])
      equal(result, 2)
    })
  })

  describe('findVideoLength()', () => {
    it('should return vid length', () => {
      const expected = 4
      const length = findVideoLength(iFrames)
      equal(length, expected)
    })
  })

  describe('Have you accounted for this talk of 188bytes differences???', () => {
    /*
    As in here: https://gist.github.com/biomancer/8d139177f520b9dd3495
    mentioned here as well: http://stackoverflow.com/questions/23497782/how-to-create-byte-range-m3u8-playlist-for-hls

    */
  })

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

  describe('closingTag()', () => {
    it('should add closing tag', () => {
      const result = closingTag([])
      equal(result, ['#EXT-X-ENDLIST'])
    })
  })
})
