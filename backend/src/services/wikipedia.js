// In-memory cache — story text doesn't change often
const storyCache = new Map();

const HEADERS = {
  'User-Agent': 'MythologyParisApp/1.0 (open-source educational project)',
  'Accept': 'application/json',
};

async function tryFetch(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    title: data.title,
    extract: data.extract,
    thumbnailUrl: data.thumbnail?.source ?? null,
    wikiUrl: data.content_urls?.desktop?.page ?? null,
  };
}

/**
 * Fetch a Wikipedia article summary.
 * @param {string} wikiPage - English article title (e.g. "Cupid_and_Psyche")
 * @param {string} [wikiPageFr] - French article title (e.g. "Cupidon_et_Psych%C3%A9")
 *   If provided, French Wikipedia is tried first (more relevant for Paris context).
 */
export async function fetchStory(wikiPage, wikiPageFr) {
  const cacheKey = wikiPageFr ?? wikiPage;
  if (storyCache.has(cacheKey)) return storyCache.get(cacheKey);

  let story = null;
  try {
    // Try French Wikipedia first when a French page title is provided
    if (wikiPageFr) {
      story = await tryFetch(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${wikiPageFr}`
      );
      if (story) console.log(`[wikipedia] Loaded from fr.wikipedia: ${wikiPageFr}`);
    }
    // Fall back to English Wikipedia
    if (!story) {
      story = await tryFetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiPage)}`
      );
      if (story) console.log(`[wikipedia] Loaded from en.wikipedia: ${wikiPage}`);
    }
    if (!story) {
      console.warn(`[wikipedia] Could not fetch story for "${cacheKey}"`);
      return null;
    }
    storyCache.set(cacheKey, story);
    return story;
  } catch (err) {
    console.error('[wikipedia] Fetch error:', err.message);
    return null;
  }
}
