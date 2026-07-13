#!/usr/bin/env node
const {
  archiveCurrentExtract,
  listSeasonsForSave,
  listAllSeasons,
  restoreSeasonToDataDir,
  readActiveSeasonMeta,
} = require('./lib/season-archive');

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'archive') {
    const savePath = rest[0];
    if (!savePath) throw new Error('Usage: archive-cli.js archive <savePath>');
    const result = await archiveCurrentExtract(savePath);
    console.log(JSON.stringify({ ok: true, ...result }));
    return;
  }
  if (cmd === 'list') {
    const savePath = rest[0] || '';
    const seasons = savePath ? await listSeasonsForSave(savePath) : await listAllSeasons();
    console.log(JSON.stringify({ ok: true, seasons, active: readActiveSeasonMeta() }));
    return;
  }
  if (cmd === 'restore') {
    const seasonId = Number(rest[0]);
    if (!Number.isFinite(seasonId)) throw new Error('Usage: archive-cli.js restore <seasonId>');
    const active = await restoreSeasonToDataDir(seasonId);
    console.log(JSON.stringify({ ok: true, active }));
    return;
  }
  throw new Error('Usage: archive-cli.js <archive|list|restore> ...');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
