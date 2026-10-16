import {
  MUSIC_ALBUM,
  MUSIC_ARTIST,
  MUSIC_HOME,
  MUSIC_LANGUAGES,
  MUSIC_OCCASIONS,
  MUSIC_OCCASIONS_DETAIL,
  MUSIC_PLAYLIST,
  MUSIC_RADIO_PLAY,
  MUSIC_RADIO_SESSION,
  MUSIC_SEARCH,
  MUSIC_SONG,
  MUSIC_SONG_STREAM,
} from './endpoints.js';

export const MusicProvider = Object.freeze({
  GAANA: 'gaana', SAAVN: 'saavn', SPOTIFY: 'spotify', UNIFIED: 'unified',
});

const withParams = (endpoint, params = {}) => {
  const url = new URL(endpoint, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
};

async function request(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

const normalizeId = (id, label) => {
  const value = String(id ?? '').trim();
  if (!value) throw new Error(`${label} is required`);
  return value;
};

export const saavnApi = {
  fetchHomeData: async (languages = 'hindi,english') => request(withParams(MUSIC_HOME, { lang: languages })),

  fetchAlbumDetails: async (albumId) => request(MUSIC_ALBUM(normalizeId(albumId, 'Album ID'))),

  fetchPlaylistDetails: async (playlistId) => request(MUSIC_PLAYLIST(normalizeId(playlistId, 'Playlist ID'))),

  fetchSongDetails: async (songId) => request(MUSIC_SONG(normalizeId(songId, 'Song ID'))),

  fetchArtistDetails: async (artistId) => request(MUSIC_ARTIST(normalizeId(artistId, 'Artist ID'))),

  fetchSongStream: async (songId) => request(MUSIC_SONG_STREAM(normalizeId(songId, 'Song ID'))),

  search: async (query, languages = 'hindi,english', provider = 'saavn', type = 'songs') => {
    const q = String(query ?? '').trim();
    const endpoint = withParams(MUSIC_SEARCH, {
      q,
      query: q,
      lang: languages,
      type,
      provider,
      p: 1,
      n: 150,
    });
    const data = await request(endpoint);
    if (type === 'all') return data;

    const payload = data?.data;
    let list = Array.isArray(payload?.list) ? payload.list : Array.isArray(payload?.results) ? payload.results : [];
    if (!list.length && Array.isArray(payload)) {
      const section = payload.find((item) => ['songs', 'topquery'].includes(String(item?.heading || '').toLowerCase()));
      if (Array.isArray(section?.data)) list = section.data;
    }
    return { ...data, data: { ...(Array.isArray(payload) ? {} : payload), list } };
  },

  fetchOccasions: async () => request(MUSIC_OCCASIONS),
  fetchOccasionDetails: async (slug) => request(MUSIC_OCCASIONS_DETAIL(normalizeId(slug, 'Occasion slug'))),
  fetchTrendingSearch: async () => request(withParams(MUSIC_SEARCH, { query: '', q: '', type: 'all' })),
  fetchLanguages: async () => request(MUSIC_LANGUAGES),

  initRadioSession: async (id, type = 'song', provider = 'saavn', name, lang) => request(withParams(MUSIC_RADIO_SESSION, {
    entity_id: normalizeId(id, 'Radio entity ID'), entity_type: type, provider, name, lang,
  })),

  fetchRadioSongs: async (sessionId, count = 20, next = 1, lang) => request(withParams(MUSIC_RADIO_PLAY(normalizeId(sessionId, 'Radio session ID')), { count, next, lang })),
};

export default saavnApi;
