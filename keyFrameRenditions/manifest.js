const R = require('ramda');
const { success, failure } = require('consistent-failables/failable')

const manifestTopHalf = ['#EXTM3U',
                        '#EXT-X-VERSION:4',
                        '#EXT-X-TARGETDURATION:2',
                        '#EXT-X-MEDIA-SEQUENCE:0',
                        '#EXT-X-I-FRAMES-ONLY']

const createManifest = (frames) => {
  const manifest = R.pipe(addOpenTag, addVersionTag(4), findTargetDuration(frames), mediaSequence(0), iFrameOnlyTag)()
  const length = findVideoLength(frames) // preapply length to segmentDuration
  return success(manifest.join('\n'))
}

const findVideoLength = (frames) => {
  return parseFloat(frames[frames.length - 1].pkt_pts_time)
}

const addOpenTag = () => {
  return ['#EXTM3U']
}

const addVersionTag = (version = 4) => (manifestLines) => {
  manifestLines.push(`#EXT-X-VERSION:${version}`)
  return manifestLines
}

const findTargetDuration = (frames) => (manifest) => {
  const largestDuration = R.pipe(extractTimes, getLargestDuration)(frames)
  manifest.push(`#EXT-X-TARGETDURATION:${largestDuration}`)
  return manifest
}

const append = (array, newValue) => {
  return R.append(newValue, array)
}

const getLargestDuration = (val) => {
  const result = R.mapAccum(greaterThan, [0, 0])(val)
  return extractDiffFromList(result)
}

const greaterThan = (accum, value) => {
  // [currentDiff, lastVal] = accum
  const diff = accum[0]
  const lastValue = accum[1]
  const currentDiff = value - lastValue
  if ( currentDiff > diff ) return [[currentDiff, value], value]
  return [[diff, value], value]
}

const extractDiffFromList = (list) => {
  return list[0][0]
}

const extractTimes = (frames) => {
  return R.map(extractFrameTimeAsInt, frames)
}

const extractFrameTimeAsInt = (frame) => {
  return parseInt(frame.pkt_dts_time)
}

const mediaSequence = val => manifest => {
  manifest.push(`#EXT-X-MEDIA-SEQUENCE:${val}`)
  return manifest
}

const isolateSegmentDurations = (frames) => {
  /*
    https://developer.apple.com/library/content/technotes/tn2288/_index.html ---> "I-Frame Playlist"
    EXTINF field in keyframe stuff :::::>>>>> This is the time between the presentation time of the I-Frame in the media segment and the presentation time of the next I-Frame in the playlist
  */
  // next pkt_pts_time - current pkt_pts_time --> floats,  --> round(5)???
  let durations = []
  for(let i = 0; i < frames.length; i++) {
    let currentDuration = parseFloat(frames[i].pkt_pts_time)
    let duration
    if (i + 1 === frames.length) {
      duration = currentDuration
    } else {
      let nextFrame = parseFloat(frames[i + 1].pkt_pts_time)
      duration = nextFrame - currentDuration
    }
    durations.push(duration)
  }
  return success(durations)
}

const iFrameOnlyTag = (manifest) => {
  manifest.push('#EXT-X-I-FRAMES-ONLY')
  return manifest
}

module.exports = {
  createManifest,
  addOpenTag,
  addVersionTag,
  findTargetDuration,
  greaterThan,
  extractFrameTimeAsInt,
  extractTimes,
  extractDiffFromList,
  isolateSegmentDurations,
  findVideoLength,
  mediaSequence,
  iFrameOnlyTag
}

// Create a series of functions, each of which adds a line to the m3u8 file, then pipe them together.
