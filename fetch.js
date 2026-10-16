/*
|--------------------------------------------------------------------------
| JioSaavn API
|--------------------------------------------------------------------------
| Search functions:
|
|   getSongbyQuery(query, limit)
|   getArtistbyQuery(query, limit)
|   searchAlbumByQuery(query, limit)
|   searchPlayListByQuery(query, limit)
|
| No page argument is required by components.
|
| Pagination is handled internally.
|--------------------------------------------------------------------------
*/

import { config } from "./saavn.config.js";

// Use the same-origin proxy in production. Direct browser calls to JioSaavn
// can fail because the upstream API does not consistently allow CORS.
const API_URL = "/api/jiosaavn";

const DEFAULT_LIMIT = 150;

/*
|--------------------------------------------------------------------------
| URL Builder
|--------------------------------------------------------------------------
*/

const resolveApiMethod = (endpoint) => {
  const value = String(endpoint || "").replace(/^\/+|\/+$/g, "");

  if (value === "search") return config.saavn.endpoint.search.all;
  if (value === "search/songs") return config.saavn.endpoint.search.songs;
  if (value === "search/albums") return config.saavn.endpoint.search.albums;
  if (value === "search/artists") return config.saavn.endpoint.search.artists;
  if (value === "search/playlists") return config.saavn.endpoint.search.playlists;
  if (value === "songs") return config.saavn.endpoint.song.id;
  if (value === "albums") return config.saavn.endpoint.album.id;
  if (value === "artists") return config.saavn.endpoint.artist.id;
  if (value === "playlists") return config.saavn.endpoint.playlist.id;
  if (value === "lyrics") return config.saavn.endpoint.get.lyrics;
  if (/^songs\/[^/]+\/suggestions$/.test(value)) return config.saavn.endpoint.song.recommended;
  throw new Error(`Unsupported JioSaavn API endpoint: ${value}`);
};

const buildUrl = (endpoint, params = {}) => {
  const value = String(endpoint || "").replace(/^\/+|\/+$/g, "");
  const method = resolveApiMethod(value);
  const url = new URL(API_URL, window.location.origin);
  const page = Number(params.page || 0);
  const id = params.id ?? value.match(/^songs\/([^/]+)\/suggestions$/)?.[1];

  url.searchParams.set("__call", method);
  url.searchParams.set("_format", config.saavn._format);
  url.searchParams.set("_marker", String(config.saavn._marker));
  url.searchParams.set("api_version", config.saavn.api_version);
  url.searchParams.set("ctx", config.saavn.ctx);
  url.searchParams.set("cc", "in");
  url.searchParams.set("includeMetaTags", "1");

  if (params.query) {
    // autocomplete.get expects `query`; search endpoints expect `q`.
    url.searchParams.set(
      method === config.saavn.endpoint.search.all ? "query" : "q",
      String(params.query),
    );
  }
  if (params.page !== undefined && method.startsWith("search.")) {
    url.searchParams.set("p", String(page + 1));
  }
  if (params.limit !== undefined) {
    url.searchParams.set("n", String(params.limit));
  }
  if (id !== undefined && id !== null && id !== "") {
    if (method === config.saavn.endpoint.song.id) url.searchParams.set("pids", String(id));
    else if (method === config.saavn.endpoint.album.id) url.searchParams.set("albumid", String(id));
    else if (method === config.saavn.endpoint.artist.id) url.searchParams.set("artistId", String(id));
    else if (method === config.saavn.endpoint.playlist.id) url.searchParams.set("listid", String(id));
    else if (method === config.saavn.endpoint.song.recommended) url.searchParams.set("pid", String(id));
    else if (method === config.saavn.endpoint.get.lyrics) url.searchParams.set("lyrics_id", String(id));
  }

  return url.toString();
};

/*
|--------------------------------------------------------------------------
| Common API Request
|--------------------------------------------------------------------------
*/

