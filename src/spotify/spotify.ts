import { fetch, RequestInit } from 'undici'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface SpotifyOptions {
  accessToken: string
  refreshToken: string
  clientId: string
  clientSecret: string
}

interface _CallParams {
  url: string
  forceUrl?: boolean
  method?: HttpMethod
  headers?: Record<string, any>
  body?: Record<string, any>
}

interface CallParams {
  httpMethod?: HttpMethod
  headers?: Record<string, any>

  [key: string]: any
}

export class Spotify {
  public baseApiUrl = 'https://api.spotify.com/v1'

  // eslint-disable-next-line no-useless-constructor
  constructor (private options: SpotifyOptions) {
  }

  public async revoke () {
    const json = await this._call({
      url: 'https://accounts.spotify.com/api/token',
      forceUrl: true,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        refresh_token: this.options.refreshToken
      }
    }) as Record<string, any>

    this.options.accessToken = json.access_token
  }

  public async call<T extends Record<string, any> = Record<string, any>> (method: string, params: CallParams = {}) {
    const { headers, ...body } = params

    return this._call<T>({
      url: method,
      method: params.httpMethod ?? 'GET',
      body,
      headers
    })
  }

  private async _call<T extends Record<string, any> = Record<string, any>> (params: _CallParams): Promise<T | null> {
    const { url: rawUrl, method = 'GET', headers: rawHeaders, forceUrl = false, body } = params

    let url = forceUrl ? rawUrl : `${this.baseApiUrl}/${rawUrl}`

    const headers = rawHeaders ?? {
      Authorization: `Bearer ${this.options.accessToken}`
    }

    const requestParams: RequestInit = { method, headers }

    if (method === 'GET' && !forceUrl) {
      url += `?${new URLSearchParams(body)}`
    } else {
      requestParams.body = new URLSearchParams(body)
    }

    const response = await fetch(url, requestParams)

    let error: Error | undefined

    try {
      const json = await response.json() as T

      if (json.error?.status !== 401) {
        return json
      }

      // INFO: need to revoke the token
      if (!json.error.message.startsWith('Invalid')) {
        await this.revoke()

        return this._call(params)
      }

      // INFO: credentials are (probably) invalid
      error = new TypeError(json.error.message)
    } catch (error) { // INFO: failed to .json()
      return null
    }

    if (error !== undefined) {
      throw error
    }

    return null
  }
}
