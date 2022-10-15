import { fetch } from 'undici'

interface LastfmOptions {
  key: string
}

interface _CallParams {
  method: string

  [key: string]: any
}

export class Lastfm {
  public baseApiUrl = 'https://ws.audioscrobbler.com/2.0'

  // eslint-disable-next-line no-useless-constructor
  constructor (private options: LastfmOptions) {
  }

  public async call<T = Record<string, any>> (method: string, params?: Record<string, any>) {
    return this._call<T>({ method, ...params })
  }

  private async _call<T = Record<string, any>> (params: _CallParams) {
    const { method, ...rawBody } = params

    const body = {
      method,
      api_key: this.options.key,
      format: 'json',
      ...rawBody
    }

    const url = `${this.baseApiUrl}/?${new URLSearchParams(body)}`

    const response = await fetch(url, { method: 'GET' })

    return response.json() as Promise<T>
  }
}
