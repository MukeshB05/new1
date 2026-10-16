/**
 * Same-origin JioSaavn endpoint builders for D1Music.
 * These URLs are served through /api/jiosaavn by Vercel, Cloudflare Pages,
 * and the Vite development proxy.
 */
const API = '/api/jiosaavn';

// Gaana API base URL (backend/proxy requests should use this constant).
export const GAANA_BASE_URL = 'https://gaana.com/apiv2';
const make = (method, params = {}) => {
  const url = new URL(API, window.location.origin);
  url.searchParams.set('__call', method);
  url.searchParams.set('_format', 'json');
  url.searchParams.set('_marker', '0');
  url.searchParams.set('api_version', '4');
  url.searchParams.set('ctx', 'web6dot0');
  url.searchParams.set('cc', 'in');
  url.searchParams.set('includeMetaTags', '1');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
};

export const MUSIC_HOME = make('webapi.getLaunchData');
export const MUSIC_ALBUM = (id) => make('content.getAlbumDetails', { albumid: id });
export const MUSIC_ARTIST = (id) => make('artist.getArtistPageDetails', { artistId: id });
export const MUSIC_PLAYLIST = (id) => make('playlist.getDetails', { listid: id });
export const MUSIC_SONG = (id) => make('song.getDetails', { pids: id });
export const MUSIC_SONG_STREAM = (id) => make('song.getDetails', { pids: id });
export const MUSIC_SEARCH = make('search.getResults');
export const MUSIC_LANGUAGES = make('content.getBrowseModules');
export const MUSIC_OCCASIONS = make('content.getBrowseModules');
export const MUSIC_OCCASIONS_DETAIL = (slug) => make('webapi.get', { token: slug });
export const MUSIC_RADIO_SESSION = make('webradio.createStation');
export const MUSIC_RADIO_PLAY = (sessionId) => make('webradio.getSong', { stationid: sessionId });
