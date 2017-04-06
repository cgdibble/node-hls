const equal = require('assert').deepEqual
const co = require('co')
const { clone } = require('ramda')
const { generateMasterManifest,
        findMasterTargetDuration,
        buildRenditionBlock,
        ffprobeIfNecessary
      } = require('./masterManifest')
const { isSuccess } = require('consistent-failables/failable')

describe('masterManifest.js', () => {
  const expectedManifest = [
    '#EXTM3U',
    '#EXT-X-VERSION:4',
    '#EXT-X-TARGETDURATION:4',
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=500000,RESOLUTION=480x270',
    '480x270.m3u8',
    '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1000000,RESOLUTION=640x360',
    '640x360.m3u8',
    '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2000000,RESOLUTION=1280x720',
    '1280x720.m3u8',
    '#EXT-X-ENDLIST'
  ].join('\n')

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

  const renditions = [
    {
      resolution: '480x270',
      bandwidth: 500000,
      file: '480x270.m3u8',
      gop: 4
    },
    {
      resolution: '640x360',
      bandwidth: 1000000,
      file: '640x360.m3u8',
      gop: 4
    },
    {
      resolution: '1280x720',
      bandwidth: 2000000,
      file: '1280x720.m3u8',
      gop: 4
    },
  ]

  it('should add header tags', () => {
    const frames = clone(iFrames)
    frames.push(bFrame)
    const result = generateMasterManifest(renditions, frames)
    equal(result, expectedManifest)
  })

  describe('findTargetDurationsOfVariants()', () => {
    it('should return target duration tag with correct duration', () => {
      const result = findMasterTargetDuration(renditions)([])
      equal(result, [`#EXT-X-TARGETDURATION:4`])
    })
  })

  describe('buildRenditionBlock()', () => {
    const expectedBlock = ['#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=500000,RESOLUTION=480x270', '480x270.m3u8']
    const result = buildRenditionBlock([renditions[0]])([])
    equal(result, expectedBlock)
  })

  describe.skip('ffprobeIfNecessary()', () => {
    // if no GOP info is provided on a rendition, then FFPROBE needs to be run
    // to determine that info
    //do this BEFORE piping along manifest
    it('should return all necessary data about renditions', co.wrap(function * () {
      const renditions = {
        video: './keyFrameRenditions/pluralsight1024x768Vid.mp4', // should this be added? Or an error state returned
        resolution: '1280x720',
        bandwidth: 2000000,
        file: '1280x720.m3u8',
      }
      const result = yield ffprobeIfNecessary([renditions])
      console.log('result:', result)
      equal(isSuccess(result), true)
      equal(result.payload[0].gop !== undefined, true)
    }))
  })
})

// http://stackoverflow.com/questions/30174236/creating-m3u8-file-that-points-to-other-m3u8-files
// #EXTM3U
// #EXT-X-VERSION:4
// #EXT-X-TARGETDURATION:7
// #EXT-X-MEDIA-SEQUENCE:4
// #EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=500000,RESOLUTION=480x270
// 480x270.m3u8
// #EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1000000,RESOLUTION=640x360
// 640x360.m3u8
// #EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2000000,RESOLUTION=1280x720
// 1280x720.m3u8
// #EXT-X-ENDLIST




// #EXT-X-STREAM-INF:BANDWIDTH=1193108,CODECS="avc1.77.30,mp4a.40.2",RESOLUTION=640x360,SUBTITLES="subs"
// 0640/0640.m3u8
// #EXT-X-STREAM-INF:BANDWIDTH=6807315,CODECS="avc1.580028,mp4a.40.2",RESOLUTION=1920x1080,SUBTITLES="subs"
// 1920/1920.m3u8
// #EXT-X-STREAM-INF:BANDWIDTH=4668760,CODECS="avc1.4d401f,mp4a.40.2",RESOLUTION=1280x720,SUBTITLES="subs"
// 1280/1280.m3u8
// #EXT-X-STREAM-INF:BANDWIDTH=2805788,CODECS="avc1.4d401f,mp4a.40.2",RESOLUTION=960x540,SUBTITLES="subs"
// 0960/0960.m3u8
// #EXT-X-STREAM-INF:BANDWIDTH=532635,CODECS="avc1.42c015,mp4a.40.5",RESOLUTION=480x270,SUBTITLES="subs"
// 0480/0480.m3u8
