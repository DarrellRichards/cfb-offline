# CFB Offline

Offline dynasty desk for **EA Sports College Football** saves: schedule, rankings,
stats, recruiting board, and team NIL/program points — in the browser or as a
desktop app.

Unofficial community project. See [NOTICE](NOTICE) for trademark and schema notes.

## Features

- Extract league snapshot, schedule (incl. Game of the Week), teams/polls, rosters, stats, and recruiting
- Next.js UI for browsing dynasty data
- Local News desk (year/week articles you write; optional paid AI draft unlock)
- Electron desktop shell with native save picker and one-click extract
- Write-back helpers for team NIL and program points

## Requirements

- Node.js 20+ (22+ recommended)
- A College Football 27 dynasty save (`DYNASTY*`)
- Schema file `C27_468_2.gz` at the repo root (required by `madden-franchise`)

## Quick start (web)

```bash
npm install
npm install --prefix web
npm run web:dev
```

Open [http://localhost:3000](http://localhost:3000). Use the dynasty bar to pick a save and extract.

## Promo site

Product landing page with Windows downloads from GitHub Releases:

```bash
npm install --prefix promo
npm run promo:dev
```

Open [http://localhost:3001](http://localhost:3001). Optional: set `NEXT_PUBLIC_GITHUB_REPO=owner/repo` (default `DarrellRichards/cfb-offline`).

## CLI extract

```bash
npm run extract:all -- "/path/to/DYNASTY-YOUR-SAVE"
```

Individual extractors:

```bash
npm run extract:league -- "/path/to/DYNASTY-YOUR-SAVE"
npm run extract:schedule -- "/path/to/DYNASTY-YOUR-SAVE"
npm run extract:teams -- "/path/to/DYNASTY-YOUR-SAVE"
npm run extract:roster -- "/path/to/DYNASTY-YOUR-SAVE"
npm run extract:stats -- "/path/to/DYNASTY-YOUR-SAVE"
node extract-recruit-board.js "/path/to/DYNASTY-YOUR-SAVE"
```

Snapshots write under `data/` (gitignored except `physical-ability-map.json`).

## Desktop app

```bash
npm run desktop:dev   # Electron + Next dev server
npm run desktop       # Electron + production Next build
```

### Windows installer

Build on **Windows** (cross-building NSIS from WSL/Linux is fragile):

```bash
npm install
npm install --prefix web
npm run dist:win
```

Installer output: `dist/CFB Offline-Setup-*.exe`.

## Project layout

| Path | Role |
|------|------|
| `app/` | Electron main + preload |
| `web/` | Next.js UI and API routes |
| `promo/` | Product promo site + GitHub Releases downloads |
| `lib/franchise.js` | Shared save open / schema helpers |
| `extract-*.js` | Dynasty extractors |
| `update-team-*.js` | NIL / program points writers |
| `data/physical-ability-map.json` | Recruit ability label map |
| `C27_468_2.gz` | Franchise schema (see NOTICE) |
| `electron-builder.yml` | Desktop packaging |

## Environment

| Variable | Purpose |
|----------|---------|
| `CFB_REPO_ROOT` | Runtime root (packaged desktop sets this) |
| `CFB_DATA_DIR` | Where JSON snapshots are written (desktop uses Electron `userData`) |
| `CFB_ELECTRON_DEV` | `1` = Next dev server inside Electron |
| `CFB_AI_NEWS_ENABLED` | `1` / `true` unlocks AI News for this install (paid add-on path) |
| `CFB_AI_NEWS_LICENSES` | Optional comma-separated license keys accepted by `/api/news/generate` |
| `OPENAI_API_KEY` | Provider key used after AI News is unlocked |
| `CFB_AI_NEWS_MODEL` | Optional OpenAI model override (default `gpt-4.1-mini`) |

### News desk

Open **More → News** to browse/write articles by season year and week. Articles store in `data/news.json` (local desk data, not written into the dynasty save).

With **Auto News** enabled (Settings, on by default), each extract fills the current dynasty week up to **Stories per week** (default 5) using scores, GOTW, polls, awards, and conference notes. Re-extracting the same week will not duplicate past the target count.

### Hosted uploads (view-only)

On the web UI (non-desktop), users can **Upload & extract** a `DYNASTY*` file. Uploads land in `data/uploads/` and are treated as **view-only**: rankings/NIL write-backs are hidden in the UI and rejected by `/api/team/*`. Browse the desk normally after extract; do not expect cloud write-back into the uploaded binary.

AI drafting is gated as a paid unlock: enter a `CFB-AI-…` license in the News UI, set `CFB_AI_NEWS_ENABLED=1`, or list keys in `CFB_AI_NEWS_LICENSES`. Generation also needs `OPENAI_API_KEY`. Stripe (or similar) can replace the local license file later without changing the article model.

## License

MIT — see [LICENSE](LICENSE). Game assets and trademarks remain with their owners.
