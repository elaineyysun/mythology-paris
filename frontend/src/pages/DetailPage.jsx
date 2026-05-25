import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import MuseumMap from '../components/MuseumMap.jsx';

export default function DetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const themeSlug = searchParams.get('theme') ?? 'cupid-psyche';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/artworks/${id}?theme=${themeSlug}`)
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, themeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="bg-white rounded-xl p-8 shadow text-center">
          <p className="text-red-500 font-semibold">{error ?? 'Artwork not found'}</p>
          <Link to="/" className="text-amber-600 hover:underline text-sm mt-4 inline-block">
            ← Back to list
          </Link>
        </div>
      </div>
    );
  }

  const { artwork, story } = data;
  const museum = artwork.museum;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <div className="bg-stone-900 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link to="/" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
            ← Cupidon et Psyché
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* ── Left: artwork image + metadata ── */}
          <div>
            {artwork.imageUrl ? (
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full rounded-xl shadow-lg object-contain max-h-[560px] bg-stone-100"
              />
            ) : (
              <div className="w-full h-80 bg-stone-200 rounded-xl flex items-center justify-center">
                <span className="text-stone-400 text-sm">No image available</span>
              </div>
            )}

            <div className="mt-6">
              <h1 className="text-3xl font-serif font-bold text-stone-900 leading-tight">
                {artwork.title}
              </h1>
              <p className="text-stone-500 mt-2">
                {artwork.artist}
                {artwork.date ? <span className="text-stone-400"> · {artwork.date}</span> : null}
              </p>
              {artwork.description && (
                <p className="text-stone-600 text-sm mt-3 leading-relaxed italic border-l-2 border-amber-300 pl-3">
                  {artwork.description}
                </p>
              )}
              {artwork.wikidataUrl && (
                <a
                  href={artwork.wikidataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline text-sm mt-3 inline-block"
                >
                  View record on Wikidata →
                </a>
              )}
            </div>
          </div>

          {/* ── Right: museum + story ── */}
          <div className="space-y-6">

            {/* Museum location card */}
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-stone-700 uppercase tracking-wide mb-4">
                📍 Where to see it
              </h2>
              <p className="text-stone-900 font-semibold text-lg">{museum.name}</p>
              {museum.address ? (
                <p className="text-stone-500 text-sm mt-1">{museum.address}</p>
              ) : (
                <p className="text-stone-400 text-sm mt-1 italic">Address not available in Wikidata</p>
              )}

              {museum.lat != null && museum.lng != null ? (
                <div className="mt-5 rounded-xl overflow-hidden" style={{ height: 220 }}>
                  <MuseumMap lat={museum.lat} lng={museum.lng} name={museum.name} />
                </div>
              ) : (
                <p className="text-stone-400 text-xs mt-4 italic">Map coordinates not available</p>
              )}
            </section>

            {/* Story card — same myth background for all artworks in this theme */}
            {story ? (
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-semibold text-stone-700 uppercase tracking-wide mb-1">
                  📖 Le Mythe
                </h2>
                <p className="text-stone-400 text-xs mb-3 italic">Cupidon et Psyché — contexte mythologique</p>
                <p className="text-stone-600 text-sm leading-relaxed">{story.extract}</p>
                {story.wikiUrl && (
                  <a
                    href={story.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:underline text-sm mt-4 inline-block"
                  >
                    Lire le mythe complet sur Wikipedia →
                  </a>
                )}
              </section>
            ) : (
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-semibold text-stone-700 uppercase tracking-wide mb-2">
                  📖 Le Mythe
                </h2>
                <p className="text-stone-400 text-sm italic">Le récit mythologique n'a pas pu être chargé.</p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
