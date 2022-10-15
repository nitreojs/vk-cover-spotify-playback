export type AlbumType = 'single' | 'album' | 'compilation'
export type AlbumGroup = AlbumType | 'appears_on'
export type SpotifyType = 'user' | 'episode' | 'playlist' | 'show' | 'track' | 'album' | 'artist'
export type UserProductType = 'free' | 'open' | 'premium'

export interface ExternalUrl {
  spotify: string
}

export interface SimplifiedArtist {
  type: 'artist'
  external_urls: ExternalUrl
  href: string
  id: string
  name: string
  uri: string
}

export interface Image {
  width?: number
  height?: number
  url: string
}

export interface Followers {
  href?: string
  total: number
}

export interface Artist extends SimplifiedArtist {
  followers: Followers
  genres: string[]
  images: Image[]
  popularity: number
}

export interface Restriction {
  reason: 'market' | 'product' | 'explicit'
}

export interface SimplifiedAlbum {
  type: 'album'
  album_group?: AlbumGroup
  album_type?: AlbumType
  artists?: SimplifiedArtist[]
  available_markets?: string[]
  external_urls: ExternalUrl
  href: string
  id: string
  images: Image[]
  name: string
  release_date: string
  release_date_precision: string
  restrictions: Restriction[]
  total_tracks: number
  uri: string
}

export interface ExternalID {
  ean: string
  isrc: string
  upc: string
}

export interface LinkedTrack {
  external_urls: ExternalUrl
  href: string
  id: string
  type: SpotifyType
  uri: string
}

export interface Track {
  type: 'track'

  album: SimplifiedAlbum
  artists: Artist[]
  available_markets?: string[]
  disc_number: number
  duration_ms: number
  explicit: boolean
  external_ids: ExternalID
  external_urls: ExternalUrl
  href: string
  id: string
  is_local: boolean
  is_playable?: boolean
  linked_from?: LinkedTrack
  name: string
  popularity: number
  preview_url: string
  restrictions: Restriction[]
  track_number: number
  uri: string
}

export interface ResumePoint {
  fully_played: boolean
  resume_position_ms: number
}

export interface Copyright {
  text: string
  type: 'C' | 'P'
}

export interface SimplifiedShow {
  type: 'show'

  available_markets: string[]
  copyrights: Copyright[]
  description: string
  explicit: boolean
  external_urls: ExternalUrl
  href: string
  html_description: string
  id: string
  images: Image[]
  is_externally_hosted: boolean
  languages: string[]
  media_type: string
  name: string
  publisher: string
  uri: string
}

export interface Episode {
  type: 'episode'

  audio_preview_url?: string
  description: string
  duration_ms: number
  explicit: boolean
  external_urls: ExternalUrl
  href: string
  html_description: string
  id: string
  images: Image[]
  is_externally_hosted: boolean
  is_playable: boolean
  language?: string
  languages: string[]
  name: string
  release_date: string
  release_date_precision: string
  restrictions: Restriction[]
  resume_point: ResumePoint
  show: SimplifiedShow
  uri: string
}

export interface CurrentlyPlayingObject {
  currently_playing_type: 'episode' | 'track' | 'ad' | 'unknown'
  is_playing: boolean
  item: Track | Episode | null
  progress_ms: number | null
  timestamp: number
}

export interface ArtistsResponse {
  artists: Artist[]
}

export interface RecentlyPlayedItem {
  played_at: string
  track: Track
}

export interface Cursor {
  after: string
}

export interface RecentlyPlayedObject {
  cursors: Cursor
  href: string
  items: RecentlyPlayedItem[]
  limit: number
  next?: string
  total: number
}

export type RecentlyPlayed = RecentlyPlayedObject | null

export interface ExplicitContentSettings {
  filter_enabled: boolean
  filter_locked: boolean
}

export interface PrivateUser {
  type: 'user'

  country: string
  display_name: string
  email: string
  explicit_content?: ExplicitContentSettings
  external_urls: ExternalUrl
  followers: Followers
  href: string
  id: string
  images: Image[]
  product?: UserProductType
  uri: string
}
