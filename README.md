# CFB Offline

Offline dynasty desk for **EA Sports College Football** saves: schedule, rankings,
stats, recruiting board, and team NIL/program points — in the browser or as a
desktop app.

Unofficial community project. See [NOTICE](NOTICE) for trademark and schema notes.

## Features

- Extract league snapshot, schedule (incl. Game of the Week), teams/polls, stats, and recruiting
- Next.js UI for browsing dynasty data
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

## CLI extract

```bash
npm run extract:all -- "/path/to/DYNASTY-YOUR-SAVE"
```

Individual extractors:

```bash
npm run extract:league -- "/path/to/DYNASTY-YOUR-SAVE"
npm run extract:schedule -- "/path/to/DYNASTY-YOUR-SAVE"
npm run extract:teams -- "/path/to/DYNASTY-YOUR-SAVE"
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

## License

MIT — see [LICENSE](LICENSE). Game assets and trademarks remain with their owners.
