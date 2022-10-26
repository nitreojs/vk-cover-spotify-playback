import env from 'env-var'

import { VK } from 'vk-io'

import { HEIGHT, WIDTH } from './constants'

const VK_TOKEN = env.get('VK_TOKEN').required().asString()

export const vk = new VK({
  token: VK_TOKEN
})

export const uploadCover = (buffer: Buffer) => (
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

export const removeCover = () => (
  vk.api.call('photos.removeOwnerCoverPhoto', {})
)

export const removeBroadcastingTrack = () => (
  vk.api.call('audio.setBroadcast', {})
)

export const setBroadcastingTrack = (id: string) => (
  vk.api.call('audio.setBroadcast', { audio: id })
)

export const getTrackId = async (artist: string, name: string) => {
  const { count, items } = await vk.api.call('audio.search', { q: `${artist} - ${name}`, auto_complete: 0 })

  if (count === 0) {
    return undefined
  }

  // INFO: previous `toLowerCase` check failed if Spotify <-> VK track names were different
  // INFO: e.g. for feats, so we're now just returning the first one hoping it's the one we're looking for

  const track = items[0]

  return `${track.owner_id}_${track.id}`
}
