const { addOpenTag, addVersionTag, mediaSequence, closingTag } = require('./genericHeaders')
const { filter, pipe, map } = require('ramda')
const ffmpeg = require('fluent-ffmpeg')
const co = require('co')
const { success } = require('consistent-failables/failable')

/*
  https://developer.apple.com/library/content/technotes/tn2288/_index.html
  Playlists that specify byte range media segments require protocol version 4.
  In addition, they must include EXT-X-TARGETDURATION and EXT-X-MEDIA-SEQUENCE tags,
    and the media URI must reside on a separate line.
*/

const generateMasterManifest = renditions => {
  return pipe(
    addOpenTag,
    addVersionTag(4),
    //determine if GOP data provided, if not an FFPROBE command can be run
    findMasterTargetDuration(renditions),
    mediaSequence(0),
    buildRenditionBlock(renditions),
    closingTag
  )().join('\n')
}

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
    let programId = r.programId || 1
    manifest.push(`#EXT-X-STREAM-INF:PROGRAM-ID=${programId},BANDWIDTH=${r.bandwidth},RESOLUTION=${r.resolution}`)
    manifest.push(r.file)
  })
  return manifest
}

const ffprobeIfNecessary = co.wrap(function * (renditions) {
  return new Promise((reject, resolve) => {
    ffmpeg.ffprobe(renditions[0].video, (err, data) => {
      console.log('renditions[0].video:', renditions[0].video)
      console.log('data:', data)
      if (err) resolve(failure(err.toString()))
      resolve(success(data))
    })
  })
})

module.exports = {
  generateMasterManifest,
  findMasterTargetDuration,
  buildRenditionBlock,
  ffprobeIfNecessary
}
