import { useState, useEffect, useMemo } from 'react';
import ArtworkCard from '../components/ArtworkCard.jsx';

/**
 * Derive a human-readable artwork type from description + materials fields.
 * Handles both Joconde format ("tableau — peinture à l'huile;toile") and
 * Wikidata format ("peinture de François Gérard", "sculpture d'Antonio Canova").
 */
function getArtworkType(artwork) {
  const str = ((artwork.description || '') + ' ' + (artwork.materials || ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/\btableau\b|\bpeinture\b|\bpainting\b|\bhuile\b/.test(str))          return 'Peinture';
  if (/\bsculpture\b|\bstatue\b|\bstatuette\b|\bgroupe\b|\bmaquette\b|\bmarbre\b|\bbronze\b/.test(str)) return 'Sculpture';
  if (/\bdessin\b|\bdrawing\b|\bsanguine\b|\bcrayon\b|\bgraphite\b|\baquarelle\b|\bplume\b|\blavis\b/.test(str)) return 'Dessin';
  if (/\bestampe\b|\bgravure\b|\blithographie\b/.test(str))                   return 'Estampe';
  if (/\bphotographie\b|\bphotograph\b|\btirage\b/.test(str))                 return 'Photographie';
  if (/\btapisserie\b/.test(str))                                               return 'Tapisserie';
  if (/\bminiature\b/.test(str))                                                return 'Miniature';
  return 'Autre';
}

const SORT_OPTIONS = [
  { value: 'date-asc',   label: 'Date ↑ (oldest first)' },
  { value: 'date-desc',  label: 'Date ↓ (newest first)' },
  { value: 'title-asc',  label: 'Titre A → Z' },
  { value: 'museum-asc', label: 'Musée A → Z' },
];

function parseYear(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

function sortArtworks(list, sort) {
  return [...list].sort((a, b) => {
    if (sort === 'date-asc' || sort === 'date-desc') {
      const ya = parseYear(a.date) ?? (sort === 'date-asc' ? Infinity : -Infinity);
      const yb = parseYear(b.date) ?? (sort === 'date-asc' ? Infinity : -Infinity);
      return sort === 'date-asc' ? ya - yb : yb - ya;
    }
    if (sort === 'title-asc') return a.title.localeCompare(b.title, 'fr');
    if (sort === 'museum-asc') return a.museum.name.localeCompare(b.museum.name, 'fr');
    return 0;
  });
}

export default function HomePage() {
  const [artworks, setArtworks] = useState([]);
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [query, setQuery]       = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [sort, setSort]         = useState('date-asc');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/artworks?theme=cupid-psyche`)
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        setTheme(data.theme);
        setArtworks(data.artworks);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Compute available artwork types sorted by count (recalculated when artworks load)
  const artworkTypes = useMemo(() => {
    const counts = {};
    artworks.forEach(a => {
      const t = getArtworkType(a);
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [artworks]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const from = dateFrom ? parseInt(dateFrom, 10) : null;
    const to   = dateTo   ? parseInt(dateTo,   10) : null;

    let list = artworks.filter(a => {
      // Text search: title + artist + museum (partial, case-insensitive)
      if (q) {
        const hay = `${a.title} ${a.artist} ${a.museum.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Date range
      if (from !== null || to !== null) {
        const y = parseYear(a.date);
        if (y === null) return false;          // exclude undated when filtering
        if (from !== null && y < from) return false;
        if (to   !== null && y > to)   return false;
      }
      // Artwork type
      if (typeFilter && getArtworkType(a) !== typeFilter) return false;
      return true;
    });

    return sortArtworks(list, sort);
  }, [artworks, query, dateFrom, dateTo, sort, typeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 gap-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500">Fetching artworks from Wikidata…</p>
        <p className="text-stone-400 text-xs">(First load queries Paris museums live — may take a few seconds)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="bg-white rounded-xl p-8 shadow text-center max-w-md">
          <p className="text-red-500 font-semibold mb-2">Could not load artworks</p>
          <p className="text-stone-500 text-sm">{error}</p>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-stone-900 text-white py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">
            Paris Museums · Roman Mythology
          </p>
          <h1 className="text-5xl font-serif font-bold mb-4">
            {theme?.labelFr ?? 'Cupidon et Psyché'}
          </h1>
          <p className="text-stone-300 text-lg max-w-2xl leading-relaxed">
            Artworks depicting the myth of Cupid and Psyche held in Paris museums and galleries.
            Click any work to see where it is kept and read the story it depicts.
          </p>
        </div>
      </header>

      {/* Artwork grid */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-8 flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-stone-500 font-medium mb-1 uppercase tracking-wide">
              Rechercher
            </label>
            <input
              type="text"
              placeholder="Titre, artiste, musée…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Date from */}
          <div className="w-28">
            <label className="block text-xs text-stone-500 font-medium mb-1 uppercase tracking-wide">
              Après
            </label>
            <input
              type="number"
              placeholder="1400"
              min="1000" max="2100"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Date to */}
          <div className="w-28">
            <label className="block text-xs text-stone-500 font-medium mb-1 uppercase tracking-wide">
              Avant
            </label>
            <input
              type="number"
              placeholder="2000"
              min="1000" max="2100"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Artwork type */}
          <div className="w-44">
            <label className="block text-xs text-stone-500 font-medium mb-1 uppercase tracking-wide">
              Type d'œuvre
            </label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              <option value="">Tous les types</option>
              {artworkTypes.map(({ type, count }) => (
                <option key={type} value={type}>{type} ({count})</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="w-52">
            <label className="block text-xs text-stone-500 font-medium mb-1 uppercase tracking-wide">
              Trier par
            </label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {(query || dateFrom || dateTo || typeFilter) && (
            <button
              onClick={() => { setQuery(''); setDateFrom(''); setDateTo(''); setTypeFilter(''); }}
              className="text-xs text-amber-600 hover:text-amber-800 underline pb-2"
            >
              Effacer les filtres
            </button>
          )}
        </div>

        <p className="text-stone-400 text-sm mb-6">
          {filtered.length} œuvre{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== artworks.length && (
            <span className="text-stone-300"> (sur {artworks.length})</span>
          )}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <p className="text-lg mb-2">Aucun résultat.</p>
            <p className="text-sm">Essayez d'élargir la recherche ou d'effacer les filtres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(artwork => (
              <ArtworkCard key={artwork.id} artwork={artwork} themeSlug="cupid-psyche" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
