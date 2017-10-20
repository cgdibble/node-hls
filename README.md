# node-hls

## TODO
- Accept array of strings that are the videoPaths instead of list of objects
    Now that the other data is determined on the fly, there is no need to start with
      the additional complexity of array of objects
- Write a rendition stats function that aggregates all the necessary states
- Make some renditions for testing so it isn't the same 1024x768 rendition repeated
- wrap all async calls w/ try/catch and return failables until ffprobe library is there to use
- Write FFPROBE library to allow for easy extracting of data

## Done
- Calculate bandwidth for each rendition (audio bit_rate + video bit_rate)
- Determine resolution on the fly
- Determine rendition manifest filename based on resolution