const apiRequest = async (
  endpoint,
  params = {}
) => {
  const url = buildUrl(endpoint, params);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const contentType =
      response.headers.get("content-type") || "";

    let data;

    if (
      contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      data = await response.json();
    } else {
      const text = await response.text();

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        data?.data?.message ||
        `Request failed: ${response.status} ${response.statusText}`;

      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error(
      "JioSaavn API Error:",
      error
    );

    console.error(
      "Request URL:",
      url
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

const requireQuery = (
  query,
  name = "Search"
) => {
  const value = String(
    query ?? ""
  ).trim();

  if (!value) {
    throw new Error(
      `${name} query is required`
    );
  }

  return value;
};

const requireId = (
  id,
  name = "ID"
) => {
  const value = String(
    id ?? ""
  ).trim();

  if (!value) {
    throw new Error(
      `${name} is required`
    );
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Limit
|--------------------------------------------------------------------------
|
| The limit is the number requested PER API PAGE.
|
| There is intentionally NO:
|
| Math.min(limit, 150)
|
| because that would create an artificial frontend limit.
|--------------------------------------------------------------------------
*/

const normalizeLimit = (
  limit = DEFAULT_LIMIT
) => {
  const value = Number(limit);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.floor(value);
};

/*
|--------------------------------------------------------------------------
| Extract Results
|--------------------------------------------------------------------------
*/

const extractResults = (
  response
) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.songs)) return response.songs;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.list)) return response.list;
  if (Array.isArray(response?.data?.songs)) return response.data.songs;
  if (Array.isArray(response?.data?.list)) return response.data.list;

  if (
    Array.isArray(
      response?.data?.results
    )
  ) {
    return response.data.results;
  }

  if (
    Array.isArray(response?.results)
  ) {
    return response.results;
  }

  return [];
};

/*
|--------------------------------------------------------------------------
| Extract Total
|--------------------------------------------------------------------------
*/

