/**
 * joconde.js — Reads the locally-generated Joconde supplement and normalises
 * each record to the same schema used by wikidata.js, so artworks.js can
 * merge the two sources with a single deduplication pass.
 *
 * The supplement JSON is produced once by running:
 *   scripts/build-joconde-supplement.py
 * It lives at backend/static/joconde-supplement.json and is structured as:
 *   { "cupid-psyche": [ ...artworkObjects ], ... }
 *
 * Joconde data is published by the French Ministry of Culture under the
 * Licence Etalab 2.0 (open data, free reuse with attribution).
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPPLEMENT_FILE = join(__dirname, '../../static/joconde-supplement.json');

// ─── Paris museum GPS + address, keyed by Muséofile code ──────────────────────
// Codes verified from the Joconde CSV (Code_Museofile field).
const MUSEUM_INFO = {
  M5031: {
    name: 'Musée du Louvre',
    address: 'Rue de Rivoli, 75001 Paris',
    lat: 48.8606, lng: 2.3376,
  },
  M5044: {
    name: 'Musée Rodin',
    address: '77 rue de Varenne, 75007 Paris',
    lat: 48.8555, lng: 2.3161,
  },
  M1111: {
    name: 'Petit Palais',
    address: 'Avenue Winston-Churchill, 75008 Paris',
    lat: 48.8659, lng: 2.3128,
  },
  M1104: {
    name: 'Musée Carnavalet',
    address: '23 rue de Sévigné, 75003 Paris',
    lat: 48.8570, lng: 2.3619,
  },
  M5060: {
    name: "Musée d'Orsay",
    address: "1 rue de la Légion d'Honneur, 75007 Paris",
    lat: 48.8600, lng: 2.3266,
  },
  M5021: {
    name: 'Musée des Arts Décoratifs',
    address: '107 rue de Rivoli, 75001 Paris',
    lat: 48.8638, lng: 2.3348,
  },
  M5041: {
    name: 'Musée Gustave Moreau',
    address: '14 rue de la Rochefoucauld, 75009 Paris',
    lat: 48.8820, lng: 2.3334,
  },
  M5043: {
    name: 'Musée national Picasso-Paris',
    address: '5 rue de Thorigny, 75003 Paris',
    lat: 48.8600, lng: 2.3607,
  },
  M5003: {
    name: 'Musée de Cluny',
    address: '28 rue du Sommerard, 75005 Paris',
    lat: 48.8518, lng: 2.3437,
  },
  M5051: {
    name: "Musée de l'École nationale supérieure des beaux-arts",
    address: '13 quai Malaquais, 75006 Paris',
    lat: 48.8524, lng: 2.3376,
  },
  M1103: {
    name: 'Musée Bourdelle',
    address: '18 rue Antoine Bourdelle, 75015 Paris',
    lat: 48.8413, lng: 2.3162,
  },
  M1101: {
    name: "Musée d'Art Moderne de Paris",
    address: '11 avenue du Président Wilson, 75116 Paris',
    lat: 48.8630, lng: 2.2961,
  },
  M1108: {
    name: 'Palais Galliera',
    address: '10 avenue Pierre-Ier-de-Serbie, 75116 Paris',
    lat: 48.8627, lng: 2.2961,
  },
  M5007: {
    name: 'Musée Hébert',
    address: '85 rue du Cherche-Midi, 75006 Paris',
    lat: 48.8480, lng: 2.3286,
  },
  M0363: {
    name: 'Musée de la Chasse et de la Nature',
    address: '62 rue des Archives, 75003 Paris',
    lat: 48.8573, lng: 2.3569,
  },
};

// ─── Artwork types to include in the app ──────────────────────────────────────
// We skip series sub-parts (élément d'ensemble), bound albums, and
// reproductive prints — these are archival items not suited for a visitor guide.
const SKIP_DENOMINATIONS = new Set([
  'album',
  'groupe relié',
  'estampe d\'interprétation',
]);

function shouldInclude(item) {
  const denom = item.description?.toLowerCase() ?? '';
  // Skip if it's purely an album or series sub-part
  for (const skip of SKIP_DENOMINATIONS) {
    if (denom === skip) return false;
  }
  return true;
}

// ─── Name normalisation ────────────────────────────────────────────────────────
// Joconde stores artist names in UPPERCASE: "RODIN Auguste" → "Auguste Rodin"
function normaliseName(raw) {
  if (!raw || raw.startsWith('http')) return 'Artiste inconnu';
  return raw
    .split(';')[0]           // take first name if multiple (e.g. "RODIN Auguste;ASSISTANTS")
    .trim()
    .replace(/^([A-ZÉÀÈÙÂÊÎÔÛÄËÏÖÜ\s-]+)\s+(\S.*)$/, (_, last, first) =>
      // "RODIN Auguste" → "Auguste RODIN" → then title-case
      `${first} ${last}`
    )
    .replace(/\b([A-ZÉÀÈÙÂÊÎÔÛÄËÏÖÜ]{2,})\b/g, s =>
      s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    )
    .trim() || 'Artiste inconnu';
}

/**
 * Reject database entry dates ("2005-08-10" format) — Joconde stores the
 * record modification date in date_creation when millesime is empty.
 * Only return values that look like artwork dating (year, range, "vers …").
 */
function cleanDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  // Full ISO date → database timestamp, not artwork date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s || null;
}

// ─── Wikimedia Commons image lookup ──────────────────────────────────────────
// In-process cache: title → imageUrl (or null if not found).
const _commonsCache = new Map();

/**
 * Search Wikimedia Commons for a free image matching the given artwork title.
 * Returns a 400-px thumbnail URL, or null if nothing found.
 * Results are cached in-process for the lifetime of the server.
 */
export async function lookupCommonsImage(title) {
  const key = title.toLowerCase().trim();
  if (_commonsCache.has(key)) return _commonsCache.get(key);

  try {
    // Step 1: search Commons File namespace by title
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(title)}&srnamespace=6&srlimit=1&format=json`;
    const searchResp = await fetch(searchUrl, {
      headers: { 'User-Agent': 'MythologyParisApp/1.0' },
    });
    const searchData = await searchResp.json();
    const hits = searchData?.query?.search ?? [];
    if (!hits.length) { _commonsCache.set(key, null); return null; }

    // Step 2: get thumbnail URL for the first result
    const fileName = encodeURIComponent(hits[0].title);
    const infoUrl =
      `https://commons.wikimedia.org/w/api.php?action=query` +
      `&titles=${fileName}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json`;
    const infoResp = await fetch(infoUrl, {
      headers: { 'User-Agent': 'MythologyParisApp/1.0' },
    });
    const infoData = await infoResp.json();
    const pages = Object.values(infoData?.query?.pages ?? {});
    const thumbUrl = pages[0]?.imageinfo?.[0]?.thumburl ?? null;

    _commonsCache.set(key, thumbUrl);
    return thumbUrl;
  } catch {
    _commonsCache.set(key, null);
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function loadJocondeArtworks(themeSlug) {
  if (!existsSync(SUPPLEMENT_FILE)) return [];

  let supplement;
  try {
    supplement = JSON.parse(readFileSync(SUPPLEMENT_FILE, 'utf-8'));
  } catch {
    return [];
  }

  const items = supplement[themeSlug];
  if (!Array.isArray(items)) return [];

  return items
    .filter(shouldInclude)
    .map(item => {
      const code = item.museum?.code ?? '';
      const info = MUSEUM_INFO[code] ?? null;

      return {
        id: item.id,
        wikidataUrl: null,
        source: item.source ?? 'joconde',  // preserve 'manual' for hand-curated entries
        title: item.title,
        // Build a human-readable description from denomination + materials
        description: [item.description, item.materials]
          .filter(Boolean)
          .join(' — ')
          .slice(0, 120) || null,
        artist: normaliseName(item.artist),
        date: cleanDate(item.date),
        imageUrl: item.imageUrl ?? null,  // populated by enrichment script if available
        popUrl: item.popUrl,  // Link to POP notice for provenance
        museum: {
          wikidataUrl: null,
          name: info?.name ?? item.museum?.name ?? 'Musée inconnu',
          address: info?.address ?? null,
          lat: info?.lat ?? null,
          lng: info?.lng ?? null,
        },
      };
    });
}
