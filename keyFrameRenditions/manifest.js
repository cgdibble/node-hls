const { map, pipe, append, mapAccum, filter } = require('ramda');
const { success, failure } = require('consistent-failables/failable')
const { addOpenTag,
        addVersionTag,
        findTargetDuration,
        extractTimes,
        extractFrameTimeAsInt,
        getLargestDuration,
        greaterThan,
        extractDiffFromList,
        mediaSequence,
        closingTag } = require('../genericHeaders')

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

const myAppend = (array, newValue) => {
  return append(newValue, array)
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
  return `#EXT-X-BYTERANGE:${frame.pkt_size}@${frame.pkt_pos}` // ${nextFrame.pkt_pos - currentFrame.pkt_pos}@currentFrame.pkt.pos
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
  segmentDuration,
  findVideoLength,
  iFrameOnlyTag,
  buildKeyFrameBlock,
  frameByteRange,
  isolateIFrames,
  isIFrame,
}
