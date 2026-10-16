import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchplaylistsByID,
  searchAlbumByQuery,
  searchPlayListByQuery,
} from "../../fetch";

import AlbumSlider from "./Sliders/AlbumSlider";
import PlaylistSlider from "./Sliders/PlaylistSlider";
import ArtistSlider from "./Sliders/ArtistSlider";
import SongGrid from "./SongGrid";
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { artistData } from "../genreData";
import { useLanguages } from "../hooks/useLanguages";
import { MUSIC_HOME } from "../services/api/backendMusicEndpoints.js";


const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const getHomePayload = (response) => {
  let value = response;
  for (let i = 0; i < 4; i += 1) {
    if (Array.isArray(value)) return value;
    if (!isObject(value) || value.data == null) break;
    value = value.data;
  }
  return isObject(value) || Array.isArray(value) ? value : {};
};

const getItemType = (item) => String(item?.type || item?.entity_type || item?.item_type || "").toLowerCase();
const getSectionTitle = (section, key) => String(section?.heading || section?.title || section?.name || section?.label || key || "").toLowerCase();

const mapHomeResponse = (response) => {
  const payload = getHomePayload(response);
  const sections = [];
  const seen = new Set();
  const addSection = (key, heading, list) => {
    if (!Array.isArray(list) || !list.length) return;
    const normalizedHeading = String(heading || key || "Music");
    const signature = `${normalizedHeading.toLowerCase()}:${list.length}:${String(list[0]?.id || list[0]?.songId || "")}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    sections.push({ key, heading: normalizedHeading, data: list.filter(isObject) });
  };

  // Supports mapped HomeData arrays, { sections: [...] }, and raw Saavn launch data.
  const normalizedSections = Array.isArray(payload?.sections)
    ? payload.sections
    : Array.isArray(payload?.data?.sections)
      ? payload.data.sections
      : null;

  if (normalizedSections) {
    normalizedSections.forEach((section, index) => {
      addSection(
        section?.key || section?.id || index,
        section?.heading || section?.title || section?.name,
        section?.data || section?.list || section?.items,
      );
    });
  } else if (Array.isArray(payload)) {
    payload.forEach((section, index) => addSection(section?.key || index, section?.heading || section?.title, section?.data || section?.list));
  } else {
    const modules = isObject(payload.modules) ? payload.modules : {};
    Object.entries(modules).forEach(([key, module]) => {
      const list = payload[key] || payload?.data?.[key] || module?.data || module?.list || module?.items;
      const heading = module?.heading || module?.title || module?.name || key.replace(/[_-]+/g, " ");
      addSection(key, heading, list);
    });
    Object.entries(payload).forEach(([key, value]) => {
      if (["modules", "history", "city_mod", "data", "status", "message"].includes(key)) return;
      if (Array.isArray(value)) {
        const title = key.replace(/[_-]+/g, " ");
        addSection(key, title, value);
      } else if (isObject(value) && Array.isArray(value.data)) {
        addSection(key, value.heading || value.title || key.replace(/[_-]+/g, " "), value.data);
      }
    });
  }

  const classify = (item) => {
    const type = getItemType(item);
    if (type.includes("song")) return "songs";
    if (type.includes("album")) return "albums";
    if (type.includes("artist")) return "artists";
    if (type.includes("playlist") || type.includes("list")) return "playlists";
    return "";
  };
  const allItems = sections.flatMap((section) => section.data);
  const collect = (kind) => {
    const result = []; const ids = new Set();
    sections.forEach((section) => {
      const title = getSectionTitle(section, section.key);
      const titleMatch = kind === "songs"
        ? /song|track|trending|latest|new release|top chart|recommend|launch|radio/.test(title)
        : kind === "albums" ? /album/.test(title)
        : kind === "artists" ? /artist/.test(title)
        : /playlist|mix/.test(title);
      section.data.forEach((item) => {
        const itemKind = classify(item);
        if (itemKind === kind || (kind === "songs" && titleMatch && !itemKind && (item?.id || item?.songId))) {
          const id = String(item?.id || item?.songId || item?.albumid || item?.token || `${item?.title || item?.name}-${result.length}`);
          if (!ids.has(id)) { ids.add(id); result.push(item); }
        }
      });
    });
    if (result.length) return result;
    return allItems.filter((item) => classify(item) === kind);
  };
  const songItems = collect("songs");
  const trendingSection = sections.find((section) => /trending|top chart|popular/.test(getSectionTitle(section, section.key)) && section.data.some((item) => classify(item) === "songs" || !getItemType(item)));
  const latestSection = sections.find((section) => /new song|latest|new release|recent release/.test(getSectionTitle(section, section.key)) && section.data.some((item) => classify(item) === "songs" || !getItemType(item)));
  return {
    sections,
    songs: songItems,
    trending: trendingSection?.data?.filter((item) => !getItemType(item) || classify(item) === "songs") || [],
    latest: latestSection?.data?.filter((item) => !getItemType(item) || classify(item) === "songs") || [],
    albums: collect("albums"),
    artists: collect("artists"),
    playlists: collect("playlists"),
  };
};

const requestHome = async (languages) => {
  const selected = Array.isArray(languages) ? languages : [languages];
  const languageQuery = selected.filter(Boolean).join(",");
  const url = new URL(MUSIC_HOME, window.location.origin);
  // Send both parameter names for compatibility with different backend controllers.
  url.searchParams.set("lang", languageQuery || "hindi");
  url.searchParams.set("language", languageQuery || "hindi");
  url.searchParams.set("languages", languageQuery || "hindi");
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Home API request failed (${response.status})`);
  return response.json();
};

