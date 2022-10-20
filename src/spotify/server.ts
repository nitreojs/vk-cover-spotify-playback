import 'dotenv/config'
import env from 'env-var'

import express from 'express'
import { randomBytes } from 'node:crypto'

import { fetch } from 'undici'

const SPOTIFY_CLIENT_ID = env.get('SPOTIFY_CLIENT_ID').required().asString()
const SPOTIFY_REDIRECT_URI = env.get('SPOTIFY_REDIRECT_URI').required().asString()
const SPOTIFY_CLIENT_SECRET = env.get('SPOTIFY_CLIENT_SECRET').required().asString()

const app = express()

app.get('/login', (req, res) => {
  const state = randomBytes(16).toString('hex')

  return res.redirect('https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state,
      scope: 'user-read-currently-playing user-read-playback-state user-read-recently-played user-library-read'
    })
  )
})

app.use('/spotify', async (req, res) => {
  const { code, state = null } = req.query

  if (state === null) {
    return res.redirect('/#' +
      new URLSearchParams({
        error: 'state_mismatch'
      })
    )
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: SPOTIFY_REDIRECT_URI
    })
  })

  const json = await response.json()

  console.log(json)
})

app.listen(8080, () => console.log('listening on [localhost:8080]'))
