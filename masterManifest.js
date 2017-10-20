const { addOpenTag, addVersionTag, mediaSequence, closingTag } = require('./genericHeaders')
const { filter, pipe, map } = require('ramda')
const ffmpeg = require('fluent-ffmpeg')
const co = require('co')
const { success, isFailure } = require('consistent-failables/failable')
const exec = require('executive')
/*
  https://developer.apple.com/library/content/technotes/tn2288/_index.html
  Playlists that specify byte range media segments require protocol version 4.
  In addition, they must include EXT-X-TARGETDURATION and EXT-X-MEDIA-SEQUENCE tags,
    and the media URI must reside on a separate line.
*/

const generateMasterManifest = co.wrap(function * (renditions) {
  const newRenditionsResult = yield updateRenditions(renditions)
  if (isFailure(newRenditionsResult)) return newRenditionsResult
  const updatedRenditions = newRenditionsResult.payload
  const result = pipe(
    addOpenTag,
    addVersionTag(4),
    findMasterTargetDuration(updatedRenditions),
    mediaSequence(0),
    buildRenditionBlock(updatedRenditions),
    closingTag
  )().join('\n')
  return success(result)
})

const updateRenditions = co.wrap(function * (renditions) {
  const addGopResult = yield genericRenditionUpdating(getRenditionGOP, 'gop', renditions)
  if (isFailure(addGopResult)) return addGopResult
  const goppedRenditions = addGopResult.payload
  const addBandwidthResult = yield genericRenditionUpdating(getAppropriateBandwidth, 'bandwidth', goppedRenditions)
  if (isFailure(addBandwidthResult)) return addBandwidthResult
  const renditionsToSize = addBandwidthResult.payload
  const getSizeResult = yield genericRenditionUpdating(getRenditionSize, 'dimensions', renditionsToSize)
  if (isFailure(getSizeResult)) return getSizeResult
  return getSizeResult
})


const findMasterTargetDuration = renditions => manifest => {
  let largest = 0
  const filterDurations = filter(r => {
    if (r.gop > largest) {
      largest = r.gop
      return 'hello'
    }
  }, renditions)
  const largestDuration  = filterDurations[0].gop
  manifest.push(`#EXT-X-TARGETDURATION:${largestDuration}`)
  return manifest
}

const buildRenditionBlock = renditions => manifest => {
  renditions.map(r => {
    const { width, height } = r.dimensions
    const resolution = `${width}x${height}`
    let programId = r.programId || 1
    manifest.push(`#EXT-X-STREAM-INF:PROGRAM-ID=${programId},BANDWIDTH=${r.bandwidth},RESOLUTION=${resolution}`)
    manifest.push(`${resolution}.m3u8`)
  })
  return manifest
}

const filterIFrames = (allVideoFrames) => {
  return filter(f => f.pict_type === 'I', allVideoFrames)
}

const getVideoFrameData = co.wrap(function * (video) {
  try {
    const ffprobeResult = yield exec.quiet(`ffprobe -print_format json -show_frames -select_streams v:0 -show_entries frame=pkt_dts_time,pict_type,pkt_size,pkt_pos,pkt_pts_time ${video}`)
    const parsedFrameData = JSON.parse(ffprobeResult.stdout).frames
    return success(parsedFrameData)
  } catch (err) {
    return failure(err.toString())
  }
})

const genericRenditionUpdating = co.wrap(function * (fn, newProperty, renditions) {
  const updatedRenditions = []
  const newPropObject = {}
  for (let i = 0; i < renditions.length; i++) {
    const currentRendition = renditions[i]
    const result = yield fn(currentRendition)
    if(isFailure(result)) return result
    newPropObject[newProperty] = result.payload
    const newRendition = Object.assign({}, currentRendition, newPropObject)
    updatedRenditions.push(newRendition)
  }
  return success(updatedRenditions)
})

const getAppropriateBandwidth = co.wrap(function * (rendition) {
  const { video } = rendition
  const ffprobeResult = yield exec.quiet(`ffprobe -print_format json -show_streams ${video}`) // this needs just the basic ffprobe output
  const parsedData = JSON.parse(ffprobeResult.stdout)
  const videoStream = parsedData.streams[0]
  const audioStream = parsedData.streams[1]
  const bandwidth = parseInt(videoStream.bit_rate) + parseInt(audioStream.bit_rate)
  return success(bandwidth)
})

const getRenditionGOP = co.wrap(function * (rendition) {
  const { video } = rendition
  const frameDataResult = yield getVideoFrameData(video)
  if(isFailure(frameDataResult)) return frameDataResult
  const frames = frameDataResult.payload
  const IFrames = filterIFrames(frames)
  let highestGop = 0
  for (let i = 0; i < IFrames.length - 1; i++) {
    const currentFrame = IFrames[i]
    const nextFrame = IFrames[i + 1]
    const currentGop = nextFrame.pkt_dts_time - currentFrame.pkt_dts_time
    if (currentGop > highestGop) {
      highestGop = currentGop
    }
  }
  return success(highestGop)
})

const getRenditionSize = co.wrap(function * (rendition) {
  const { video } = rendition
  const ffprobeResult = yield exec.quiet(`ffprobe -print_format json -show_streams ${video}`)
  const parsedData = JSON.parse(ffprobeResult.stdout)
  const videoStream = parsedData.streams[0]
  const { height, width } = videoStream
  return success({ width, height })
})

module.exports = {
  generateMasterManifest,
  findMasterTargetDuration,
  buildRenditionBlock,
  getRenditionGOP,
  getAppropriateBandwidth,
  getRenditionSize
}
