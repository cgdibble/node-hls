const { map, pipe, append, mapAccum, filter } = require('ramda');
const { success, failure } = require('consistent-failables/failable')

const manifestTopHalf = ['#EXTM3U',
                        '#EXT-X-VERSION:4',
                        '#EXT-X-TARGETDURATION:2',
                        '#EXT-X-MEDIA-SEQUENCE:0',
                        '#EXT-X-I-FRAMES-ONLY']

const createManifest = (videoFile, frames) => {
  const length = findVideoLength(frames)
  const iFrames = isolateIFrames(frames)
  const manifest = pipe(addOpenTag, addVersionTag(4), findTargetDuration(iFrames), mediaSequence(0), iFrameOnlyTag, buildKeyFrameBlock(videoFile, length, iFrames), closingTag)()
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
  const largestDuration = pipe(extractTimes, getLargestDuration)(frames)
  manifest.push(`#EXT-X-TARGETDURATION:${largestDuration}`)
  return manifest
}

const myAppend = (array, newValue) => {
  return append(newValue, array)
}

const getLargestDuration = (val) => {
  const result = mapAccum(greaterThan, [0, 0])(val)
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
  return map(extractFrameTimeAsInt, frames)
}

const extractFrameTimeAsInt = (frame) => {
  return parseInt(frame.pkt_dts_time)
}

const mediaSequence = val => manifest => {
  manifest.push(`#EXT-X-MEDIA-SEQUENCE:${val}`)
  return manifest
}

const segmentDuration = (videoLength, currentFrame, nextFrame) => {
  // next pkt_pts_time - current pkt_pts_time --> floats,  --> round(5)???
  const currentTime = parseFloat(currentFrame.pkt_pts_time)
  if (nextFrame === undefined) return videoLength - currentTime
  let nextTime = parseFloat(nextFrame.pkt_pts_time)
  return nextTime - currentTime
}

const iFrameOnlyTag = (manifest) => {
  manifest.push('#EXT-X-I-FRAMES-ONLY')
  return manifest
}

const buildKeyFrameBlock = (videoFile, videoLength, frames) => (manifest) => {
  frames.map((frame, i) => {
    const duration = segmentDuration(videoLength, frame, frames[i+1])
    manifest.push(`#EXTINF:${duration}`)
    const byteRange = frameByteRange(frame)
    manifest.push(byteRange)
    manifest.push(videoFile)
  })
  return manifest
}

const frameByteRange = (frame) => {
  return `#EXT-X-BYTERANGE:${frame.pkt_size}@${frame.pkt_pos}`
}

const closingTag = (manifest) => {
  manifest.push('#EXT-X-ENDLIST')
  return manifest
}

const isolateIFrames = (frames) => {
  return filter(isIFrame, frames)
}

const isIFrame = (frame) => {
  if (frame.pict_type === 'I') return true
  return false
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
  segmentDuration,
  findVideoLength,
  mediaSequence,
  iFrameOnlyTag,
  buildKeyFrameBlock,
  frameByteRange,
  isolateIFrames,
  isIFrame,
  closingTag
}
