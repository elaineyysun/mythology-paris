import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../cache');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ─── Theme registry ──────────────────────────────────────────────────────────
// This is the single extension point for scalability.
// Adding a new myth = adding one entry here with its Wikidata entity IDs.
export const THEMES = {
  'cupid-psyche': {
    slug: 'cupid-psyche',
    label: 'Cupid and Psyche',
    labelFr: 'Cupidon et Psyché',
    // All name variants resolve to these three Wikidata entities:
    //   Q843382 = Psyche / Psyché / Psique / Pszükhé / Ψυχή (the mortal)
    //   Q5011   = Cupid  / Cupidon / Cupido / Amor / l'Amour / クピードー (Roman god)
    //   Q121973 = Eros   / Éros   / Ἔρως  / Эрот (Greek god, same deity as Cupid)
    // Q5011 covers all French names: Cupidon, l'Amour, Amor — they are aliases.
    wikidataIds: ['Q843382', 'Q5011', 'Q121973'],
    // requiredId: artwork MUST depict Psyche to belong to this theme.
    // This filters out works where Cupid/Eros is a minor character in an
    // unrelated myth (e.g. Endymion, Judgement of Paris, etc.).
    requiredId: 'Q843382',
    group: 'Roman Mythology',
    wikiPage: 'Cupid_and_Psyche',
    wikiPageFr: 'Cupidon_et_Psych%C3%A9',
  },
  // Future entries — just uncomment and add wikidataIds:
  // 'hercules': {
  //   slug: 'hercules', label: 'Hercules', labelFr: 'Hercule',
  //   wikidataIds: ['Q134316'], group: 'Greco-Roman Mythology',
  //   wikiPage: 'Hercules', deity: 'Jupiter',
  // },
  // 'venus': {
  //   slug: 'venus', label: 'Venus', labelFr: 'Vénus',
  //   wikidataIds: ['Q47652'], group: 'Roman Mythology',
  //   wikiPage: 'Venus_(mythology)', deity: 'Venus',
  // },
};

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// Explicit list of Paris museum / collection Wikidata IDs.
// Using VALUES is far faster than the recursive ?museum wdt:P131* wd:Q90 path
// which times out on Wikidata's public endpoint.
const PARIS_MUSEUM_IDS = [
  // ── Musée du Louvre ─────────────────────────────────────────────────────────
  'Q19675',    // Musée du Louvre (main museum — use when P276 points to the whole museum)
  'Q3044768',  // Département des peintures du musée du Louvre
  'Q3044772',  // Département des sculptures du musée du Louvre ← Canova, etc.
  'Q3044747',  // Département des antiquités grecques, étrusques et romaines
  'Q3044749',  // Département des antiquités égyptiennes
  'Q3044751',  // Département des antiquités orientales
  'Q3044753',  // Département des arts graphiques
  'Q3044767',  // Département des objets d'art
  // ── Other Paris museums ──────────────────────────────────────────────────────
  'Q23402',    // Musée d'Orsay
  'Q1054923',  // Petit Palais
  'Q1596893',  // Musée Rodin
  'Q2343086',  // Musée des Arts Décoratifs, Paris
  'Q2985549',  // Musée Marmottan Monet
  'Q3136390',  // Musée Jacquemart-André
  'Q2244990',  // Musée de Cluny (Musée national du Moyen Âge)
  'Q18026939', // Musée d'Art Moderne de Paris
  'Q1542955',  // Musée de l'Armée
  'Q3146362',  // Palais des Beaux-Arts de Paris (École des Beaux-Arts)
];

