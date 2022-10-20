import 'dotenv/config'

import { VK } from 'vk-io'

import { HEIGHT, WIDTH } from './constants'

import { Lastfm, RecentTracks, TrackInfo } from './lastfm'
import { render } from './renderer'
import { ArtistsResponse, CurrentlyPlayingObject, Spotify, Track } from './spotify'

const spotify = new Spotify({
  accessToken: process.env.SPOTIFY_ACCESS_TOKEN as string,
  clientId: process.env.SPOTIFY_CLIENT_ID as string,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
  refreshToken: process.env.SPOTIFY_REFRESH_TOKEN as string
})

const lastfm = new Lastfm({
  key: process.env.LASTFM_API_KEY as string
})

const vk = new VK({
  token: process.env.VK_TOKEN as string
})

const isUsingLastfm = Boolean(process.env.LASTFM_API_KEY) && Boolean(process.env.LASTFM_USERNAME)

let deleted = false

const uploadCover = (buffer: Buffer) => (
  vk.upload.conduct({
    field: 'photo',
    params: {
      source: { value: buffer },
      crop_x: '',
      crop_width: WIDTH,
      crop_y: '',
      crop_height: HEIGHT
    },

    getServer: vk.api.photos.getOwnerCoverPhotoUploadServer,
    saveFiles: vk.api.photos.saveOwnerCoverPhoto,
    serverParams: ['crop_x', 'crop_height', 'crop_y', 'crop_width'],

    maxFiles: 1,
    attachmentType: 'photo'
  })
)

const removeCover = () => (
  vk.api.call('photos.removeOwnerCoverPhoto', {})
)

const run = async () => {
  const currentlyPlayingData = await spotify.call<CurrentlyPlayingObject>('me/player/currently-playing')

  if (currentlyPlayingData === null && !deleted) {
    deleted = true

    return removeCover()
  }

  deleted = false

  let scrobbles = 0

  // INFO: parse scrobbles only if we have lastfm account info
  if (isUsingLastfm) {
    const currentScrobblingTrackData = await lastfm.call<RecentTracks>('user.getRecentTracks', {
      user: process.env.LASTFM_USERNAME,
      limit: 1
    })

    const currentScrobblingTrack = currentScrobblingTrackData.recenttracks.track[0]

    const scrobblesData = await lastfm.call<TrackInfo>('track.getInfo', {
      artist: currentScrobblingTrack.artist['#text'],
      track: currentScrobblingTrack.name,
      username: process.env.LASTFM_USERNAME
    })

    scrobbles = Number.parseInt(scrobblesData.track?.userplaycount) ?? 0
  }

  const artistIds = (currentlyPlayingData?.item as Track).artists.map(artist => artist.id).join(',')

  const artists = await spotify.call<ArtistsResponse>('artists', {
    ids: artistIds
  })

  const { buffer } = await render({
    width: WIDTH,
    height: HEIGHT,
    scrobbles,
    artists: artists?.artists!, // artists? artists!
    data: currentlyPlayingData!
  })

  return uploadCover(buffer)
}

run().catch(console.error)
