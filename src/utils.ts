import env from 'env-var'

import { I18n } from 'i18n'
import { resolve } from 'node:path'

const LOCALE = env.get('LOCALE').required().example('ru').asString()

const i18n = new I18n({
  directory: resolve(__dirname, '..', 'locales'),
  objectNotation: true,
  defaultLocale: 'ru'
})

i18n.setLocale(LOCALE)

export const transformTime = (ms: number) => {
  let seconds = Math.round(ms / 1000)
  const minutes = Math.floor(seconds / 60)

  seconds -= 60 * minutes

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const pad = (value: any) => String(value).padStart(2, '0')

export const transformDate = (date: Date) => {
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  const monthIndex = date.getMonth()
  const month = i18n.__(`months.${monthIndex}`)

  return i18n.__('date_format', { day, month, hours, minutes })
}

export const getDeclension = (n: number, forms: [string, string, string]) => {
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
