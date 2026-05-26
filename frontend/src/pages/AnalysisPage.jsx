import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Order & colour maps ──────────────────────────────────────────────────────
const TYPE_ORDER = ['Peinture','Sculpture','Dessin','Estampe','Tapisserie','Photographie','Miniature','Autre'];

const TYPE_COLORS = {
  Peinture:     '#b45309',
  Sculpture:    '#6b7280',
  Dessin:       '#92400e',
  Estampe:      '#1d4ed8',
  Tapisserie:   '#7c3aed',
  Photographie: '#374151',
  Miniature:    '#059669',
  Autre:        '#a8a29e',
};

const SCENE_ORDER = ['arrival','marriage','sisters','discovery','abandonment','tasks','underworld','reunion','apotheosis','general'];

const SCENE_COLORS = {
  arrival:     '#60a5fa',
  marriage:    '#c084fc',
  sisters:     '#fb923c',
  discovery:   '#f87171',
  abandonment: '#94a3b8',
  tasks:       '#fbbf24',
  underworld:  '#475569',
  reunion:     '#34d399',
  apotheosis:  '#fcd34d',
  general:     '#d1d5db',
};

// ─── Bilingual content ────────────────────────────────────────────────────────
const STRINGS = {
  fr: {
    back:        '← Retour à la galerie',
    toggleLang:  'English',
    pageLabel:   'Paris Museums · Analyse',
    pageTitle:   "Cupidon et Psyché — l'art à travers les siècles",
    pageSubtitle: "Comment la représentation du mythe a évolué sur cinq siècles, et pourquoi.",

    chart1Title: 'Formats des œuvres par siècle',
    chart1Desc:  "Chaque barre montre la répartition des formats (peinture, sculpture, dessin…) par siècle dans les collections parisiennes. Cliquez sur un segment coloré pour voir les œuvres correspondantes.",
    chart1Hint:  "Cliquez sur un segment pour explorer les œuvres.",

    chart2Title: 'Œuvres par scène narrative',
    chart2Desc:  "Chaque barre correspond à une scène du récit d'Apulée — de l'arrivée de Psyché au palais jusqu'à l'apothéose. Cliquez sur une barre pour explorer les œuvres.",
    chart2Hint:  "Cliquez sur une barre pour explorer les œuvres.",

    scenes: {
      arrival:     "Arrivée au palais",
      marriage:    "Le mariage secret",
      sisters:     "La trahison des sœurs",
      discovery:   "Le regard interdit",
      abandonment: "Psyché abandonnée",
      tasks:       "Les quatre épreuves",
      underworld:  "Descente aux enfers",
      reunion:     "Le sauvetage",
      apotheosis:  "Apothéose",
      general:     "Général / Non spécifié",
    },
    sceneDesc: {
      arrival:     "Zéphyr emporte Psyché jusqu'au palais invisible d'Éros.",
      marriage:    "L'Amour rend visite à Psyché chaque nuit dans l'obscurité totale.",
      sisters:     "Ses sœurs jalouses persuadent Psyché de regarder son époux endormi.",
      discovery:   "Psyché allume sa lampe : elle découvre Éros, qui s'enfuit.",
      abandonment: "Psyché erre, désespérée, après la fuite de l'Amour.",
      tasks:       "Vénus impose quatre épreuves : trier le grain, la toison d'or, l'eau du Styx, la beauté de Proserpine.",
      underworld:  "Psyché descend aux Enfers chercher le coffret de beauté de Proserpine.",
      reunion:     "Éros sauve Psyché et la réveille d'un baiser.",
      apotheosis:  "Jupiter accorde l'immortalité à Psyché ; les dieux célèbrent leurs noces.",
      general:     "Le couple représenté sans scène narrative précise.",
    },

    panelClose:    "Fermer ✕",
    panelWorks:    (n) => `${n} œuvre${n !== 1 ? 's' : ''}`,
    panelTitle:    (label, cent) => cent ? `${label} · ${cent}` : label,
    noDate:        'sans date',
    centuryLabel:  (c) => `${c}e s.`,
    noImage:       'Sans image',

    essayTitle: "Analyse — pourquoi le format change avec le siècle",
    essay: [
      {
        heading: "Le mythe et sa transmission",
        text: "L'histoire de Cupidon et Psyché n'est pas un mythe grec antique mais un roman latin : elle apparaît pour la première fois dans les *Métamorphoses* d'Apulée (v. 160 ap. J.-C.). Cette origine littéraire et allégorique conditionne tout son traitement artistique. L'âme (psyche, ψυχή) qui atteint l'immortalité par l'amour est une construction philosophique autant qu'une histoire — et les artistes n'ont cessé de choisir leur format selon la lecture qu'ils voulaient en donner.",
      },
      {
        heading: "Renaissance — L'allégorie festive (XVe–XVIe s.)",
        text: "Les humanistes redécouvrent Apulée dans les années 1460. Les fresques de Raphaël à la Villa Farnesina (Rome, 1517–18) fixent le modèle visuel dominant : un festin triomphal des dieux. Les formats privilégiés sont la grande peinture à l'huile et la tapisserie — deux objets de prestige conçus pour les salles d'apparat, où le message (l'amour perfectionne l'âme) flattait les mécènes aristocratiques. La tapisserie permettait en outre des cycles narratifs entiers tissés pour un même espace.",
      },
      {
        heading: "Baroque et Rococo — Du triomphe à la tendresse (XVIIe–XVIIIe s.)",
        text: "La Contre-Réforme complique la mythologie érotique dans les espaces publics, mais les collections privées poursuivent les commandes. La sculpture gagne en importance : le marbre sculpté restitue mieux que la toile l'idéal intemporel du mythe. La *Psyché ranimée par le baiser de l'Amour* de Canova (1793, Louvre) en est le sommet : le corps de marbre suspendu dans l'instant du réveil rend la résurrection de l'âme physiquement présente, d'une manière qu'aucune peinture ne peut atteindre.",
      },
      {
        heading: "Néoclassicisme — Le sommet philosophique (1780–1830)",
        text: "Cette période domine les collections parisiennes. Les Lumières projettent leurs propres catégories sur Apulée : Psyché = Raison ou Âme, Éros = Passion ou Désir, leur union = l'harmonie des contraires. Les peintres académiques (Gérard, Picot, Prud'hon) produisent de grands tableaux pour le Salon. L'abondance des dessins reflète une autre réalité : le mythe est au cœur de la formation académique. Dessiner Psyché, c'est maîtriser la figure féminine idéalisée.",
      },
      {
        heading: "Romantisme — Le tournant intérieur (1820–1880)",
        text: "Le Romantisme rejette le monumental au profit de l'intime. Le noyau émotionnel du mythe — le manque, la trahison, la solitude, les retrouvailles — résonne parfaitement avec la sensibilité nouvelle. Les formats se déplacent : dessins, aquarelles, estampes permettent de travailler dans le privé, rapidement, émotionnellement. Les cinquante feuillets préparatoires du Musée Rodin sur des sujets Psyché sont emblématiques : Rodin traite le mythe comme un réservoir d'états intérieurs à explorer au crayon, non à proclamer en marbre.",
      },
      {
        heading: "La dimension psychologique",
        text: "Ce n'est pas un hasard si le format migre du marbre public au papier privé au moment précis où la psychologie naît comme discipline (Fechner, 1860 ; Freud, 1900 ; Jung, 1912). James Hillman (*The Myth of Analysis*, 1972) lit les quatre épreuves de Psyché comme des étapes de développement psychologique : trier le grain = discrimination, toison d'or = apprivoiser ses pulsions, eau du Styx = affronter la mortalité, descente aux enfers = intégrer l'ombre. L'artiste moderne qui dessine ou photographie Psyché exprime un travail intérieur, non un triomphe.",
      },
      {
        heading: "Format et lecture — une cohérence profonde",
        text: "Le schéma est constant : quand Psyché est lue comme allégorie divine (Renaissance), le format est grand et public. Quand elle est lue comme idéal philosophique (Néoclassicisme), c'est le marbre monumental et la toile académique. Quand elle devient exploration psychologique (Romantisme et au-delà), c'est le papier intime et l'estampe. Le format n'est pas un ornement — c'est l'argument. Choisir de sculpter ou de dessiner, d'exposer au Salon ou de garder dans un portefeuille, encode une interprétation complète du mythe.",
      },
    ],

    refsTitle: "Références savantes",
    refs: [
      { author: "Warburg, Aby", work: "Atlas Mnémosyne (1924–1929)", note: "Méthode pour suivre les formules émotionnelles (Pathosformeln) à travers médias et siècles — le précédent méthodologique direct." },
      { author: "Seznec, Jean", work: "La Survivance des dieux antiques (Flammarion, 1993 [1940])", note: "Comment Vénus, Mercure, Mars furent différemment représentés du Moyen Âge à la Renaissance selon les lectures philosophiques dominantes." },
      { author: "Haskell, Francis & Penny, Nicholas", work: "Pour l'amour de l'antique (Hachette, 1988)", note: "Réception des grandes sculptures antiques (Hercule Farnèse, Vénus de Milo…) sur cinq siècles : modèle d'analyse de la variation de format et de médium." },
      { author: "Bull, Malcolm", work: "The Mirror of the Gods (Oxford UP, 2005)", note: "Analyse systématique de la façon dont chaque figure mythologique — Apollon, Diane, Bacchus — évolue en médium et en sens de l'Antiquité à 1600." },
      { author: "Baxandall, Michael", work: "L'Œil du Quattrocento (Gallimard, 1985)", note: "Montre comment l'économie du mécénat et les habitudes cognitives d'une époque déterminent directement les choix de format et de composition." },
      { author: "Hillman, James", work: "The Myth of Analysis (Northwestern UP, 1972)", note: "Lecture des quatre épreuves de Psyché comme modèle du développement psychologique — ancre savante pour la section sur le tournant psychologique." },
    ],
  },

  en: {
    back:        '← Back to gallery',
    toggleLang:  'Français',
    pageLabel:   'Paris Museums · Analysis',
    pageTitle:   "Cupid & Psyche — Art Across the Centuries",
    pageSubtitle: "How the myth's representation changed over five centuries — and why.",

    chart1Title: 'Artwork Formats by Century',
    chart1Desc:  "Each bar shows how artistic formats (painting, sculpture, drawing…) are distributed per century in the Paris collections. Click a coloured segment to explore those works.",
    chart1Hint:  "Click a segment to explore the artworks.",

    chart2Title: 'Works by Narrative Scene',
    chart2Desc:  "Each bar corresponds to a scene from Apuleius' story — from Psyche's arrival at the palace to her apotheosis. Click a bar to explore.",
    chart2Hint:  "Click a bar to explore the artworks.",

    scenes: {
      arrival:     "Arrival at the Palace",
      marriage:    "The Secret Marriage",
      sisters:     "The Sisters' Betrayal",
      discovery:   "The Forbidden Look",
      abandonment: "Psyche Abandoned",
      tasks:       "The Four Tasks",
      underworld:  "Descent to the Underworld",
      reunion:     "The Rescue",
      apotheosis:  "Apotheosis",
      general:     "General / Unspecified",
    },
    sceneDesc: {
      arrival:     "Zephyr carries Psyche to Eros's invisible palace.",
      marriage:    "Eros visits Psyche each night in complete darkness.",
      sisters:     "Her jealous sisters persuade Psyche to look at her sleeping husband.",
      discovery:   "Psyche lights her lamp and discovers Eros — he flees.",
      abandonment: "Psyche wanders in despair after Eros leaves her.",
      tasks:       "Venus sets four impossible tasks: sorting grain, golden fleece, Styx water, Proserpina's beauty.",
      underworld:  "Psyche descends to Hades to retrieve Proserpina's box of beauty.",
      reunion:     "Eros rescues Psyche and wakes her with a kiss.",
      apotheosis:  "Jupiter grants Psyche immortality; the gods celebrate their wedding.",
      general:     "The couple depicted without a specific narrative scene.",
    },

    panelClose:    "Close ✕",
    panelWorks:    (n) => `${n} work${n !== 1 ? 's' : ''}`,
    panelTitle:    (label, cent) => cent ? `${label} · ${cent}` : label,
    noDate:        'no date',
    centuryLabel:  (c) => `${c}th c.`,
    noImage:       'No image',

    essayTitle: "Analysis — Why Format Changes With the Century",
    essay: [
      {
        heading: "The Myth and Its Transmission",
        text: "The story of Cupid and Psyche is not an ancient Greek myth but a Latin novel: it first appears in Apuleius' *Metamorphoses* (c. 160 AD). This literary, allegorical origin shapes everything. The soul (psyche, ψυχή) earning immortality through love is a philosophical construction as much as a story — and artists consistently chose their format based on the interpretation they wished to convey.",
      },
      {
        heading: "Renaissance — The Festive Allegory (15th–16th c.)",
        text: "Humanists rediscovered Apuleius in the 1460s. Raphael's frescoes at the Villa Farnesina (Rome, 1517–18) established the dominant visual model: a triumphal feast of gods. The favoured formats were large oil paintings and tapestries — prestige objects for palace halls, where the myth's message (love perfects the soul) flattered aristocratic patrons. Tapestries also allowed complete narrative cycles woven for a single room.",
      },
      {
        heading: "Baroque to Rococo — From Triumph to Tenderness (17th–18th c.)",
        text: "Counter-Reformation caution complicated erotic mythology in public spaces, but private collections continued. Sculpture grew in importance: carved marble conveyed the myth's timeless ideal better than painted canvas. Canova's *Psyché ranimée par le baiser de l'Amour* (1793, Louvre) is the apex — the marble body suspended in the moment of revival makes the soul's resurrection physically present in a way no painting can achieve.",
      },
      {
        heading: "Neoclassicism — The Philosophical Peak (1780–1830)",
        text: "This period dominates the Paris collections. The Enlightenment projected its own categories onto Apuleius: Psyche = Reason or Soul, Eros = Passion or Desire, their union = the harmony of opposites. Academic painters (Gérard, Picot, Prudhon) produced monumental canvases for the Salon. The abundance of drawings reflects another reality: this myth was central to academic training. To draw Psyche was to master the idealised female figure.",
      },
      {
        heading: "Romanticism — The Inward Turn (1820–1880)",
        text: "Romanticism rejected the monumental in favour of the intimate. The myth's emotional core — longing, betrayal, solitude, reunion — resonated perfectly with the new sensibility. Formats shifted: drawings, watercolours, and prints allowed working privately, rapidly, emotionally. The Musée Rodin's fifty preparatory sheets on Psyche subjects are emblematic: Rodin treated the myth as a reservoir of inner states to explore in pencil, not to proclaim in marble.",
      },
      {
        heading: "The Psychological Dimension",
        text: "It is not coincidental that the myth's format migrated from public marble to private paper precisely as psychology emerged as a discipline (Fechner, 1860; Freud, 1900; Jung, 1912). James Hillman (*The Myth of Analysis*, 1972) reads Psyche's four tasks as stages of psychological development: sorting grain = discrimination, golden fleece = taming one's drives, Styx water = confronting mortality, underworld descent = integrating the shadow. The modern artist who draws or photographs Psyche expresses inner work, not external triumph.",
      },
      {
        heading: "Format as Argument",
        text: "The pattern is consistent: when Psyche was read as divine allegory (Renaissance), the format was grand and public. When read as philosophical ideal (Neoclassicism), it was monumental marble and academic canvas. When read as psychological exploration (Romanticism onward), it became intimate paper and print. Format is not decoration — it is the argument. To carve or draw, to hang in a palace or keep in a portfolio, encodes an entire interpretation of what the myth means.",
      },
    ],

    refsTitle: "Scholarly References",
    refs: [
      { author: "Warburg, Aby", work: "Mnemosyne-Atlas (1924–1929)", note: "Method for tracking emotional formulas (Pathosformeln) across media and centuries — the direct methodological precedent." },
      { author: "Seznec, Jean", work: "The Survival of the Pagan Gods (Princeton UP, 1953)", note: "How Venus, Mercury, Mars were differently depicted from the Middle Ages to the Renaissance according to dominant philosophical readings." },
      { author: "Haskell, Francis & Penny, Nicholas", work: "Taste and the Antique (Yale UP, 1981)", note: "Reception of major ancient sculptures (Farnese Hercules, Venus de Milo…) across five centuries: a model for analysing variation in format and medium." },
      { author: "Bull, Malcolm", work: "The Mirror of the Gods (Oxford UP, 2005)", note: "Systematic analysis of how each mythological figure — Apollo, Diana, Bacchus — shifts in medium and meaning from antiquity to 1600." },
      { author: "Baxandall, Michael", work: "Painting and Experience in Fifteenth-Century Italy (Oxford UP, 1972)", note: "Shows how patronage economics and the cognitive habits of a period directly determine format and composition choices." },
      { author: "Hillman, James", work: "The Myth of Analysis (Northwestern UP, 1972)", note: "Reads Psyche's four tasks as a model for depth psychological development — scholarly anchor for the section on the psychological turn." },
    ],
  },
};

