import { Router } from 'express';
import { fetchArtworksForTheme, THEMES } from '../services/wikidata.js';
import { loadJocondeArtworks, lookupCommonsImage } from '../services/joconde.js';
import { fetchStory } from '../services/wikipedia.js';

/**
 * Deduplicate key: title + artist (first 20 chars) + museum code/name.
 * Catches same artwork catalogued multiple times (common in Joconde).
 * Normalize hyphens/spaces so "Jean-Joseph" and "Jean Joseph" match.
 */
function dedupKey(a) {
  const title  = a.title.toLowerCase().trim();
  const artist = a.artist.toLowerCase().replace(/[-\s]+/g, ' ').trim().slice(0, 20);
  const museum = (a.museum.wikidataUrl || a.museum.name || '').toLowerCase().trim().slice(0, 30);
  return `${title}|${artist}|${museum}`;
}

/** Merge Wikidata + Joconde results, deduplicating by title + artist + museum. */
function mergeArtworks(wikidataItems, jocondeItems) {
  const seen = new Set(wikidataItems.map(dedupKey));
  const novel = jocondeItems.filter(a => {
    const k = dedupKey(a);
    if (seen.has(k)) return false;
    seen.add(k);
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
