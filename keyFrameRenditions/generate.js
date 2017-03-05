const R = require('ramda')
const { success, failure } = require('consistent-failables/failable')
const childProcess = require('child_process')
let JSONStream = require('JSONStream')

// const extractFrames = (videoPath) => {
  const unencodedVideo = 'niceViewValley.MP4'
  const encodedVideo = 'encodedVid.mp4'
  const psVid = 'pluralsight1024x768Vid.mp4'
  /*
    pkt_pts_time is used for determining segment length, so it fills the EXTINF field for each segment.
  */
  let ffprobe = childProcess.spawn('ffprobe', ['-print_format', 'json', '-select_streams', 'v', '-show_frames', '-show_entries', 'frame=pkt_dts_time,pict_type,pkt_size,pkt_pos,pkt_pts_time', '-i', psVid])

  ffprobe.once('close', function (code) {
    if (code) console.log("ERROR ERROR ERROR", code);
  })

  ffprobe.stdout
    .pipe(JSONStream.parse())
    .once('data', (data) => {
      console.log('data::::', data)
    })
// }

module.exports = {

}