// ─── Artwork type classifier (mirrors HomePage logic) ────────────────────────
function getArtworkType(artwork) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const descMat = norm((artwork.description || '') + ' ' + (artwork.materials || ''));
  // Primary check: description + materials
  if (/\btableau\b|\bpeinture\b|\bpainting\b|\bhuile\b/.test(descMat))          return 'Peinture';
  if (/\bsculpture\b|\bsculpte\b|\bstatue\b|\bstatuette\b|\bgroupe\b|\bmaquette\b|\bmarbre\b|\bbronze\b|\brelief\b|\bbuste\b/.test(descMat)) return 'Sculpture';
  if (/\bdessin\b|\bdrawing\b|\bsanguine\b|\bcrayon\b|\bgraphite\b|\baquarelle\b|\bplume\b|\blavis\b/.test(descMat)) return 'Dessin';
  if (/\bestampe\b|\bgravure\b|\blithographie\b/.test(descMat))                  return 'Estampe';
  if (/\btapisserie\b/.test(descMat))                                             return 'Tapisserie';
  if (/\bminiature\b/.test(descMat))                                              return 'Miniature';
  // Fallback: check title when description/materials give no type
  const title = norm(artwork.title || '');
  if (/\btableau\b|\bpeinture\b|\bhuile\b/.test(title))                         return 'Peinture';
  if (/\bsculpture\b|\bsculpte\b|\bstatue\b|\bgroupe\b|\bmarbre\b|\bbronze\b|\brelief\b|\bbuste\b|\bronde.bosse\b/.test(title)) return 'Sculpture';
  if (/\bdessin\b|\bsanguine\b|\bcrayon\b|\baquarelle\b/.test(title))           return 'Dessin';
  // Photographie only as last resort
  if (/\bphotographie\b|\bphotograph\b|\btirage\b/.test(descMat))               return 'Photographie';
  return 'Autre';
}

