import 'dotenv/config'

import env from 'env-var'

import { VK } from 'vk-io'

import { HEIGHT, WIDTH } from './constants'

import { Lastfm, RecentTracks, TrackInfo } from './lastfm'
import { render } from './renderer'
import { ArtistsResponse, CurrentlyPlayingObject, Spotify, Track } from './spotify'

const SPOTIFY_ACCESS_TOKEN = env.get('SPOTIFY_ACCESS_TOKEN').required().asString()
const SPOTIFY_CLIENT_ID = env.get('SPOTIFY_CLIENT_ID').required().asString()
const SPOTIFY_CLIENT_SECRET = env.get('SPOTIFY_CLIENT_SECRET').required().asString()
const SPOTIFY_REFRESH_TOKEN = env.get('SPOTIFY_REFRESH_TOKEN').required().asString()

const LASTFM_API_KEY = env.get('LASTFM_API_KEY').asString()
const LASTFM_USERNAME = env.get('LASTFM_USERNAME').asString()

const VK_TOKEN = env.get('VK_TOKEN').required().asString()

const spotify = new Spotify({
  accessToken: SPOTIFY_ACCESS_TOKEN,
  clientId: SPOTIFY_CLIENT_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
  refreshToken: SPOTIFY_REFRESH_TOKEN
})

const vk = new VK({
  token: VK_TOKEN
})

const isUsingLastfm = LASTFM_API_KEY !== undefined && LASTFM_USERNAME !== undefined

let deletedCover = false

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

  if (currentlyPlayingData === null && !deletedCover) {
    deletedCover = true

    return removeCover()
  }

  deletedCover = false

  let scrobbles = 0

  // INFO: parse scrobbles only if we have lastfm account info
  if (isUsingLastfm) {
    const lastfm = new Lastfm({
      key: LASTFM_API_KEY
    })

    const currentScrobblingTrackData = await lastfm.call<RecentTracks>('user.getRecentTracks', {
      user: LASTFM_USERNAME,
      limit: 1
    })

    const currentScrobblingTrack = currentScrobblingTrackData.recenttracks.track[0]

    const scrobblesData = await lastfm.call<TrackInfo>('track.getInfo', {
      artist: currentScrobblingTrack.artist['#text'],
      track: currentScrobblingTrack.name,
      username: LASTFM_USERNAME
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
