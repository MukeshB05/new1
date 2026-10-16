import { useEffect, useState } from "react";

const DEFAULT_LANGUAGES = [
  { name: "Hindi", value: "hindi" },
  { name: "English", value: "english" },
  { name: "Tamil", value: "tamil" },
  { name: "Malayalam", value: "malayalam" },
  { name: "Telugu", value: "telugu" },
  { name: "Punjabi", value: "punjabi" },
  { name: "Kannada", value: "kannada" },
  { name: "Bengali", value: "bengali" },
  { name: "Marathi", value: "marathi" },
  { name: "Gujarati", value: "gujarati" },
  { name: "Bhojpuri", value: "bhojpuri" },
  { name: "Urdu", value: "urdu" },
  { name: "Haryanvi", value: "haryanvi" },
  { name: "Rajasthani", value: "rajasthani" },
  { name: "Assamese", value: "assamese" },
  { name: "Odia", value: "odia" },
  { name: "Kashmiri", value: "kashmiri" },
];

/**
 * Provides language options without requiring an extra React Query dependency
 * or an API route that may not be deployed. A future API can override defaults.
 */
export const useLanguages = () => {
  const [state, setState] = useState({
    data: DEFAULT_LANGUAGES,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadLanguages = async () => {
      try {
        const response = await fetch("/api/languages", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const list = Array.isArray(payload)
          ? payload
          : payload?.data?.languages ?? payload?.languages ?? payload?.data;
        if (active && Array.isArray(list) && list.length > 0) {
          setState({ data: list, isLoading: false, error: null });
        }
      } catch (error) {
        if (active && error?.name !== "AbortError") {
          // Defaults are intentional: the Home language picker still works offline.
          setState((current) => ({ ...current, error }));
        }
      }
    };

    void loadLanguages();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
};

export default useLanguages;