const extractTotal = (
  response
) => {
  const values = [
    response?.data?.total,
    response?.total,
    response?.data?.count,
  ];

  for (const value of values) {
    const total = Number(value);

    if (
      Number.isFinite(total) &&
      total >= 0
    ) {
      return total;
    }
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Remove Duplicate Results
|--------------------------------------------------------------------------
*/

const removeDuplicates = (
  items
) => {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const id =
      item?.id ??
      item?.songId ??
      item?.albumId ??
      item?.artistId ??
      item?.playlistId;

    /*
     * If there is no ID, keep the item.
     */
    if (
      id === undefined ||
      id === null ||
      id === ""
    ) {
      output.push(item);
      continue;
    }

    const key = String(id);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
};

/*
|--------------------------------------------------------------------------
| Create Standard Response
|--------------------------------------------------------------------------
|
| Existing components use:
|
| response.data.results
|
| Keep that format.
|--------------------------------------------------------------------------
*/

const createResultsResponse = (
  results,
  originalResponse = {}
) => {
  const originalData =
    originalResponse?.data &&
    typeof originalResponse.data ===
      "object" &&
    !Array.isArray(
      originalResponse.data
    )
      ? originalResponse.data
      : {};

  return {
    ...originalResponse,

    success:
      originalResponse?.success !==
      undefined
        ? originalResponse.success
        : true,

    data: {
      ...originalData,

      results,

      total: results.length,

      start: 0,

      count: results.length,
    },
  };
};

/*
|--------------------------------------------------------------------------
| FETCH ALL PAGINATED RESULTS
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Components do NOT pass page.
|
| Internally:
|
| page 0
| page 1
| page 2
| page 3
| ...
|
| continues until there are no more results.
|--------------------------------------------------------------------------
*/

const fetchAllResults = async ({
  endpoint,
  params = {},
  limit = DEFAULT_LIMIT,
}) => {
  const pageLimit =
    normalizeLimit(limit);

  const allResults = [];

  let page = 0;

  let firstResponse = null;

  let total = null;

  while (true) {
    const response =
      await apiRequest(
        endpoint,
        {
          ...params,

          page,

          limit: pageLimit,
        }
      );

    if (!firstResponse) {
      firstResponse = response;

      total =
        extractTotal(response);
    }

    const pageResults =
      extractResults(response);

    /*
     * No results = finished.
     */
    if (
      pageResults.length === 0
    ) {
      break;
    }

    allResults.push(
      ...pageResults
    );

    /*
     * API supplied total.
     */
    if (
      total !== null &&
      allResults.length >= total
    ) {
      break;
    }

    /*
     * A short page normally means
     * the final page.
     */
    if (
      pageResults.length <
      pageLimit
    ) {
      break;
    }

    /*
     * Protection against a broken
     * API returning forever.
     */
    if (page >= 10000) {
      console.warn(
        "JioSaavn API pagination stopped at page 10000."
      );

      break;
    }

    page += 1;
  }

  const uniqueResults =
    removeDuplicates(
      allResults
    );

  return createResultsResponse(
    uniqueResults,
    firstResponse
  );
};

/*
|--------------------------------------------------------------------------
| GENERAL SEARCH
|--------------------------------------------------------------------------
|
| Searches songs + albums + artists + playlists.
|--------------------------------------------------------------------------
*/

export const getSearchData = async (
  query,
  limit = DEFAULT_LIMIT
) => {
  const searchQuery =
    requireQuery(query);

  const safeLimit =
    normalizeLimit(limit);

  return apiRequest(
    "search",
    {
      query: searchQuery,
      limit: safeLimit,
    }
  );
};

/*
|--------------------------------------------------------------------------
| SONGS
|--------------------------------------------------------------------------
*/

/*
 * Search ALL matching songs.
 *
 * Usage:
 *
 * getSongbyQuery("Arijit Singh")
 * getSongbyQuery("Arijit Singh", 150)
 *
 * No page required.
 */

export const getSongbyQuery = async (
  query,
  limit = DEFAULT_LIMIT
) => {
  const searchQuery =
    requireQuery(
      query,
      "Song search"
    );

  return fetchAllResults({
    endpoint: "search/songs",

    params: {
      query: searchQuery,
    },

    limit,
  });
};

/*
 * Alias
 */

export const searchSongByQuery =
  getSongbyQuery;

/*
|--------------------------------------------------------------------------
| GET SONG BY ID
|--------------------------------------------------------------------------
*/

export const getSongById = async (
  songId
) => {
  const id =
    requireId(
      songId,
      "Song ID"
    );

  return apiRequest(
    "songs",
    {
      id,
    }
  );
};

/*
 * Alias
 */

export const fetchSongByID =
  getSongById;

/*
|--------------------------------------------------------------------------
| SONG SUGGESTIONS
|--------------------------------------------------------------------------
*/

export const getSuggestionSong =
  async (
    songId,
    limit = DEFAULT_LIMIT
  ) => {
    const id =
      requireId(
        songId,
        "Song ID"
      );

    return fetchAllResults({
      endpoint:
        `songs/${encodeURIComponent(
          id
        )}/suggestions`,

      params: {},

      limit,
    });
  };

/*
 * Alias
 */

export const fetchSongSuggestionsByID =
  getSuggestionSong;

/*
|--------------------------------------------------------------------------
| LYRICS
|--------------------------------------------------------------------------
*/

export const LyricsByID = async (
  songId
) => {
  const id =
    requireId(
      songId,
      "Song ID"
    );

  return apiRequest(
    "lyrics",
    {
      id,
    }
  );
};

/*
 * Alias
 */

export const getLyricsById =
  LyricsByID;

/*
|--------------------------------------------------------------------------
| ARTISTS
|--------------------------------------------------------------------------
*/

/*
 * Search ALL matching artists.
 *
 * Usage:
 *
 * getArtistbyQuery("A R Rahman")
 * getArtistbyQuery("A R Rahman", 150)
 *
 * No page required.
 */

export const getArtistbyQuery =
  async (
    query,
    limit = DEFAULT_LIMIT
  ) => {
    const searchQuery =
      requireQuery(
        query,
        "Artist search"
      );

    return fetchAllResults({
      endpoint:
        "search/artists",

      params: {
        query: searchQuery,
      },

      limit,
    });
  };

/*
 * Alias
 */

export const searchArtistByQuery =
  getArtistbyQuery;

/*
|--------------------------------------------------------------------------
| GET ARTIST BY ID
|--------------------------------------------------------------------------
*/

export const fetchArtistByID =
  async (
    artistId
  ) => {
    const id =
      requireId(
        artistId,
        "Artist ID"
      );

    return apiRequest(
      "artists",
      {
        id,
      }
    );
  };

/*
|--------------------------------------------------------------------------
| ALBUMS
|--------------------------------------------------------------------------
*/

/*
 * Search ALL matching albums.
 *
 * Usage:
 *
 * searchAlbumByQuery("Tamil")
 * searchAlbumByQuery("Tamil", 150)
 *
 * No page required.
 */

export const searchAlbumByQuery =
  async (
    query,
    limit = DEFAULT_LIMIT
  ) => {
    const searchQuery =
      requireQuery(
        query,
        "Album search"
      );

    return fetchAllResults({
      endpoint:
        "search/albums",

      params: {
        query: searchQuery,
      },

      limit,
    });
  };

/*
 * Alias
 */

export const getAlbumbyQuery =
  searchAlbumByQuery;

/*
|--------------------------------------------------------------------------
| GET ALBUM BY ID
|--------------------------------------------------------------------------
*/

export const fetchAlbumByID =
  async (
    albumId,
    limit = DEFAULT_LIMIT
  ) => {
    const id =
      requireId(
        albumId,
        "Album ID"
      );

    return apiRequest(
      "albums",
      {
        id,
        limit:
          normalizeLimit(limit),
      }
    );
  };

/*
|--------------------------------------------------------------------------
| PLAYLISTS
|--------------------------------------------------------------------------
*/

/*
 * Search ALL matching playlists.
 *
 * Usage:
 *
 * searchPlayListByQuery("Tamil")
 * searchPlayListByQuery("Malayalam")
 *
 * No page required.
 */

export const searchPlayListByQuery =
  async (
    query,
    limit = DEFAULT_LIMIT
  ) => {
    const searchQuery =
      requireQuery(
        query,
        "Playlist search"
      );

    return fetchAllResults({
      endpoint:
        "search/playlists",

      params: {
        query: searchQuery,
      },

      limit,
    });
  };

/*
 * Standard spelling alias.
 */

export const searchPlaylistByQuery =
  searchPlayListByQuery;

/*
|--------------------------------------------------------------------------
| GET PLAYLIST BY ID
|--------------------------------------------------------------------------
*/

export const fetchplaylistsByID =
  async (
    playlistId,
    limit = DEFAULT_LIMIT
  ) => {
    const id =
      requireId(
        playlistId,
        "Playlist ID"
      );

    return apiRequest(
      "playlists",
      {
        id,
        limit:
          normalizeLimit(limit),
      }
    );
  };

/*
 * Standard spelling alias.
 */

export const fetchPlaylistsByID =
  fetchplaylistsByID;

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  /*
   * General
   */
  getSearchData,

  /*
   * Songs
   */
  getSongbyQuery,
  searchSongByQuery,
  getSongById,
  fetchSongByID,
  getSuggestionSong,
  fetchSongSuggestionsByID,

  /*
   * Lyrics
   */
  LyricsByID,
  getLyricsById,

  /*
   * Artists
   */
  getArtistbyQuery,
  searchArtistByQuery,
  fetchArtistByID,

  /*
   * Albums
   */
  searchAlbumByQuery,
  getAlbumbyQuery,
  fetchAlbumByID,

  /*
   * Playlists
   */
  searchPlayListByQuery,
  searchPlaylistByQuery,
  fetchplaylistsByID,
  fetchPlaylistsByID,
};