const uniqueByMusicId = (items) => {
  const seen = new Set();
  return (items || []).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const id = String(item.id || item.songId || item.albumid || item.token || item.title || item.name || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

// ============================================================
// CACHE CONFIG
// ============================================================
const CACHE_TIME = 5 * 60 * 1000;
const CACHE_KEYS = {
  trending: "musicmax_main_trending",
  latest: "musicmax_main_latest",
  albums: "musicmax_main_albums",
  playlists: "musicmax_main_playlists",
};

const readCache = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.data)) return null;
    if (Date.now() - Number(parsed.timestamp || 0) > CACHE_TIME) return null;
    return parsed.data;
  } catch (error) {
    console.warn(`Cache read failed: ${key}`, error);
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    if (!Array.isArray(data)) return;
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (error) {
    console.warn(`Cache write failed: ${key}`, error);
  }
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const getResponseList = (response, keys = []) => {
  const candidates = [response?.data, response?.data?.data, response?.data?.results, response?.results, response];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) return candidate[key];
    }
  }
  return [];
};

const normalizeLanguageOptions = (response) => {
  const raw = getResponseList(response, ["languages", "list", "results"]);
  const options = raw
    .map((item) => {
      if (typeof item === "string") return { label: item, value: item.toLowerCase() };
      const label = item?.name ?? item?.label ?? item?.title ?? item?.language;
      const value = item?.value ?? item?.code ?? item?.id ?? label;
      if (!label || !value) return null;
      return { label: String(label), value: String(value).toLowerCase() };
    })
    .filter(Boolean);
  return options.length ? options : [
    { label: "Hindi", value: "hindi" },
    { label: "English", value: "english" },
    { label: "Tamil", value: "tamil" },
    { label: "Malayalam", value: "malayalam" },
    { label: "Telugu", value: "telugu" },
    { label: "Punjabi", value: "punjabi" },
    { label: "Kannada", value: "kannada" },
    { label: "Bengali", value: "bengali" },
    { label: "Marathi", value: "marathi" },
    { label: "Gujarati", value: "gujarati" },
    { label: "Bhojpuri", value: "bhojpuri" },
  ];
};