// ─── Narrative scene classifier ───────────────────────────────────────────────
function getStoryScene(artwork) {
  const t = (artwork.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Apotheosis checked first — Mercury also "enlève" Psyche to Olympus
  if (/olympe|apotheos|immortel|jupiter/.test(t))                              return 'apotheosis';
  if (/enlev|rapt|zephir|zephyr|emport|transport/.test(t))                    return 'arrival';
  if (/\bnoces?\b|\bmariage\b|hymen|nuptial/.test(t))                         return 'marriage';
  if (/soeur|jalous/.test(t))                                                   return 'sisters';
  if (/lampe|curiosit|surprend|decouvr/.test(t))                              return 'discovery';
  if (/abandonn|delais/.test(t))                                               return 'abandonment';
  if (/\btaches?\b|epreuve|corvee/.test(t))                                   return 'tasks';
  if (/enfer|proserpine/.test(t))                                              return 'underworld';
  if (/ranim|reveill|sauve|delivr|\bbaiser\b|retrouv|\banime\b/.test(t))     return 'reunion';
  return 'general';
}

function getCentury(dateStr) {
  const m = (dateStr || '').match(/\d{4}/);
  return m ? Math.ceil(parseInt(m[0]) / 100) : null;
}

// ─── Tooltip renderers (defined at module scope to avoid re-mount on render) ──
function renderTooltip1({ active, payload, label }, s) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-stone-700 mb-2">{s.centuryLabel(label)}</p>
      {payload.filter(p => p.value > 0).map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-stone-600 flex-1">{p.dataKey}</span>
          <span className="font-medium text-stone-800">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-stone-100 mt-2 pt-1 text-stone-400">Total: {total}</div>
    </div>
  );
}

