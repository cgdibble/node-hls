const R = require('ramda');
const { success, failure } = require('consistent-failables/failable')

const manifestTopHalf = ['#EXTM3U','#EXT-X-VERSION:4','#EXT-X-TARGETDURATION:2','#EXT-X-MEDIA-SEQUENCE:0','#EXT-X-I-FRAMES-ONLY']

const createManifest = (frames) => {

  return success(manifestTopHalf)
}

const addOpenTag = () => {
  return success('#EXTM3U')
}

const addVersionTag = (version, manifestLines) => {
  return (manifestLines) => {
    manifestLines.push(`#EXT-X-VERSION:${version}`)
    return success(manifestLines)
  }
}

const findTargetDuration = (frames) => {
  const largestDuration = R.pipe(extractTimes, R.mapAccum(findLargestDuration, 0))(frames)//R.reduce(greaterThan, 0, frames))
  console.log('largestDuration::', largestDuration)
  return success(largestDuration)
}
// turn into list of durations
// round duration DOWN to nearest integer -->parseInt
// compare to find highest diff

const findLargestDuration = (durations) => {
  // [0,2,4]
  const shiftedDurations = R.pipe(R.slice(0,0), append(durations))
  return shiftedDurations
} // Could this be a value passed from the initial hls initialization??

const append = (array, newValue) => {
  return R.append(newValue, array)
}

const greaterThan = (a, b) => {
  if (a > b) return a
  return b
}

const extractTimes = (frames) => {
  return R.map(extractFrameTimeAsInt, frames)
}

const extractFrameTimeAsInt = (frame) => {
  return parseInt(frame.pkt_dts_time)
}

module.exports = {
  createManifest,
  addOpenTag,
  addVersionTag,
  findTargetDuration,
  greaterThan,
  extractFrameTimeAsInt,
  extractTimes
}

// Create a series of functions, each of which adds a line to the m3u8 file, then pipe them together.
