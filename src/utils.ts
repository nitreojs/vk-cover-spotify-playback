export const transformTime = (ms: number) => {
  let seconds = Math.round(ms / 1000)
  const minutes = Math.floor(seconds / 60)

  seconds -= 60 * minutes

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const pad = (value: any) => String(value).padStart(2, '0')

export const transformDate = (date: Date) => {
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()

  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${day}.${month}.${year} ${hours}:${minutes}`
}

export const getDeclination = (n: number, forms: [string, string, string]) => {
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
