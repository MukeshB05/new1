/**
 * Same-origin Gaana API client. Requests go through /api/gaana so browser
 * clients do not need to send Gaana's upstream headers or depend on CORS.
 * Gaana's apiv2 interface is parameter-driven; pass its documented parameters
 * with request() or use the convenience methods below.
 */
export const GAANA_PROXY_URL = '/api/gaana';
export const GAANA_BASE_URL = 'https://gaana.com/apiv2';

const makeUrl = (params = {}) => {
  const url = new URL(GAANA_PROXY_URL, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)));
      else url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

async function request(params = {}, options = {}) {
  const response = await fetch(makeUrl(params), {
    method: options.method || 'GET',
    headers: { Accept: 'application/json, text/plain, */*', ...(options.headers || {}) },
    body: options.body,
    signal: options.signal,
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = data?.message || data?.error || `Gaana API request failed (${response.status})`;
    throw new Error(String(message));
  }
  return data;
}

const required = (value, label) => {
  const result = String(value ?? '').trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
};

export const gaanaApi = Object.freeze({
  request,
  // Generic parameter-driven calls are provided because Gaana's apiv2
  // actions and response shapes vary by resource and can change upstream.
  search: (query, params = {}) => request({ ...params, query: required(query, 'Search query') }),
  home: (params = {}) => request({ type: 'home', ...params }),
  album: (albumId, params = {}) => request({ type: 'album', album_id: required(albumId, 'Album ID'), ...params }),
  playlist: (playlistId, params = {}) => request({ type: 'playlist', playlist_id: required(playlistId, 'Playlist ID'), ...params }),
  artist: (artistId, params = {}) => request({ type: 'artist', artist_id: required(artistId, 'Artist ID'), ...params }),
  song: (songId, params = {}) => request({ type: 'song', song_id: required(songId, 'Song ID'), ...params }),
});

export default gaanaApi;
