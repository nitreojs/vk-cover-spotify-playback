import { resolve } from 'node:path'

import { Canvas, CanvasImageSource, CanvasRenderingContext2D, FontLibrary, Image, loadImage } from 'skia-canvas'

import { Artist, CurrentlyPlayingObject, Track } from './spotify'

FontLibrary.use('SF UI', resolve(__dirname, '..', 'fonts', 'SF UI', '*.otf'))

const BLUR_PX = 48

interface RoundRectParams {
  context: CanvasRenderingContext2D
  dx: number
  dy: number
  dw: number
  dh: number
  radius: number
  fill?: boolean
}

const roundRect = ({ context, dx, dy, dw, dh, radius, fill = false }: RoundRectParams) => {
  if (dw < 2 * radius) {
    radius = dw / 2
  }

  if (dh < 2 * radius) {
    radius = dh / 2
  }

  context.beginPath()
  context.moveTo(dx + radius, dy)

  context.arcTo(dx + dw, dy, dx + dw, dy + dh, radius)
  context.arcTo(dx + dw, dy + dh, dx, dy + dh, radius)
  context.arcTo(dx, dy + dh, dx, dy, radius)
  context.arcTo(dx, dy, dx + dw, dy, radius)

  if (fill) {
    context.fill()
  }

  context.closePath()
}

interface RenderRoundRectImageParams {
  dx: number
  dy: number
  dw: number
  dh: number
  radius: number
  fill?: boolean
}

const renderRoundRectImage = (canvas: Canvas, image: CanvasImageSource, {
  dx,
  dy,
  dw,
  dh,
  radius,
  fill
}: RenderRoundRectImageParams) => {
  const context = canvas.getContext('2d')

  context.save()

  roundRect({ context, dx, dy, dw, dh, radius, fill })
  context.clip()

  if (image instanceof Canvas) {
    context.drawCanvas(image, dx, dy, dw, dh)
  } else {
    context.drawImage(image, dx, dy, dw, dh)
  }

  context.restore()
}

const renderBlurredImageBackground = (canvas: Canvas, image: Image) => {
  const context = canvas.getContext('2d')

  const imageMinDimension = Math.min(image.width, image.height)
  const canvasMaxDimension = Math.max(canvas.width, canvas.height)

  const offset = BLUR_PX * 2

  const multiplier = (offset + canvasMaxDimension) / imageMinDimension
  const [iw, ih] = [image.width * multiplier, image.height * multiplier]

  const IMAGE_X = (canvas.width - iw) / 2
  const IMAGE_Y = (canvas.height - ih) / 2

  context.filter = `blur(${BLUR_PX}px)`
  context.drawImage(image,
    IMAGE_X, IMAGE_Y,
    iw, ih
  )
}

const renderDarkening = (canvas: Canvas, alpha = 0.3) => {
  const context = canvas.getContext('2d')

  context.filter = 'none'
  context.fillStyle = `rgb(0, 0, 0, ${alpha})`
  context.fillRect(0, 0, canvas.width, canvas.height)
}

