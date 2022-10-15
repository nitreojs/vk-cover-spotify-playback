import 'dotenv/config'
import { execSync } from 'node:child_process'

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { fetch } from 'undici'
import { VK } from 'vk-io'
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

let deleted = false

const WIDTH = 1920
const HEIGHT = 640

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
  const data = await spotify.call<CurrentlyPlayingObject>('me/player/currently-playing')

  if (data === null && !deleted) {
    deleted = true

    return removeCover()
  }

  deleted = false

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

  const scrobbles = Number.parseInt(scrobblesData.track?.userplaycount) || undefined

  const artistIds = (data?.item as Track).artists.map(artist => artist.id).join(',')

  const artists = await spotify.call<ArtistsResponse>('artists', {
    ids: artistIds
  })

  const buffer = await render({
    width: WIDTH,
    height: HEIGHT,
    scrobbles,
    artists: artists?.artists!,
    data: data!
  })

  return uploadCover(buffer)
}

vk.callbackService.onCaptcha(async (captcha, retry) => {
  const response = await fetch(captcha.src)
  const ab = await response.arrayBuffer()
  const buffer = Buffer.from(ab)

  await writeFile(resolve(__dirname, '..', 'captcha.jpg'), buffer)

  const code = execSync('python3 solve_captcha.py --image captcha.jpg').toString().trim()

  try {
    await retry(code)
  } catch (e) {
    console.log(code, 'captcha code failed!', e)

    await removeCover()
  }
})

run().catch(console.error)