function renderTooltip2({ active, payload }, s) {
  if (!active || !payload?.length) return null;
  const sc = payload[0]?.payload?.scene;
  if (!sc) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-lg text-xs max-w-[220px]">
      <p className="font-semibold text-stone-700 mb-1">{s.scenes[sc]}</p>
      <p className="text-stone-500 leading-snug mb-2">{s.sceneDesc[sc]}</p>
      <p className="font-medium text-amber-700">{s.panelWorks(payload[0].value)}</p>
    </div>
  );
}

// ─── Artwork mini-card panel ──────────────────────────────────────────────────
function ArtworkPanel({ artworks, title, onClose, s }) {
  if (!artworks?.length) return null;
  return (
    <div className="mt-4 bg-stone-50 rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-stone-700">
          {title} — {s.panelWorks(artworks.length)}
        </span>
        <button
          onClick={onClose}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          {s.panelClose}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-1">
        {artworks.map(a => (
          <Link
            key={a.id}
            to={`/artwork/${a.id}`}
            className="group flex flex-col gap-1 bg-white rounded-lg border border-stone-100 p-2 hover:border-amber-400 hover:shadow-sm transition-all"
          >
            {a.imageUrl ? (
              <img
                src={a.imageUrl}
                alt={a.title}
                className="w-full h-20 object-cover rounded bg-stone-100"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-20 bg-stone-100 rounded flex items-center justify-center text-stone-300 text-xs text-center px-1">
                {s.noImage}
              </div>
            )}
            <p className="text-xs font-medium text-stone-800 leading-tight line-clamp-2 group-hover:text-amber-700 transition-colors">
              {a.title}
            </p>
            <p className="text-xs text-stone-400 truncate">{a.artist}</p>
            <p className="text-xs text-stone-300">
              {(a.date || '').match(/\d{4}/)?.[0] || s.noDate}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Render italic from *text* markdown ──────────────────────────────────────
function RichText({ text }) {
  const parts = text.split(/\*([^*]+)\*/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <em key={i}>{part}</em> : part
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lang, setLang]         = useState('fr');
  const [sel1, setSel1]         = useState(null); // { century: 19, type: 'Dessin' }
  const [sel2, setSel2]         = useState(null); // { scene: 'arrival' }

  const s = STRINGS[lang];

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/artworks?theme=cupid-psyche`)
      .then(r => r.json())
      .then(d => { setArtworks(d.artworks || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Chart 1: format by century ──────────────────────────────────────────
  const { chart1Data, presentTypes } = useMemo(() => {
    const byCent = {};
    const typeSet = new Set();
    artworks.forEach(a => {
      const c = getCentury(a.date);
      if (!c) return;
      const type = getArtworkType(a);
      typeSet.add(type);
      if (!byCent[c]) byCent[c] = { century: c };
      byCent[c][type] = (byCent[c][type] || 0) + 1;
    });
    const data  = Object.values(byCent).sort((a, b) => a.century - b.century);
    const types = TYPE_ORDER.filter(t => typeSet.has(t));
    return { chart1Data: data, presentTypes: types };
  }, [artworks]);

  // ── Chart 2: by story scene ─────────────────────────────────────────────
  const chart2Data = useMemo(() => {
    const counts = {};
    SCENE_ORDER.forEach(sc => { counts[sc] = 0; });
    artworks.forEach(a => {
      const sc = getStoryScene(a);
      counts[sc] = (counts[sc] || 0) + 1;
    });
    return SCENE_ORDER
      .filter(sc => counts[sc] > 0)
      .map(sc => ({ scene: sc, count: counts[sc] }));
  }, [artworks]);

  // ── Artwork lists for panels ────────────────────────────────────────────
  const panel1Artworks = useMemo(() => {
    if (!sel1) return [];
    return artworks.filter(a =>
      getCentury(a.date) === sel1.century && getArtworkType(a) === sel1.type
    );
  }, [artworks, sel1]);

  const panel2Artworks = useMemo(() => {
    if (!sel2) return [];
    return artworks.filter(a => getStoryScene(a) === sel2.scene);
  }, [artworks, sel2]);

  // ── Click handlers ──────────────────────────────────────────────────────
  const handleBar1Click = (data, type) => {
    const c = data.century;
    setSel1(prev => (prev?.century === c && prev?.type === type) ? null : { century: c, type });
    setSel2(null);
  };

  const handleBar2Click = (data) => {
    const sc = data.scene;
    setSel2(prev => prev?.scene === sc ? null : { scene: sc });
    setSel1(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Top bar ── */}
      <div className="bg-stone-900 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="text-stone-400 hover:text-amber-400 text-sm transition-colors">
          {s.back}
        </Link>
        <button
          onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
          className="text-xs px-3 py-1 border border-stone-600 rounded-full text-stone-300 hover:border-amber-400 hover:text-amber-400 transition-colors"
        >
          {s.toggleLang}
        </button>
      </div>

      {/* ── Header ── */}
      <header className="bg-stone-900 text-white pb-12 px-6 pt-1">
        <div className="max-w-5xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">{s.pageLabel}</p>
          <h1 className="text-4xl font-serif font-bold mb-3">{s.pageTitle}</h1>
          <p className="text-stone-300 text-base max-w-2xl leading-relaxed">{s.pageSubtitle}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-16">

        {/* ════════ CHART 1 — Format by century ════════ */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">{s.chart1Title}</h2>
          <p className="text-stone-500 text-sm mb-1 max-w-2xl leading-relaxed">{s.chart1Desc}</p>
          <p className="text-amber-600 text-xs mb-6 italic">{s.chart1Hint}</p>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chart1Data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="century"
                tickFormatter={c => s.centuryLabel(c)}
                tick={{ fill: '#78716c', fontSize: 12 }}
                axisLine={{ stroke: '#d6d3d1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#78716c', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={(props) => renderTooltip1(props, s)} />
              <Legend
                wrapperStyle={{ paddingTop: '16px' }}
                formatter={(value) => (
                  <span style={{ color: '#57534e', fontSize: '12px' }}>{value}</span>
                )}
              />
              {presentTypes.map(type => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="stack"
                  fill={TYPE_COLORS[type]}
                  onClick={(data) => handleBar1Click(data, type)}
                  cursor="pointer"
                  opacity={sel1 ? (sel1.type === type ? 1 : 0.45) : 1}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          <ArtworkPanel
            artworks={panel1Artworks}
            title={sel1 ? s.panelTitle(sel1.type, s.centuryLabel(sel1.century)) : ''}
            onClose={() => setSel1(null)}
            s={s}
          />
        </section>

        {/* ════════ CHART 2 — Story scenes ════════ */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">{s.chart2Title}</h2>
          <p className="text-stone-500 text-sm mb-1 max-w-2xl leading-relaxed">{s.chart2Desc}</p>
          <p className="text-amber-600 text-xs mb-6 italic">{s.chart2Hint}</p>

          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={chart2Data}
              margin={{ top: 10, right: 20, left: 0, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="scene"
                tickFormatter={sc => s.scenes[sc]}
                tick={{ fill: '#78716c', fontSize: 11 }}
                angle={-38}
                textAnchor="end"
                interval={0}
                axisLine={{ stroke: '#d6d3d1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#78716c', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={(props) => renderTooltip2(props, s)} />
              <Bar
                dataKey="count"
                onClick={handleBar2Click}
                cursor="pointer"
                radius={[4, 4, 0, 0]}
              >
                {chart2Data.map(entry => (
                  <Cell
                    key={entry.scene}
                    fill={sel2?.scene === entry.scene ? '#d97706' : SCENE_COLORS[entry.scene]}
                    opacity={sel2 ? (sel2.scene === entry.scene ? 1 : 0.5) : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <ArtworkPanel
            artworks={panel2Artworks}
            title={sel2 ? s.scenes[sel2.scene] : ''}
            onClose={() => setSel2(null)}
            s={s}
          />
        </section>

        {/* ════════ ESSAY ════════ */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-stone-800 mb-8">{s.essayTitle}</h2>
          <div className="space-y-8 max-w-3xl">
            {s.essay.map(({ heading, text }) => (
              <div key={heading}>
                <h3 className="text-lg font-serif font-semibold text-stone-800 mb-2">{heading}</h3>
                <p className="text-stone-600 leading-relaxed text-sm">
                  <RichText text={text} />
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ════════ REFERENCES ════════ */}
        <section className="pb-10">
          <h2 className="text-xl font-serif font-semibold text-stone-800 mb-5">{s.refsTitle}</h2>
          <ul className="space-y-4 max-w-3xl">
            {s.refs.map(r => (
              <li key={r.work} className="flex gap-3 text-sm">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">—</span>
                <div className="leading-relaxed">
                  <span className="font-medium text-stone-700">{r.author}. </span>
                  <em className="text-stone-600">{r.work}. </em>
                  <span className="text-stone-500">{r.note}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

      </main>
    </div>
  );
}
