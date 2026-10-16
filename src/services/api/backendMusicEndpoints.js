/**
 * Endpoint builders for the Fastify /music API.
 *
 * Set VITE_API_BASE_URL to your deployed backend origin when the Fastify API
 * is hosted separately. Leave it empty when the frontend and backend share
 * the same origin and /music routes are mounted there.
 *
 * These are separate from endpoints.js, which currently targets the existing
 * same-origin /api/jiosaavn proxy. Keeping both avoids breaking that provider.
 */
const baseURL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const path = (value) => `${baseURL}${value}`;
const encode = (value) => encodeURIComponent(String(value ?? '').trim());

export const MUSIC_HOME = path('/music/home');
export const MUSIC_SEARCH = path('/music/search');
export const MUSIC_ALBUM = (albumId) => path(`/music/album/${encode(albumId)}`);
export const MUSIC_SONG = (songId) => path(`/music/song/${encode(songId)}`);
export const MUSIC_SONG_STREAM = (songId) => path(`/music/song/${encode(songId)}/stream`);
export const MUSIC_PLAYLIST = (playlistId) => path(`/music/playlist/${encode(playlistId)}`);
export const MUSIC_ARTIST = (artistId) => path(`/music/artist/${encode(artistId)}`);
export const MUSIC_COLLECTION = (seokey) => path(`/music/collection/${encode(seokey)}`);
export const MUSIC_ALBUM_LIST = path('/music/album-list');
export const MUSIC_OCCASIONS = path('/music/occasions');
export const MUSIC_OCCASIONS_DETAIL = (slug) => path(`/music/occasions/${encode(slug)}`);
export const MUSIC_LANGUAGES = path('/music/languages');
export const MUSIC_RADIO_BROWSE = (languages) => `${path('/music/radio')}${languages ? `?languages=${encode(Array.isArray(languages) ? languages.join(',') : languages)}` : ''}`;
export const MUSIC_RADIO_DETAIL = (radioId) => path(`/music/radio/${encode(radioId)}`);
export const MUSIC_ARTIST_RADIO = (artistId, languages) => `${path(`/music/artist/${encode(artistId)}/radio`)}${languages ? `?languages=${encode(Array.isArray(languages) ? languages.join(',') : languages)}` : ''}`;
export const MUSIC_RECOMMEND = (id) => path(`/music/song/${encode(id)}/recommend`);
export const MUSIC_RECOMMEND_SEARCH = (query, languages) => `${path('/music/recommend')}?q=${encode(query)}${languages ? `&languages=${encode(Array.isArray(languages) ? languages.join(',') : languages)}` : ''}`;
export const MUSIC_RADIO_SESSION = (languages) => `${path('/music/radio/session')}${languages ? `?languages=${encode(Array.isArray(languages) ? languages.join(',') : languages)}` : ''}`;
export const MUSIC_RADIO_PLAY = (sessionId) => path(`/music/radio/${encode(sessionId)}`);

export default {
  MUSIC_HOME,
  MUSIC_SEARCH,
  MUSIC_ALBUM,
  MUSIC_SONG,
  MUSIC_SONG_STREAM,
  MUSIC_PLAYLIST,
  MUSIC_ARTIST,
  MUSIC_COLLECTION,
  MUSIC_ALBUM_LIST,
  MUSIC_OCCASIONS,
  MUSIC_OCCASIONS_DETAIL,
  MUSIC_LANGUAGES,
  MUSIC_RADIO_BROWSE,
  MUSIC_RADIO_DETAIL,
  MUSIC_ARTIST_RADIO,
  MUSIC_RECOMMEND,
  MUSIC_RECOMMEND_SEARCH,
  MUSIC_RADIO_SESSION,
  MUSIC_RADIO_PLAY,
};