const SongGridList = ({ songs = [] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 px-4">
    {songs.slice(0, 16).map((song, index) => <SongGrid key={`song-list-${song?.id ?? song?.songId ?? index}`} {...song} songs={songs} />)}
  </div>
);

const MainSection = () => {
  const [selectedLanguages, setSelectedLanguages] = useState(() => {
    try {
      const saved = localStorage.getItem("musicmax_home_languages") || localStorage.getItem("d1music_selected_languages") || localStorage.getItem("musicmax_home_language");
      const parsed = (saved ? saved.replace(/[\[\]\"']/g, "") : "tamil,malayalam,hindi").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
      return [...new Set(parsed)].slice(0, 3).length ? [...new Set(parsed)].slice(0, 3) : ["tamil", "malayalam", "hindi"];
    } catch {
      return ["tamil", "malayalam", "hindi"];
    }
  });
  const selectedLanguage = selectedLanguages.join(",");
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [draftLanguages, setDraftLanguages] = useState(selectedLanguages);

  const { data: languagesResponse, isLoading: languagesLoading, error: languagesError } = useLanguages();
  const languageOptions = useMemo(() => normalizeLanguageOptions(languagesResponse), [languagesResponse]);
  const selectedLanguageLabels = selectedLanguages.map((value) => languageOptions.find((item) => item.value === value)?.label || value);

  const [trending, setTrending] = useState(() => readCache(CACHE_KEYS.trending) || []);
  const [latestSongs, setLatestSongs] = useState(() => readCache(CACHE_KEYS.latest) || []);
  const [albums, setAlbums] = useState(() => readCache(CACHE_KEYS.albums) || []);
  const [artists, setArtists] = useState(() => {
    if (Array.isArray(artistData?.results)) return artistData.results;
    if (Array.isArray(artistData)) return artistData;
    return [];
  });
  const [playlists, setPlaylists] = useState(() => readCache(CACHE_KEYS.playlists) || []);
  const [recentlyPlayedSongs, setRecentlyPlayedSongs] = useState([]);

  const [trendingLoading, setTrendingLoading] = useState(() => (readCache(CACHE_KEYS.trending) || []).length === 0);
  const [latestLoading, setLatestLoading] = useState(() => (readCache(CACHE_KEYS.latest) || []).length === 0);
  const [albumsLoading, setAlbumsLoading] = useState(() => (readCache(CACHE_KEYS.albums) || []).length === 0);
  const [playlistsLoading, setPlaylistsLoading] = useState(() => (readCache(CACHE_KEYS.playlists) || []).length === 0);
  const [error, setError] = useState("");

  const recentlyPlayedScrollRef = useRef(null);
  const latestSongsScrollRef = useRef(null);
  const trendingScrollRef = useRef(null);

  const loadRecentlyPlayed = useCallback(() => {
    try {
      const storedSongs = localStorage.getItem("playedSongs");
      const parsedSongs = storedSongs ? JSON.parse(storedSongs) : [];
      setRecentlyPlayedSongs(Array.isArray(parsedSongs) ? parsedSongs : []);
    } catch (err) {
      console.error("Unable to read recently played songs:", err);
      setRecentlyPlayedSongs([]);
    }
  }, []);

  useEffect(() => {
    loadRecentlyPlayed();
    const handleStorage = () => loadRecentlyPlayed();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("playedSongsUpdated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("playedSongsUpdated", handleStorage);
    };
  }, [loadRecentlyPlayed]);

  const scrollLeft = useCallback((ref) => {
    ref?.current?.scrollBy({ left: -800, behavior: "smooth" });
  }, []);
  const scrollRight = useCallback((ref) => {
    ref?.current?.scrollBy({ left: 800, behavior: "smooth" });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  // Load the home feed through MUSIC_HOME first. Older playlist/search endpoints remain
  // as fallbacks so a partial launch-data response does not leave the page empty.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const responses = await Promise.all(selectedLanguages.map((language) => requestHome([language]).catch((err) => {
          console.warn(`MUSIC_HOME failed for ${language}:`, err);
          return null;
        })));
        if (!mounted) return;
        const mappedList = responses.filter(Boolean).map(mapHomeResponse);
        const merged = {
          trending: uniqueByMusicId(mappedList.flatMap((item) => item.trending)),
          latest: uniqueByMusicId(mappedList.flatMap((item) => item.latest)),
          albums: uniqueByMusicId(mappedList.flatMap((item) => item.albums)),
          artists: uniqueByMusicId(mappedList.flatMap((item) => item.artists)),
          playlists: uniqueByMusicId(mappedList.flatMap((item) => item.playlists)),
        };
        if (merged.trending.length) { setTrending(merged.trending); writeCache(CACHE_KEYS.trending, merged.trending); }
        if (merged.latest.length) { setLatestSongs(merged.latest); writeCache(CACHE_KEYS.latest, merged.latest); }
        if (merged.albums.length) { setAlbums(merged.albums); writeCache(`${CACHE_KEYS.albums}_${selectedLanguage}`, merged.albums); }
        if (merged.artists.length) setArtists(merged.artists);
        if (merged.playlists.length) { setPlaylists(merged.playlists); writeCache(`${CACHE_KEYS.playlists}_${selectedLanguage}`, merged.playlists); }
        if (!mappedList.length) throw new Error("No selected-language Home feeds could be loaded.");
      } catch (err) {
        console.error("MUSIC_HOME API Error:", err);
        if (mounted) setError((prev) => prev || "Unable to load the Home API data. Showing available fallback data where possible.");
      } finally {
        if (mounted) { setTrendingLoading(false); setLatestLoading(false); }
      }
    })();
    return () => { mounted = false; };
  }, [selectedLanguage]);

  // Fallback trending songs if MUSIC_HOME does not include a trending song section.
  useEffect(() => {
    if (trending.length) return undefined;
    let mounted = true;
    (async () => {
      try {
        const response = await fetchplaylistsByID(10763385);
        if (!mounted) return;
        const songs = normalizeArray(response?.data?.songs);
        if (songs.length) { setTrending(songs); writeCache(CACHE_KEYS.trending, songs); }
      } catch (err) {
        console.warn("Trending fallback API error:", err);
      } finally { if (mounted) setTrendingLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // Fallback latest songs if MUSIC_HOME does not include a latest-song section.
  useEffect(() => {
    if (latestSongs.length) return undefined;
    let mounted = true;
    (async () => {
      try {
        const response = await fetchplaylistsByID(80802063);
        if (!mounted) return;
        const songs = normalizeArray(response?.data?.songs);
        if (songs.length) { setLatestSongs(songs); writeCache(CACHE_KEYS.latest, songs); }
      } catch (err) {
        console.warn("Latest songs fallback API error:", err);
      } finally { if (mounted) setLatestLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // Changing the language reloads language-specific albums and playlists.
  useEffect(() => {
    let mounted = true;
    const cacheKey = `${CACHE_KEYS.albums}_${selectedLanguage}`;
    const cached = readCache(cacheKey);
    setAlbums(cached || []);
    setAlbumsLoading(!cached?.length);
    (async () => {
      try {
        const responses = await Promise.all(selectedLanguages.map((language) => searchAlbumByQuery(language).catch(() => null)));
        if (!mounted) return;
        const results = uniqueByMusicId(responses.flatMap((response) => getResponseList(response, ["results", "albums", "list"])));
        setAlbums(results);
        writeCache(cacheKey, results);
        if (selectedLanguages.length === 1 && selectedLanguages[0] === "hindi") writeCache(CACHE_KEYS.albums, results);
      } catch (err) {
        console.error("Albums API Error:", err);
        if (mounted && !cached?.length) setError((prev) => prev || "Unable to load some music data.");
      } finally {
        if (mounted) setAlbumsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedLanguage]);

  useEffect(() => {
    let mounted = true;
    const cacheKey = `${CACHE_KEYS.playlists}_${selectedLanguage}`;
    const cached = readCache(cacheKey);
    setPlaylists(cached || []);
    setPlaylistsLoading(!cached?.length);
    (async () => {
      try {
        const responses = await Promise.all(selectedLanguages.map((language) => searchPlayListByQuery(language).catch(() => null)));
        if (!mounted) return;
        const results = uniqueByMusicId(responses.flatMap((response) => getResponseList(response, ["results", "playlists", "list"])));
        setPlaylists(results);
        writeCache(cacheKey, results);
        if (selectedLanguages.length === 1 && selectedLanguages[0] === "hindi") writeCache(CACHE_KEYS.playlists, results);
      } catch (err) {
        console.error("Playlists API Error:", err);
        if (mounted && !cached?.length) setError((prev) => prev || "Unable to load some music data.");
      } finally {
        if (mounted) setPlaylistsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedLanguage]);

  const handleLanguageToggle = (value) => {
    setDraftLanguages((current) => {
      const next = current.includes(value)
        ? current.filter((language) => language !== value)
        : current.length < 3 ? [...current, value] : current;
      return next.length ? [...new Set(next)].slice(0, 3) : current;
    });
  };

  const saveLanguages = () => {
    const normalized = [...new Set(draftLanguages)].slice(0, 3);
    if (!normalized.length) return;
    setSelectedLanguages(normalized);
    try {
      localStorage.setItem("musicmax_home_languages", normalized.join(","));
      localStorage.setItem("musicmax_home_language", normalized[0]);
      localStorage.setItem("d1music_selected_languages", JSON.stringify(normalized));
    } catch (err) {
      console.warn("Unable to save selected languages:", err);
    }
    window.dispatchEvent(new CustomEvent("d1musicLanguagesChanged", { detail: normalized }));
    setError("");
    setLanguageDialogOpen(false);
  };

  const resetLanguages = () => setDraftLanguages(["tamil", "malayalam", "hindi"]);


  const SectionLoader = () => (
    <div className="w-full px-4 py-5" aria-label="Loading section">
      <div className="h-28 w-full rounded-xl animate-pulse bg-black/10 dark:bg-white/10" />
    </div>
  );

  return (
    <main className="d1-discovery-home pt-3 lg:pt-5 mt-2 mb-24 flex flex-col items-stretch overflow-x-clip gap-5 w-full">
      {/* Language selector inspired by the Sunoh-style Home header. */}
      <div className="d1-home-tabs w-full px-4 lg:px-5 mb-1 flex items-center gap-2 overflow-x-auto scroll-hide">
        <button type="button" className="shrink-0 rounded-xl border border-pink-200/30 bg-pink-500/10 px-4 py-3 font-semibold" aria-pressed="true">Music</button>
        <button type="button" className="shrink-0 rounded-xl border border-black/15 dark:border-white/20 px-4 py-3 font-semibold opacity-80" onClick={() => window.dispatchEvent(new CustomEvent("d1musicOpenPodcasts"))}>Podcasts</button>
        <button type="button" onClick={() => { setDraftLanguages(selectedLanguages); setLanguageDialogOpen(true); }} className="min-w-0 flex-1 flex items-center justify-center gap-2 rounded-xl border border-pink-300/40 px-3 py-3 font-semibold hover:bg-pink-500/10" aria-haspopup="dialog" aria-expanded={languageDialogOpen}>
          <span aria-hidden="true">◎</span><span className="truncate">{selectedLanguageLabels.join(", ")}</span>
        </button>
        <button type="button" title="Music language settings" aria-label="Music language settings" onClick={() => { setDraftLanguages(selectedLanguages); setLanguageDialogOpen(true); }} className="shrink-0 rounded-xl p-3 text-xl">⚙</button>
      </div>
      {languageDialogOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLanguageDialogOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="music-language-title" className="flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-pink-200/15 bg-[#291d1b] text-[#f8dfe0] shadow-2xl">
            <div className="px-6 pb-3 pt-7 text-center sm:px-9">
              <div className="mb-3 text-3xl text-pink-200" aria-hidden="true">◎</div>
              <h2 id="music-language-title" className="text-2xl font-semibold sm:text-3xl">Music languages</h2>
              <p className="mt-4 text-left text-base leading-relaxed text-[#c7adad] sm:text-lg">Pick what shows up on Home. Radios and recommendations follow it too.</p>
              <p className="mt-2 text-left text-xs text-[#c7adad]">Choose 1–3 languages · {draftLanguages.length}/3 selected</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-8" role="group" aria-label="Music languages">
              {languageOptions.map((language) => {
                const checked = draftLanguages.includes(language.value);
                const disabled = !checked && draftLanguages.length >= 3;
                return <button key={language.value} type="button" disabled={disabled} aria-pressed={checked} onClick={() => handleLanguageToggle(language.value)} className={`flex w-full items-center gap-5 rounded-xl px-3 py-4 text-left text-lg transition-colors sm:py-5 sm:text-xl ${checked ? "text-pink-200" : "text-[#f8dfe0]"} ${disabled ? "opacity-35" : "hover:bg-white/5"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 ${checked ? "border-pink-300 bg-pink-300 text-[#291d1b]" : "border-[#c7adad]"}`}>{checked ? "✓" : ""}</span>
                  <span>{language.label}</span>
                </button>;
              })}
            </div>
            <div className="flex items-center justify-end gap-5 px-6 py-5 sm:px-9">
              <button type="button" onClick={resetLanguages} className="rounded-lg px-3 py-2 font-semibold text-pink-300 hover:bg-white/5">Reset</button>
              <button type="button" onClick={saveLanguages} disabled={!draftLanguages.length} className="rounded-lg bg-pink-300 px-5 py-2 font-semibold text-[#291d1b] disabled:opacity-40">Done</button>
            </div>
          </section>
        </div>
      )}

      <div className="hidden lg:block text-xl w-full font-semibold px-4 lg:px-5 m-0">
        {getGreeting()}
      </div>

      {error && (
        <div className="mx-4 mb-1 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 text-sm text-center" role="status">
          Some music sections could not be loaded. Please try again later.
        </div>
      )}

      {recentlyPlayedSongs.length > 0 && (
        <section className="d1-home-section flex flex-col justify-center items-start w-full">
          <h2 className="d1-section-title m-0 text-lg font-semibold w-full px-4">Recently Played</h2>
          <div className="flex justify-center items-center gap-3 w-full">
            <button type="button" aria-label="Scroll recently played left" onClick={() => scrollLeft(recentlyPlayedScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowLeft /></button>
            <div ref={recentlyPlayedScrollRef} className="flex flex-row grid-flow-col justify-start overflow-x-auto scroll-hide items-center gap-3 w-full px-4 scroll-smooth">
              {recentlyPlayedSongs.map((song, index) => <SongGrid key={song?.id ?? song?.songId ?? index} {...song} songs={recentlyPlayedSongs} />)}
            </div>
            <button type="button" aria-label="Scroll recently played right" onClick={() => scrollRight(recentlyPlayedScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowRight /></button>
          </div>
        </section>
      )}

      <section className="d1-home-section flex flex-col items-start w-full">
        <h2 className="d1-section-title m-0 text-lg font-semibold w-full px-4">New Songs</h2>
        {latestLoading && latestSongs.length === 0 ? <SectionLoader /> : latestSongs.length ? (
          <div className="flex justify-center items-center gap-3 w-full">
            <button type="button" aria-label="Scroll new songs left" onClick={() => scrollLeft(latestSongsScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowLeft /></button>
            <div ref={latestSongsScrollRef} className="flex flex-row grid-flow-col justify-start overflow-x-auto scroll-hide items-center gap-3 w-full px-4 scroll-smooth">
              {latestSongs.map((song, index) => <SongGrid key={song?.id ?? song?.songId ?? index} {...song} songs={latestSongs} />)}
            </div>
            <button type="button" aria-label="Scroll new songs right" onClick={() => scrollRight(latestSongsScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowRight /></button>
          </div>
        ) : <p className="px-5 opacity-60">No new songs available.</p>}
      </section>

      <section className="d1-home-section flex flex-col justify-center items-start w-full">
        <h2 className="d1-section-title m-0 text-lg font-semibold w-full px-4">Today Trending</h2>
        {trendingLoading && trending.length === 0 ? <SectionLoader /> : trending.length ? (
          <div className="flex justify-center items-center gap-3 w-full">
            <button type="button" aria-label="Scroll trending songs left" onClick={() => scrollLeft(trendingScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowLeft /></button>
            <div ref={trendingScrollRef} className="flex flex-row grid-flow-col justify-start overflow-x-auto scroll-hide items-center gap-3 w-full px-4 scroll-smooth">
              {trending.map((song, index) => <SongGrid key={song?.id ?? song?.songId ?? index} {...song} songs={trending} />)}
            </div>
            <button type="button" aria-label="Scroll trending songs right" onClick={() => scrollRight(trendingScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowRight /></button>
          </div>
        ) : <p className="px-5 opacity-60">No trending songs available.</p>}
      </section>

      <section className="d1-home-section w-full">
        <h2 className="d1-section-title m-0 text-lg font-semibold w-full px-4">Top Albums · {selectedLanguageLabels.join(" + ")}</h2>
        {albumsLoading && albums.length === 0 ? <SectionLoader /> : albums.length ? <AlbumSlider albums={albums} /> : <p className="px-5 opacity-60">No albums available for this language.</p>}
      </section>

         {/* Home discovery rows follow the two supplied reference screenshots. Rows reuse actual
          results from the API; we do not render fake empty cards when data is missing. */}
      {trending.length > 0 && (
        <section className="d1-home-section w-full">
          <h2 className="d1-section-title">Trending</h2>
          <div className="d1-horizontal-row scroll-hide">{trending.map((song, index) => <SongGrid key={`trending-extra-${song?.id ?? song?.songId ?? index}`} {...song} songs={trending} />)}</div>
        </section>
      )}
      {trending.length > 0 && (
        <section className="d1-home-section w-full">
          <h2 className="d1-section-title">Top Charts</h2>
          <div className="d1-horizontal-row scroll-hide">{trending.map((song, index) => <SongGrid key={`chart-${song?.id ?? song?.songId ?? index}`} {...song} songs={trending} />)}</div>
        </section>
      )}
      {(latestSongs.length || trending.length) > 0 && (
        <section className="d1-home-section w-full">
          <h2 className="d1-section-title">New Releases</h2>
          <div className="d1-horizontal-row scroll-hide">{(latestSongs.length ? latestSongs : trending).map((song, index, list) => <SongGrid key={`release-${song?.id ?? song?.songId ?? index}`} {...song} songs={list} />)}</div>
        </section>
      )}
      {(latestSongs.length || trending.length) > 0 && (
        <section className="d1-home-section w-full">
          <h2 className="d1-section-title">Recommended</h2>
          <div className="d1-horizontal-row scroll-hide">{(latestSongs.length ? latestSongs : trending).map((song, index, list) => <SongGrid key={`recommended-${song?.id ?? song?.songId ?? index}`} {...song} songs={list} />)}</div>
        </section>
      )}
      {playlists.length > 0 && (
        <section className="d1-home-section w-full">
          <h2 className="d1-section-title">Editorial Picks</h2><PlaylistSlider playlists={playlists} />
        </section>
      )}
      {artists.length > 0 && (
        <section className="d1-home-section w-full">
          <h2 className="d1-section-title">Top Streamed Artists</h2><ArtistSlider artists={artists} />
        </section>
      )}
      <section className="d1-home-section w-full px-4">
        <h2 className="d1-section-title">Browse</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            ["Romance", "#b91c35"], ["Workout", "#b45309"], ["Best Of 2022", "#887347"], ["Best Of 2020", "#4d8c25"], ["Best Of 2021", "#984c3e"], ["EDM", "#426f87"],
            ["Carvaan", "#b96520"], ["The 1990s", "#a71d55"], ["Chill", "#456b82"], ["Top JioTunes", "#54704a"], ["The 2000s", "#806a43"], ["Devotional", "#4c871d"],
            ["Dance", "#ad8422"], ["Happy", "#b85e1d"], ["Party", "#8a4b24"], ["The 2010s", "#b21d57"], ["Hip Hop", "#a21c55"], ["Travel", "#167c79"]
          ].map(([label, color]) => (
            <button key={label} type="button" onClick={() => window.dispatchEvent(new CustomEvent("d1musicBrowseCategory", { detail: { category: label, languages: selectedLanguages } }))} className="min-h-14 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${color}, #251719)` }}>{label}</button>
          ))}
        </div>
      </section>
      {artists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Featured Artists</h2><ArtistSlider artists={artists} /></section>
      )}
      {playlists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Romance</h2><PlaylistSlider playlists={playlists} /></section>
      )}
      {playlists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Gaana Party Central</h2><PlaylistSlider playlists={playlists} /></section>
      )}
      {playlists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Star Gallery</h2><PlaylistSlider playlists={playlists} /></section>
      )}
      {artists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Top Searched Artists</h2><ArtistSlider artists={artists} /></section>
      )}
      {(latestSongs.length || trending.length) > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Popular In Your Language · {selectedLanguageLabels.join(" + ")}</h2><SongGridList songs={latestSongs.length ? latestSongs : trending} /></section>
      )}
      {playlists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Just Arrived</h2><PlaylistSlider playlists={playlists} /></section>
      )}
      {(trending.length || latestSongs.length) > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Popular Songs</h2><SongGridList songs={trending.length ? trending : latestSongs} /></section>
      )}
      {playlists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Indie Playlists</h2><PlaylistSlider playlists={playlists} /></section>
      )}
      {playlists.length > 0 && (
        <section className="d1-home-section w-full"><h2 className="d1-section-title">Mehfil-e-Ghazal</h2><PlaylistSlider playlists={playlists} /></section>
      )}

      <section className="d1-home-section w-full flex flex-col gap-2">
        <h2 className="d1-section-title">Top Playlists · {selectedLanguageLabels.join(" + ")}</h2>
        {playlistsLoading && playlists.length === 0 ? <SectionLoader /> : playlists.length ? <PlaylistSlider playlists={playlists} /> : <p className="px-5 opacity-60">No playlists available for this language.</p>}
      </section>
    </main>
  );
};

export default MainSection;