const transformTime = (ms: number) => {
  let seconds = Math.round(ms / 1000)
  const minutes = Math.floor(seconds / 60)

  seconds -= 60 * minutes

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const pad = (value: any) => String(value).padStart(2, '0')

const transformDate = (date: Date) => {
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()

  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${day}.${month}.${year} ${hours}:${minutes}`
}

const getDeclination = (n: number, forms: [string, string, string]) => {
  const pr = new Intl.PluralRules('ru-RU')
  const rule = pr.select(n)

  if (rule === 'one') {
    return forms[0]
  }

  if (rule === 'few') {
    return forms[1]
  }

  return forms[2]
}

interface RenderParams {
  width: number
  height: number
  scrobbles: number

  data: CurrentlyPlayingObject
  artists: Artist[]
}

const renderFallbackAvatar = (name: string, background: Image) => {
  const SIZE = 128

  const canvas = new Canvas(SIZE, SIZE)
  const context = canvas.getContext('2d')

  renderBlurredImageBackground(canvas, background)
  renderDarkening(canvas)

  const firstLetterCharMatch = name.match(/\p{L}/u)

  const character = (firstLetterCharMatch !== null ? firstLetterCharMatch[0] : name[0]).toUpperCase()

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `bold ${SIZE / 2}px SF UI`
  context.fillStyle = 'white'
  context.fillText(character, SIZE / 2, SIZE / 2)

  return canvas
}

export const render = async ({ data, width, height, scrobbles, artists }: RenderParams) => {
  const canvas = new Canvas(width, height)
  const context = canvas.getContext('2d')

  const currentlyPlaying = data!
  const item = currentlyPlaying.item as Track

  const trackImage = item.album.images[0]
  const imageUrl = trackImage.url

  const backgroundImage = await loadImage(imageUrl)

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

  let TRACK_TEXT = item.name

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
  const ARTIST_PADDING = 16 // TODO: calculate?

  const artistsData = artists.map(artist => ({ name: artist.name, image: artist.images[0] }))

  let lastOffsetX = TRACK_TEXT_OFFSET_X

  context.shadowBlur = 0
  context.shadowColor = 'none'

  for (let i = 0; i < artistsData.length; i++) {
    const artist = artistsData[i]

    const hasImage = artist.image !== undefined

    let image: CanvasImageSource

    if (hasImage) {
      image = await loadImage(artist.image.url)
    } else {
      image = renderFallbackAvatar(artist.name, backgroundImage)
    }

    const IMAGE_OFFSET_X = lastOffsetX
    const IMAGE_OFFSET_Y = TRACK_TEXT_OFFSET_Y + 8

    context.shadowColor = 'rgb(0, 0, 0, 0.5)'
    context.shadowBlur = image.height / 20

    renderRoundRectImage(canvas, image, {
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

  const TIME_PADDING = 16 // TODO: calculate?

  // INFO: additional top text info
  const ADDITIONAL_TEXT_OFFSET_X = TRACK_TEXT_OFFSET_X
  const ADDITIONAL_TEXT_OFFSET_Y = IMAGE_OFFSET + TIME_PADDING

  context.shadowColor = 'rgb(0, 0, 0, 0.7)'
  context.shadowBlur = 24
  context.font = `300 ${FONT_SIZE / 2}px SF UI`
  context.fillStyle = 'rgb(255, 255, 255, 0.7)'
  context.textAlign = 'left'
  context.textBaseline = 'top'

  let ADDITIONAL_TEXT = `слушаю сейчас в Spotify • ${transformDate(new Date())}`

  if (scrobbles > 0) {
    ADDITIONAL_TEXT += ` • ${scrobbles} ${getDeclination(scrobbles, ['прослушивание', 'прослушивания', 'прослушиваний'])}`
  }

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

  const TIME_ELAPSED_TEXT = transformTime(currentlyPlaying.progress_ms!)
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

  const TIME_LEFT_TEXT = `-${transformTime(item.duration_ms - currentlyPlaying.progress_ms!)}`
  const TIME_LEFT_TEXT_MEASUREMENT = context.measureText(TIME_LEFT_TEXT)

  context.fillText(TIME_LEFT_TEXT, TIME_LEFT_OFFSET_X, TIME_LEFT_OFFSET_Y)

  /// INFO: progress line (full)
  const PROGRESS_LINE_FULL_OFFSET_X = TIME_ELAPSED_OFFSET_X + TIME_PADDING + TIME_ELAPSED_TEXT_MEASUREMENT.width + TIME_PADDING
  const PROGRESS_LINE_FULL_OFFSET_Y = TIME_ELAPSED_OFFSET_Y - TIME_PADDING * 1.3 // TODO: calculate
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
  const PROGRESS = currentlyPlaying.progress_ms! / item.duration_ms * PROGRESS_LINE_FULL_WIDTH

  context.shadowColor = 'rgb(0, 0, 0, 0)'
  context.shadowBlur = 0
  context.fillStyle = 'white'
  roundRect({
    context,
    dx: PROGRESS_LINE_FULL_OFFSET_X, dy: PROGRESS_LINE_FULL_OFFSET_Y,
    dw: PROGRESS, dh: PROGRESS_LINE_FULL_HEIGHT,
    radius: 20, fill: true
  })

  return canvas.jpg
}
