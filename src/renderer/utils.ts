import { Canvas, CanvasImageSource, CanvasRenderingContext2D, Image } from 'skia-canvas'

import { BLUR_PX, FALLBACK_AVATAR_DIMENSION } from '../constants'

export interface RoundRectParams {
  context: CanvasRenderingContext2D
  dx: number
  dy: number
  dw: number
  dh: number
  radius: number
  fill?: boolean
}

export const roundRect = ({ context, dx, dy, dw, dh, radius, fill = false }: RoundRectParams) => {
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

export interface RenderRoundRectImageParams {
  dx: number
  dy: number
  dw: number
  dh: number
  radius: number
  fill?: boolean
}

export const renderRoundRectImage = (canvas: Canvas, image: CanvasImageSource, {
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

export const renderBlurredImageBackground = (canvas: Canvas, image: Image) => {
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

export const renderDarkening = (canvas: Canvas, alpha = 0.3) => {
  const context = canvas.getContext('2d')

  context.filter = 'none'
  context.fillStyle = `rgb(0, 0, 0, ${alpha})`
  context.fillRect(0, 0, canvas.width, canvas.height)
}

export const renderFallbackAvatar = (name: string, background: Image) => {
  const canvas = new Canvas(FALLBACK_AVATAR_DIMENSION, FALLBACK_AVATAR_DIMENSION)
  const context = canvas.getContext('2d')

  renderBlurredImageBackground(canvas, background)
  renderDarkening(canvas)

  const firstLetterCharMatch = name.match(/\p{L}/u)

  const character = (firstLetterCharMatch !== null ? firstLetterCharMatch[0] : name[0]).toUpperCase()

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `bold ${FALLBACK_AVATAR_DIMENSION / 2}px SF UI`
  context.fillStyle = 'white'
  context.fillText(character, FALLBACK_AVATAR_DIMENSION / 2, FALLBACK_AVATAR_DIMENSION / 2)

  return canvas
}