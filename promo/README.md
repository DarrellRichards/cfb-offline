# CFB Offline promo site

Marketing page for CFB Offline with downloads from GitHub Releases.

## Develop

```bash
npm install --prefix promo
npm run promo:dev
```

Open [http://localhost:3001](http://localhost:3001).

## Build

```bash
npm run promo:build
npm run promo:start
```

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GITHUB_REPO` | `owner/repo` for Releases (default `DarrellRichards/cfb-offline`) |
| `GITHUB_REPO` | Server-side override for the same value |

The page fetches `GET /repos/{owner}/{repo}/releases/latest` every 5 minutes (ISR) and prefers a Windows `.exe` Setup asset.
