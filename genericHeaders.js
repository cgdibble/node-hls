const { map, pipe, append, mapAccum, filter } = require('ramda');
const { success, failure } = require('consistent-failables/failable')

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

const extractTimes = (frames) => {
  return map(extractFrameTimeAsInt, frames)
}

const extractFrameTimeAsInt = (frame) => {
  return parseInt(frame.pkt_dts_time)
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

const mediaSequence = val => manifest => {
  /*The EXT-X-MEDIA-SEQUENCE tag indicates the sequence number
   of the first URL that appears in a playlist file.*/
  manifest.push(`#EXT-X-MEDIA-SEQUENCE:${val}`)
  return manifest
}

const closingTag = (manifest) => {
  manifest.push('#EXT-X-ENDLIST')
  return manifest
}

module.exports = {
  addOpenTag,
  addVersionTag,
  findTargetDuration,
  extractTimes,
  extractFrameTimeAsInt,
  getLargestDuration,
  greaterThan,
  extractDiffFromList,
  mediaSequence,
  closingTag
}
