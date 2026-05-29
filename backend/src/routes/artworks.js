import { Router } from 'express';
import { fetchArtworksForTheme, THEMES } from '../services/wikidata.js';
import { loadJocondeArtworks, lookupCommonsImage } from '../services/joconde.js';
import { fetchStory } from '../services/wikipedia.js';

/** Lowercase + strip diacritics so "Psyché" and "PSYCHE" both become "psyche". */
function normalizeText(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Deduplicate key: normalized title + canonical artist + canonical museum.
 *
 * Handles three systematic mismatches between Wikidata and Joconde:
 *
 * 1. Title accents — Wikidata uses proper French ("Psyché et l'Amour"),
 *    Joconde CSV stores titles in uppercase ASCII ("PSYCHE ET L'AMOUR").
 *    Fix: strip diacritics so both normalise to "psyche et l'amour".
 *
 * 2. Artist name order — Joconde uses "LAST Firstname" order while Wikidata
 *    uses "Firstname Last". Fix: sort name tokens alphabetically so
 *    "Canova Antonio" and "Antonio Canova" produce the same key.
 *
 * 3. Museum URL vs name — Wikidata sets museum.wikidataUrl (e.g.
 *    http://www.wikidata.org/entity/Q3044772) whose first 30 chars are
 *    identical for every entity, collapsing all Wikidata museums to the same
 *    bucket. Fix: use museum.name instead, and normalise all Louvre
 *    sub-departments ("Département des sculptures du musée du Louvre",
 *    "musée du Louvre", etc.) to the canonical key "louvre".
 *    The sub-department name is preserved in the stored data for display /
 *    research — only the key is normalised.
 */
function dedupKey(a) {
  // Strip punctuation from title so "Psyché, au jardin" ≡ "Psyché au jardin"
  // and "AUSSI CONNU SOUS LE TITRE : 'PSYCHE'" ≡ "AUSSI CONNU SOUS LE TITRE PSYCHE"
  const title = normalizeText(a.title)
    .replace(/[,;:()'"`«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Sort name tokens so "Canova Antonio" ≡ "Antonio Canova"
  const artist = normalizeText(a.artist)
    .replace(/[;,]+/g, ' ')        // flatten multi-artist / date separators
    .replace(/\(.*?\)/g, ' ')      // remove parenthesised dates/nationalities
    .replace(/[-\s]+/g, ' ')
    .trim()
    .split(/\s+/)
    .sort()
    .slice(0, 4)                   // cap at 4 tokens for stability
    .join(' ');
  const rawMuseum = normalizeText(a.museum?.name || '');
  const museumKey = rawMuseum.includes('louvre') ? 'louvre' : rawMuseum.slice(0, 30);
  return `${title}|${artist}|${museumKey}`;
}

/**
 * Title-only key for cross-source dedup.
 * Wikidata and Joconde use different artist name conventions
 * ("Polidoro da Caravaggio" vs "Polidoro (?) Caldara"), so for cross-source
 * matching we fall back to title + museum only.
 */
function titleMuseumKey(a) {
  const title = normalizeText(a.title)
    .replace(/[,;:()'"`«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const rawMuseum = normalizeText(a.museum?.name || '');
  const museumKey = rawMuseum.includes('louvre') ? 'louvre' : rawMuseum.slice(0, 30);
  return `${title}|${museumKey}`;
}

/** Merge Wikidata + Joconde results, deduplicating by title + artist + museum. */
function mergeArtworks(wikidataItems, jocondeItems) {
  const seen          = new Set(wikidataItems.map(dedupKey));
  // Secondary index: title+museum only, catches cross-source artist-name mismatches
  const seenTitleMuseum = new Set(wikidataItems.map(titleMuseumKey));
  const novel = jocondeItems.filter(a => {
    const k  = dedupKey(a);
    const tm = titleMuseumKey(a);
    if (seen.has(k) || seenTitleMuseum.has(tm)) return false;
    seen.add(k);
    seenTitleMuseum.add(tm);
    return true;
  });
  return [...wikidataItems, ...novel];
}

const router = Router();

// GET /api/artworks?theme=cupid-psyche
router.get('/', async (req, res) => {
  const themeSlug = req.query.theme || 'cupid-psyche';
  const theme = THEMES[themeSlug];
  if (!theme) {
    return res.status(404).json({ error: `Unknown theme: ${themeSlug}` });
  }
  try {
    const [wikidataArtworks, jocondeArtworks] = await Promise.all([
      fetchArtworksForTheme(themeSlug),
      Promise.resolve(loadJocondeArtworks(themeSlug)),
    ]);
    const artworks = mergeArtworks(wikidataArtworks, jocondeArtworks);

    // Resolve missing images via Wikimedia Commons (parallel, cached in-process)
    await Promise.all(
      artworks.map(async a => {
        if (!a.imageUrl) {
          a.imageUrl = await lookupCommonsImage(a.title);
        }
      })
    );

    console.log(`[artworks] ${wikidataArtworks.length} Wikidata + ${jocondeArtworks.length} Joconde (${artworks.length - wikidataArtworks.length} new) = ${artworks.length} total`);
    res.json({ theme, artworks });
  } catch (err) {
    console.error('Error fetching artworks:', err);
    res.status(500).json({ error: 'Failed to fetch artworks from Wikidata' });
  }
});

// GET /api/artworks/:id?theme=cupid-psyche
router.get('/:id', async (req, res) => {
  const themeSlug = req.query.theme || 'cupid-psyche';
  const theme = THEMES[themeSlug];
  if (!theme) {
    return res.status(404).json({ error: `Unknown theme: ${themeSlug}` });
  }
  try {
    const [wikidataArtworks, jocondeArtworks] = await Promise.all([
      fetchArtworksForTheme(themeSlug),
      Promise.resolve(loadJocondeArtworks(themeSlug)),
    ]);
    const artworks = mergeArtworks(wikidataArtworks, jocondeArtworks);
    const artwork = artworks.find(a => a.id === req.params.id);
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    // For Joconde/manual artworks that have no image, try Wikimedia Commons
    if (!artwork.imageUrl) {
      artwork.imageUrl = await lookupCommonsImage(artwork.title);
    }
    const story = await fetchStory(theme.wikiPage, theme.wikiPageFr);
    res.json({ artwork, story });
  } catch (err) {
    console.error('Error fetching artwork detail:', err);
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
});

export default router;
