const R = require('ramda')
const { success, failure } = require('consistent-failables/failable')
const childProcess = require('child_process')
let JSONStream = require('JSONStream')

// const extractFrames = (videoPath) => {
  const unencodedVideo = 'niceViewValley.MP4'
  const encodedVideo = 'encodedVid.mp4'
  const psVid = 'pluralsight1024x768Vid.mp4'
  let ffprobe = childProcess.spawn('ffprobe', ['-print_format', 'json', '-select_streams', 'v', '-show_frames', '-show_entries', 'frame=pkt_dts_time,pict_type,pkt_size,pkt_pos', '-i', psVid])

  ffprobe.once('close', function (code) {
    if (code) console.log("ERROR ERROR ERROR", code);
  })

  ffprobe.stdout
    .pipe(JSONStream.parse())
    .once('data', (data) => {
      // const iFrames =  isolateIFrames(data.frames)
      // console.log('iFrames::::', iFrames)
    })
// }

const isolateIFrames = (frames) => {
  return R.filter(isIFrame, frames)
}

const isIFrame = (frame) => {
  if (frame.pict_type === 'I') return true
  return false
}


module.exports = {
  // extractFrames
  isolateIFrames,
  isIFrame
}

// Extract just i frame data
// will then using the timestamp as the #EXTINF:... field work?
  // do those sync appropriately?
// what are the implications of the byterange value being fixed?
