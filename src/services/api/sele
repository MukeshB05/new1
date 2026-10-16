/** Shared language preference for Home, radio and recommendation requests. */
export const DEFAULT_MUSIC_LANGUAGES = ['tamil', 'malayalam', 'hindi'];
export const MUSIC_LANGUAGES_STORAGE_KEY = 'musicmax_home_languages';

export function getSelectedMusicLanguages() {
  try {
    const saved = localStorage.getItem(MUSIC_LANGUAGES_STORAGE_KEY)
      || localStorage.getItem('d1music_selected_languages')
      || localStorage.getItem('musicmax_home_language');
    if (!saved) return [...DEFAULT_MUSIC_LANGUAGES];
    let values;
    try {
      const parsed = JSON.parse(saved);
      values = Array.isArray(parsed) ? parsed : String(saved).split(',');
    } catch {
      values = String(saved).split(',');
    }
    const clean = [...new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, 3);
    return clean.length ? clean : [...DEFAULT_MUSIC_LANGUAGES];
  } catch {
    return [...DEFAULT_MUSIC_LANGUAGES];
  }
}

export function withSelectedMusicLanguages(url, languages = getSelectedMusicLanguages()) {
  const list = Array.isArray(languages) ? languages : [languages];
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('languages', list.join(','));
    parsed.searchParams.set('lang', list.join(','));
    return parsed.toString();
  } catch {
    return url;
  }
}