function buildSparqlQuery(wikidataIds, requiredId) {
  // Build UNION clauses for each Wikidata entity ID (depicts = P180)
  // This single query covers ALL language variants:
  //   Q843382 catches artworks tagged with any spelling of Psyche/Psyché/Ψυχή/Psique…
  //   Q5011   catches Cupid/Cupidon/Cupido/Amor/l'Amour/クピードー…
  //   Q121973 catches Eros/Éros/Ἔρως/Эрот…
  const depictsUnion = wikidataIds
    .map(id => `  { ?artwork wdt:P180 wd:${id} . }`)
    .join('\n  UNION\n');

  // If the theme defines a requiredId, the artwork MUST depict that entity.
  // For Cupidon et Psyché: Psyche (Q843382) must be depicted, which filters
  // out artworks that only show Cupid/Eros in an unrelated myth (Endymion,
  // Judgement of Paris, etc.).
  const requiredClause = requiredId
    ? `  ?artwork wdt:P180 wd:${requiredId} .  # ${requiredId} must be depicted`
    : '';

  const museumValues = PARIS_MUSEUM_IDS.map(id => `wd:${id}`).join(' ');

  return `
SELECT DISTINCT ?artwork ?artworkLabel ?artworkDescription ?artistLabel ?date ?museum ?museumLabel ?museumAddress ?image ?lat ?lng WHERE {
${requiredClause ? requiredClause + '\n' : ''}  ${depictsUnion}
  # The artwork must be held in (P276 = location) or part of (P195 = collection) a Paris museum
  { ?artwork wdt:P276 ?museum . } UNION { ?artwork wdt:P195 ?museum . }
  # Restrict to known Paris museums — using VALUES avoids the slow wdt:P131* recursive path
  VALUES ?museum { ${museumValues} }
  OPTIONAL { ?artwork wdt:P170 ?artist . }
  OPTIONAL { ?artwork wdt:P571 ?date . }
  OPTIONAL { ?museum wdt:P6375 ?museumAddress . }
  OPTIONAL { ?artwork wdt:P18 ?image . }
  OPTIONAL {
    ?museum p:P625/psv:P625 [
      wikibase:geoLatitude ?lat ;
      wikibase:geoLongitude ?lng
    ] .
  }
  # Labels returned preferring French first (Paris context), then English
  # The label service also auto-populates ?artworkDescription (Wikidata one-liner)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
LIMIT 300
`.trim();
}

function parseResults(bindings) {
  const seen = new Map();
  for (const b of bindings) {
    const wikidataUrl = b.artwork?.value ?? '';
    const id = wikidataUrl.split('/').pop(); // e.g. Q1309387
    if (!id || seen.has(id)) continue;

    seen.set(id, {
      id,
      wikidataUrl,
      title: b.artworkLabel?.value ?? 'Untitled',
      // artworkDescription is the Wikidata entity description — a short artwork-specific
      // one-liner like "painting by Boucher, 1744" or "marble sculpture by Canova"
      description: b.artworkDescription?.value ?? null,
      artist: (() => {
        const a = b.artistLabel?.value ?? 'Unknown artist';
        // Wikidata blank nodes come back as IRIs (e.g. .well-known/genid/...)
        // Fallback Q-IDs come back as bare Q-IDs (e.g. "Q1362889")
        if (a.startsWith('http') || /^Q\d+$/.test(a)) return 'Unknown artist';
        return a;
      })(),
      // Date comes as ISO 8601 — keep only the year
      date: b.date?.value ? b.date.value.substring(0, 4).replace(/^-/, '') : null,
      // Append ?width=400 for a Wikimedia Commons thumbnail
      imageUrl: b.image?.value ? `${b.image.value}?width=400` : null,
      museum: {
        wikidataUrl: b.museum?.value ?? '',
        name: b.museumLabel?.value ?? 'Unknown museum',
        address: b.museumAddress?.value ?? null,
        lat: b.lat?.value != null ? parseFloat(b.lat.value) : null,
        lng: b.lng?.value != null ? parseFloat(b.lng.value) : null,
      },
    });
  }
  return Array.from(seen.values());
}

export async function fetchArtworksForTheme(themeSlug) {
  const theme = THEMES[themeSlug];
  if (!theme) throw new Error(`Unknown theme: ${themeSlug}`);

  // Ensure cache directory exists
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = join(CACHE_DIR, `${themeSlug}.json`);

  // Return cached data if still fresh
  if (existsSync(cacheFile)) {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'));
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[cache] Serving "${themeSlug}" (${cached.artworks.length} artworks)`);
      return cached.artworks;
    }
  }

  console.log(`[wikidata] Querying for theme: ${themeSlug} …`);
  const query = buildSparqlQuery(theme.wikidataIds, theme.requiredId);
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'MythologyParisApp/1.0 (open-source educational project)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata SPARQL error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const artworks = parseResults(data.results.bindings);

  writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), artworks }, null, 2));
  console.log(`[wikidata] Found ${artworks.length} artworks → cached to ${cacheFile}`);
  return artworks;
}
