# Cupidon et Psyché — Paris Museums

A web application that collects and displays every artwork depicting the myth of **Cupid and Psyche** held in Paris museums, pulling live data from open cultural databases.

🔗 **Live site:** [mango-desert-0a829be10.7.azurestaticapps.net](https://mango-desert-0a829be10.7.azurestaticapps.net)

---

## Overview

The myth of Cupid and Psyche is one of the most depicted subjects in Western art. This site aggregates artworks on that theme from Paris museums into a single searchable, filterable gallery — paintings, sculptures, drawings, prints, and more — with museum locations shown on a map.

---

## Features

- **Artwork gallery** — browse ~228 unique works with title, artist, date, and museum
- **Filters**
  - Free-text search across title, artist, and museum name
  - Date range filter (year from / year to)
  - **Artwork type** dropdown — dynamically lists all types present in the data (Peinture, Sculpture, Dessin, Estampe, Photographie, Tapisserie, Miniature…)
  - Sort by date, title, or museum
- **Detail page** — click any artwork for full description, materials, period, and a map pin showing the museum's location
- **Museum map** — interactive Leaflet map on each detail page, centred on the holding museum
- **Deduplication** — artworks appearing in both data sources are merged into a single entry using accent-normalised, artist-order-insensitive key matching

---

## Data Sources

### 1. Wikidata (live SPARQL)
Queries the [Wikidata Query Service](https://query.wikidata.org/) at startup for items with the subject *Cupid and Psyche* held in Paris museums. Results are cached for 24 hours to avoid hammering the endpoint.

Key fields returned: title (French label), artist, date, image URL, museum name, GPS coordinates.

### 2. Joconde (static snapshot)
The French Ministry of Culture publishes the [Joconde database](https://www.data.gouv.fr/fr/datasets/joconde-base-de-donnees-des-collections-des-musees-de-france/) — a CSV of every object in French national museum collections.

The full ~700 MB CSV was streamed and filtered locally with a Python script (`scripts/filter-joconde.py`) to extract only Paris artworks whose title or depicted subject contains *Psyché*, *Psyche*, or *Cupidon*. The 319 matched entries were saved as `backend/static/joconde-supplement.json` and are served statically (no live CSV fetch at runtime).

Key fields used: denomination (artwork type), materials, date, period, subject, museum name and code, POP portal URL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3.4 |
| Fonts | Playfair Display (Google Fonts) |
| Routing | React Router v6 |
| Map | Leaflet via react-leaflet |
| Backend | Node.js v24 + Express 4 (ESM modules) |
| Data — live | Wikidata SPARQL (24 h server-side cache) |
| Data — static | Joconde CSV pre-filtered to JSON |
| Hosting — frontend | Azure Static Web Apps (Free tier) |
| Hosting — backend | Azure App Service (B1 Linux, Node 22 LTS) |
| CI/CD | GitHub Actions (push to `main` → auto-rebuild frontend) |

---

## Project Structure

```
mythology-paris/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── HomePage.jsx      # Gallery + filter bar
│       │   └── DetailPage.jsx    # Single artwork + museum map
│       └── components/
│           ├── ArtworkCard.jsx   # Card in the grid
│           └── MuseumMap.jsx     # Leaflet map component
└── backend/
    └── src/
        ├── server.js             # Express entry point
        ├── routes/
        │   └── artworks.js       # /api/artworks — merge + dedup logic
        └── services/
            ├── wikidata.js       # SPARQL query + 24 h cache
            ├── joconde.js        # Load static JSON snapshot
            └── wikipedia.js      # Fetch myth summary (detail page)
```

---

## How It Was Built

### 1. Data discovery
Started by querying Wikidata's SPARQL endpoint to find Cupid & Psyche artworks in Paris. The query targets the Louvre and its sub-departments (Sculptures, Antiquités grecques, Objets d'art…), Musée Rodin, Petit Palais, and other Paris institutions by their Wikidata Q-IDs.

### 2. Joconde supplement
Wikidata alone missed many works catalogued only in French national databases. The Joconde CSV was downloaded and filtered with a Python script to capture those records, then stored as a static JSON file so the backend doesn't need to re-download 700 MB on every cold start.

### 3. Backend API
A single Express endpoint (`GET /api/artworks?theme=cupid-psyche`) merges both sources and deduplicates using a normalised key:

```
key = normalised_title | sorted_artist_tokens | "louvre" (or museum_name[:30])
```

Normalisation strips diacritics (NFD) and sorts artist name tokens alphabetically, so *"François Gérard"* (Wikidata) and *"GERARD François"* (Joconde) collapse to the same key.

### 4. Frontend filtering
All filtering happens client-side in a `useMemo` hook after the full artwork list is fetched once. The **artwork type** is derived at render time from each artwork's `description` and `materials` fields using a regex classifier — no extra backend field needed.

### 5. Deployment
- **Backend**: packaged and deployed to Azure App Service with `az webapp deploy`, CORS configured to allow the Static Web Apps domain.
- **Frontend**: GitHub Actions workflow injects `VITE_API_URL` at build time and deploys the Vite build output to Azure Static Web Apps on every push to `main`.

---

## Local Development

```bash
# Backend
cd backend
npm install
node src/server.js          # runs on http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173
```

Set `VITE_API_URL=http://localhost:3001` in `frontend/.env.local` if you want the dev frontend to hit the local backend.
