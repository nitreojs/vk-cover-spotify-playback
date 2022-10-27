import { resolve } from 'node:path'

import { Canvas, CanvasImageSource, FontLibrary, loadImage } from 'skia-canvas'

import { getDeclination, transformDate, transformTime } from '../utils'

import {
  renderBlurredImageBackground,
  renderDarkening,
  renderFallbackAvatar,
  renderRoundRectImage,
  roundRect
} from './utils'

FontLibrary.use('SF UI', resolve(__dirname, '..', '..', 'fonts', 'SF UI', '*.otf'))

export interface SimpleArtistImage {
  url: string
}

export interface SimpleArtist {
  name: string
  images: SimpleArtistImage[]
}

export interface RenderParams {
  width: number
  height: number
  scrobbles: number

  imageUrl: string
  progress: number

  trackName: string
  trackDuration: number

  artists: SimpleArtist[]
}

export interface RenderResponseRenderTime {
  total: number
  withoutImageLoading: number
}

export interface RenderResponse {
  buffer: Buffer
  renderTime: RenderResponseRenderTime
}

export const render = async (params: RenderParams): Promise<RenderResponse> => {
  const { width, height, scrobbles, artists, imageUrl, trackName, progress, trackDuration } = params

  const canvas = new Canvas(width, height)
  const context = canvas.getContext('2d')

  const backgroundImage = await loadImage(imageUrl)

  // INFO: calculating how much time did it take to render this picture
  let renderStart = Date.now()
  let tookTimeLoadingImages = 0

  // INFO: background
  renderBlurredImageBackground(canvas, backgroundImage)
  renderDarkening(canvas)

  // INFO: track (album) image
  const widthMultiplier = canvas.width / backgroundImage.width
  const heightMultiplier = canvas.height / backgroundImage.height

  const IMAGE_OFFSET_RATIO = 2
  const IMAGE_OFFSET = canvas.height / (2 + IMAGE_OFFSET_RATIO)

  const canvasOrImageMaxHeight = Math.max(backgroundImage.height, canvas.height)

  const IMAGE_DW = backgroundImage.width * heightMultiplier - IMAGE_OFFSET * 2
  const IMAGE_DH = canvasOrImageMaxHeight - IMAGE_OFFSET * 2

  context.shadowColor = 'black'
  context.shadowBlur = backgroundImage.height / 20
  renderRoundRectImage(canvas, backgroundImage, {
    dx: IMAGE_OFFSET, dy: IMAGE_OFFSET,
    dw: IMAGE_DW, dh: IMAGE_DH,
    radius: 32, fill: true
  })

  // INFO: track name
  const TRACK_TEXT_OFFSET_X = IMAGE_OFFSET + IMAGE_DW + IMAGE_OFFSET / 2
  const TRACK_TEXT_OFFSET_Y = canvas.height / 2

  const TRACK_TEXT_MAX_WIDTH = canvas.width - TRACK_TEXT_OFFSET_X - IMAGE_OFFSET

  let TRACK_TEXT = trackName

  const FONT_SIZE = 24 * widthMultiplier

  context.shadowColor = 'rgb(0, 0, 0, 0.6)'
  context.shadowBlur = 24
  context.font = `bold ${FONT_SIZE}px SF UI`
  context.fillStyle = 'white'
  context.textAlign = 'left'
  context.textBaseline = 'bottom'

  let TRACK_TEXT_MEASUREMENT = context.measureText(TRACK_TEXT)
  let hadToTruncate = false

  // TODO: one very long word
  while (TRACK_TEXT_MEASUREMENT.width > TRACK_TEXT_MAX_WIDTH) {
    hadToTruncate = true

    const words = TRACK_TEXT.split(' ')
    const endIndex = words[words.length - 1] === '...' ? -2 : -1

    TRACK_TEXT = [...words.slice(0, endIndex), '...'].join(' ')
    TRACK_TEXT_MEASUREMENT = context.measureText(TRACK_TEXT)
  }

  context.fillText(TRACK_TEXT, TRACK_TEXT_OFFSET_X, TRACK_TEXT_OFFSET_Y, TRACK_TEXT_MAX_WIDTH)

  // INFO: artists & album name
  const ARTIST_PADDING = 16

  const artistsData = artists.map(artist => ({ name: artist.name, image: artist.images[0] }))

  let lastOffsetX = TRACK_TEXT_OFFSET_X

  context.shadowBlur = 0
  context.shadowColor = 'none'

  for (let i = 0; i < artistsData.length; i++) {
    const artist = artistsData[i]

    const hasImage = artist.image !== undefined

    let artistImage: CanvasImageSource

    const loadArtistImageStart = Date.now()

    if (hasImage) {
      artistImage = await loadImage(artist.image.url)
    } else {
      artistImage = renderFallbackAvatar(artist.name, backgroundImage)
    }

    const loadArtistImageEnd = Date.now()
    const loadArtistImageTook = loadArtistImageEnd - loadArtistImageStart

    tookTimeLoadingImages += loadArtistImageTook

    const IMAGE_OFFSET_X = lastOffsetX
    const IMAGE_OFFSET_Y = TRACK_TEXT_OFFSET_Y + 8

    context.shadowColor = 'rgb(0, 0, 0, 0.5)'
    context.shadowBlur = artistImage.height / 20

    renderRoundRectImage(canvas, artistImage, {
      dx: IMAGE_OFFSET_X, dy: IMAGE_OFFSET_Y,
      dw: 64, dh: 64,
      radius: 8, fill: hasImage
    })

    const TEXT_OFFSET_X = lastOffsetX + 64 + ARTIST_PADDING
    const TEXT_OFFSET_Y = TRACK_TEXT_OFFSET_Y + 12

    context.shadowColor = 'rgb(0, 0, 0, 0.7)'
    context.shadowBlur = 20
    context.font = `300 ${FONT_SIZE / 1.5}px SF UI`
    context.fillStyle = 'white'
    context.textAlign = 'left'
    context.textBaseline = 'top'

    const TEXT_MEASUREMENT = context.measureText(artist.name)

    context.fillText(artist.name, TEXT_OFFSET_X, TEXT_OFFSET_Y)

    lastOffsetX = TEXT_OFFSET_X + TEXT_MEASUREMENT.width + ARTIST_PADDING * 3
  }

  const TIME_PADDING = 16

  // INFO: additional top text info
  const ADDITIONAL_TEXT_OFFSET_X = TRACK_TEXT_OFFSET_X
  const ADDITIONAL_TEXT_OFFSET_Y = IMAGE_OFFSET + TIME_PADDING

  context.shadowColor = 'rgb(0, 0, 0, 0.7)'
  context.shadowBlur = 24
  context.font = `300 ${FONT_SIZE / 2}px SF UI`
  context.fillStyle = 'rgb(255, 255, 255, 0.7)'
  context.textAlign = 'left'
  context.textBaseline = 'top'

  const ADDITIONAL_TEXT_PARTS: string[] = [
    'слушаю сейчас в Spotify',
    transformDate(new Date())
  ]

  if (scrobbles > 0) {
    ADDITIONAL_TEXT_PARTS.push(`${scrobbles} ${getDeclination(scrobbles, ['прослушивание', 'прослушивания', 'прослушиваний'])}`)
  }

  const ADDITIONAL_TEXT = ADDITIONAL_TEXT_PARTS.join(' • ')

  context.fillText(ADDITIONAL_TEXT, ADDITIONAL_TEXT_OFFSET_X, ADDITIONAL_TEXT_OFFSET_Y)

  // INFO: progress line & time (elapsed & left)
  /// INFO: time (elapsed)
  const TIME_ELAPSED_OFFSET_X = TRACK_TEXT_OFFSET_X
  const TIME_ELAPSED_OFFSET_Y = canvas.height - IMAGE_OFFSET - TIME_PADDING

  context.shadowColor = 'black'
  context.shadowBlur = 24
  context.font = `300 ${FONT_SIZE / 3}px SF UI`
  context.fillStyle = 'white'
  context.textAlign = 'left'
  context.textBaseline = 'bottom'

  const TIME_ELAPSED_TEXT = transformTime(progress)
  const TIME_ELAPSED_TEXT_MEASUREMENT = context.measureText(TIME_ELAPSED_TEXT)

  context.fillText(TIME_ELAPSED_TEXT, TIME_ELAPSED_OFFSET_X, TIME_ELAPSED_OFFSET_Y)

  /// INFO: time (left)
  const TIME_LEFT_OFFSET_X = canvas.width - IMAGE_OFFSET - TIME_PADDING
  const TIME_LEFT_OFFSET_Y = TIME_ELAPSED_OFFSET_Y

  context.shadowColor = 'black'
  context.shadowBlur = 24
  context.font = `300 ${FONT_SIZE / 3}px SF UI`
  context.fillStyle = 'white'
  context.textAlign = 'right'
  context.textBaseline = 'bottom'

  const TIME_LEFT_TEXT = `-${transformTime(trackDuration - progress)}`
  const TIME_LEFT_TEXT_MEASUREMENT = context.measureText(TIME_LEFT_TEXT)

  context.fillText(TIME_LEFT_TEXT, TIME_LEFT_OFFSET_X, TIME_LEFT_OFFSET_Y)

  /// INFO: progress line (full)
  const PROGRESS_LINE_FULL_OFFSET_X = TIME_ELAPSED_OFFSET_X + TIME_PADDING + TIME_ELAPSED_TEXT_MEASUREMENT.width + TIME_PADDING
  const PROGRESS_LINE_FULL_OFFSET_Y = TIME_ELAPSED_OFFSET_Y - TIME_PADDING * 1.3
  const PROGRESS_LINE_FULL_WIDTH = TIME_LEFT_OFFSET_X - TIME_ELAPSED_OFFSET_X - TIME_PADDING * 3 - TIME_LEFT_TEXT_MEASUREMENT.width * 2
  const PROGRESS_LINE_FULL_HEIGHT = TIME_ELAPSED_TEXT_MEASUREMENT.actualBoundingBoxAscent / 2

  context.shadowColor = 'black'
  context.shadowBlur = 16
  context.fillStyle = 'rgba(255, 255, 255, 0.3)'
  roundRect({
    context,
    dx: PROGRESS_LINE_FULL_OFFSET_X, dy: PROGRESS_LINE_FULL_OFFSET_Y,
    dw: PROGRESS_LINE_FULL_WIDTH, dh: PROGRESS_LINE_FULL_HEIGHT,
    radius: 20, fill: true
  })

  /// INFO: progress line (elapsed)
  const PROGRESS = progress / trackDuration * PROGRESS_LINE_FULL_WIDTH

  context.shadowColor = 'rgb(0, 0, 0, 0)'
  context.shadowBlur = 0
  context.fillStyle = 'white'
  roundRect({
    context,
    dx: PROGRESS_LINE_FULL_OFFSET_X, dy: PROGRESS_LINE_FULL_OFFSET_Y,
    dw: PROGRESS, dh: PROGRESS_LINE_FULL_HEIGHT,
    radius: 20, fill: true
  })

  const renderEnd = Date.now()

  const renderTookRaw = renderEnd - renderStart
  const renderTookOptimized = renderTookRaw - tookTimeLoadingImages

  const buffer = await canvas.jpg

  return {
    buffer,
    renderTime: {
      total: renderTookRaw,
      withoutImageLoading: renderTookOptimized
    }
  }
}
