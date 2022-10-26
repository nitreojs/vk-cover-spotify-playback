import createDebug from 'debug'
import 'dotenv/config'

import env from 'env-var'

// @ts-ignore
import settings from '../settings.json'

import { HEIGHT, WIDTH } from './constants'

import { Lastfm, RecentTracks, TrackInfo } from './lastfm'
import { render } from './renderer'
import { ArtistsResponse, CurrentlyPlayingObject, Spotify, Track } from './spotify'
import { getTrackId, removeBroadcastingTrack, removeCover, setBroadcastingTrack, uploadCover } from './vk'

const debug_vk = createDebug('vk-cover:vk')
const debug_spotify = createDebug('vk-cover:spotify')
const debug_renderer = createDebug('vk-cover:renderer')

const SPOTIFY_ACCESS_TOKEN = env.get('SPOTIFY_ACCESS_TOKEN').required().asString()
const SPOTIFY_CLIENT_ID = env.get('SPOTIFY_CLIENT_ID').required().asString()
const SPOTIFY_CLIENT_SECRET = env.get('SPOTIFY_CLIENT_SECRET').required().asString()
const SPOTIFY_REFRESH_TOKEN = env.get('SPOTIFY_REFRESH_TOKEN').required().asString()

const LASTFM_API_KEY = env.get('LASTFM_API_KEY').asString()
const LASTFM_USERNAME = env.get('LASTFM_USERNAME').asString()

const spotify = new Spotify({
  accessToken: SPOTIFY_ACCESS_TOKEN,
  clientId: SPOTIFY_CLIENT_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
  refreshToken: SPOTIFY_REFRESH_TOKEN
})

const lastfmDataFound = LASTFM_API_KEY !== undefined && LASTFM_USERNAME !== undefined

if (settings.use_lastfm && !lastfmDataFound) {
  throw new TypeError('specified `"use_lastfm": true` but either API key or username are missing')
}

const run = async () => {
  const currentlyPlayingData = await spotify.call<CurrentlyPlayingObject>('me/player/currently-playing')

  if (currentlyPlayingData === null) {
    debug_spotify('playing data is null, cancelling cover update')

    return removeCover()
  }

  const item = currentlyPlayingData?.item as Track

  let scrobbles = 0

  // INFO: parse scrobbles only if we have lastfm account info
  if (lastfmDataFound) {
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

  const artistIds = item.artists.map(artist => artist.id).join(',')
  const artistNames = item.artists.map(artist => artist.name).join(', ')

  // INFO: broadcast track into a status only if the setting is turned on
  if (settings.broadcast_track_in_vk) {
    const trackId = await getTrackId(artistNames, item.name)

    if (trackId !== undefined) {
      debug_vk(`query "${artistNames} - ${item.name}" is identified as ${trackId}, updating status`)

      await setBroadcastingTrack(trackId)
    } else {
      debug_vk(`query "${artistNames} - ${item.name}" returned no results, cancelling status update`)

      await removeBroadcastingTrack()
    }
  }

  const artists = await spotify.call<ArtistsResponse>('artists', {
    ids: artistIds
  })

  const { buffer, renderTime } = await render({
    width: WIDTH,
    height: HEIGHT,
    scrobbles,
    artists: artists?.artists!, // artists? artists!
    data: currentlyPlayingData!
  })

  debug_renderer(renderTime)

  return uploadCover(buffer)
}

run().catch(console.error)
