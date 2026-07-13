const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOT_FILES = {
  league: 'league-snapshot.json',
  schedule: 'schedule.json',
  teams: 'teams.json',
  stats: 'stats.json',
  awards: 'awards.json',
  recruits: 'recruit-board.json',
};

function getDataDir() {
  if (process.env.CFB_DATA_DIR) return path.resolve(process.env.CFB_DATA_DIR);
  const root = process.env.CFB_REPO_ROOT
    ? path.resolve(process.env.CFB_REPO_ROOT)
    : path.resolve(__dirname, '..');
  return path.join(root, 'data');
}

function getDbPath() {
  return path.join(path.dirname(getDataDir()), 'dynasty-archive.sqlite');
}

function normalizeSavePath(savePath) {
  return path.resolve(String(savePath || '').trim()).replace(/\\/g, '/').toLowerCase();
}

function dynastyIdFromSavePath(savePath) {
  return crypto.createHash('sha1').update(normalizeSavePath(savePath)).digest('hex').slice(0, 16);
}

function dynastyLabelFromSavePath(savePath) {
  const base = path.basename(String(savePath || ''));
  return base || 'Dynasty';
}

let SQL = null;
let initPromise = null;

async function getSqlJs() {
  if (SQL) return SQL;
  if (!initPromise) {
    initPromise = (async () => {
      const initSqlJs = require('sql.js');
      const distDir = path.dirname(require.resolve('sql.js'));
      SQL = await initSqlJs({
        locateFile: (file) => path.join(distDir, file),
      });
      return SQL;
    })();
  }
  return initPromise;
}

function ensureSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS dynasties (
      id TEXT PRIMARY KEY,
      save_path TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dynasty_id TEXT NOT NULL,
      season_year INTEGER NOT NULL,
      extracted_at TEXT NOT NULL,
      UNIQUE(dynasty_id, season_year)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS season_snapshots (
      season_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY(season_id, name)
    );
  `);
}

function openDbSync(SQLCtor, dbPath) {
  let db;
  if (fs.existsSync(dbPath)) {
    db = new SQLCtor.Database(fs.readFileSync(dbPath));
  } else {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new SQLCtor.Database();
  }
  ensureSchema(db);
  return db;
}

function persistDb(db, dbPath) {
  const data = db.export();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(db, sql, params = []) {
  return queryAll(db, sql, params)[0] || null;
}

function readSnapshotFile(dataDir, key) {
  const fileName = SNAPSHOT_FILES[key];
  if (!fileName) return null;
  const full = path.join(dataDir, fileName);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function seasonYearFromLeaguePayload(leagueRaw) {
  try {
    const league = typeof leagueRaw === 'string' ? JSON.parse(leagueRaw) : leagueRaw;
    const year =
      Number(league?.season?.currentSeasonYear) ||
      Number(league?.season?.currentYear) ||
      Number(league?.seasonYear);
    return Number.isFinite(year) && year > 0 ? year : null;
  } catch {
    return null;
  }
}

async function archiveCurrentExtract(savePath, { dataDir = getDataDir() } = {}) {
  const leagueRaw = readSnapshotFile(dataDir, 'league');
  if (!leagueRaw) {
    throw new Error('Cannot archive: league snapshot missing.');
  }
  const seasonYear = seasonYearFromLeaguePayload(leagueRaw);
  if (!seasonYear) {
    throw new Error('Cannot archive: season year missing from league snapshot.');
  }

  const SQLCtor = await getSqlJs();
  const dbPath = getDbPath();
  const db = openDbSync(SQLCtor, dbPath);
  const now = new Date().toISOString();
  const dynastyId = dynastyIdFromSavePath(savePath);
  const label = dynastyLabelFromSavePath(savePath);
  const normalized = path.resolve(String(savePath));

  try {
    db.run(
      `INSERT INTO dynasties (id, save_path, label, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         save_path = excluded.save_path,
         label = excluded.label,
         updated_at = excluded.updated_at`,
      [dynastyId, normalized, label, now, now]
    );

    db.run(
      `INSERT INTO seasons (dynasty_id, season_year, extracted_at)
       VALUES (?, ?, ?)
       ON CONFLICT(dynasty_id, season_year) DO UPDATE SET
         extracted_at = excluded.extracted_at`,
      [dynastyId, seasonYear, now]
    );

    const season = queryOne(
      db,
      `SELECT id FROM seasons WHERE dynasty_id = ? AND season_year = ? LIMIT 1`,
      [dynastyId, seasonYear]
    );
    if (!season?.id) throw new Error('Failed to resolve season id after upsert.');

    for (const name of Object.keys(SNAPSHOT_FILES)) {
      const payload = readSnapshotFile(dataDir, name);
      if (!payload) continue;
      db.run(
        `INSERT INTO season_snapshots (season_id, name, payload)
         VALUES (?, ?, ?)
         ON CONFLICT(season_id, name) DO UPDATE SET payload = excluded.payload`,
        [season.id, name, payload]
      );
    }

    persistDb(db, dbPath);
    markLiveSeason(normalized, seasonYear, dataDir);
    return { dynastyId, seasonYear, seasonId: season.id, dbPath };
  } finally {
    db.close();
  }
}

async function listSeasonsForSave(savePath) {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return [];
  const SQLCtor = await getSqlJs();
  const db = openDbSync(SQLCtor, dbPath);
  try {
    const dynastyId = dynastyIdFromSavePath(savePath);
    return queryAll(
      db,
      `SELECT s.id as seasonId, s.season_year as seasonYear, s.extracted_at as extractedAt,
              d.label as label, d.save_path as savePath
       FROM seasons s
       JOIN dynasties d ON d.id = s.dynasty_id
       WHERE s.dynasty_id = ?
       ORDER BY s.season_year DESC`,
      [dynastyId]
    );
  } finally {
    db.close();
  }
}

async function listAllSeasons() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return [];
  const SQLCtor = await getSqlJs();
  const db = openDbSync(SQLCtor, dbPath);
  try {
    return queryAll(
      db,
      `SELECT s.id as seasonId, s.season_year as seasonYear, s.extracted_at as extractedAt,
              d.id as dynastyId, d.label as label, d.save_path as savePath
       FROM seasons s
       JOIN dynasties d ON d.id = s.dynasty_id
       ORDER BY d.updated_at DESC, s.season_year DESC`
    );
  } finally {
    db.close();
  }
}

async function restoreSeasonToDataDir(seasonId, { dataDir = getDataDir() } = {}) {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) throw new Error('No dynasty archive found yet.');
  const SQLCtor = await getSqlJs();
  const db = openDbSync(SQLCtor, dbPath);
  try {
    const meta = queryOne(
      db,
      `SELECT s.id as seasonId, s.season_year as seasonYear, s.extracted_at as extractedAt,
              d.label as label, d.save_path as savePath
       FROM seasons s
       JOIN dynasties d ON d.id = s.dynasty_id
       WHERE s.id = ?
       LIMIT 1`,
      [Number(seasonId)]
    );
    if (!meta) throw new Error(`Season ${seasonId} not found.`);

    const snaps = queryAll(db, `SELECT name, payload FROM season_snapshots WHERE season_id = ?`, [
      Number(seasonId),
    ]);
    if (!snaps.length) throw new Error(`Season ${seasonId} has no snapshots.`);

    fs.mkdirSync(dataDir, { recursive: true });
    for (const snap of snaps) {
      const fileName = SNAPSHOT_FILES[snap.name];
      if (!fileName) continue;
      fs.writeFileSync(path.join(dataDir, fileName), snap.payload, 'utf8');
    }

    const active = {
      seasonId: meta.seasonId,
      seasonYear: meta.seasonYear,
      savePath: meta.savePath,
      label: meta.label,
      restoredAt: new Date().toISOString(),
      live: false,
    };
    fs.writeFileSync(path.join(dataDir, 'active-season.json'), JSON.stringify(active, null, 2));
    return active;
  } finally {
    db.close();
  }
}

function readActiveSeasonMeta(dataDir = getDataDir()) {
  const full = path.join(dataDir, 'active-season.json');
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

function markLiveSeason(savePath, seasonYear, dataDir = getDataDir()) {
  const active = {
    seasonId: null,
    seasonYear,
    savePath,
    label: dynastyLabelFromSavePath(savePath),
    restoredAt: new Date().toISOString(),
    live: true,
  };
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'active-season.json'), JSON.stringify(active, null, 2));
  return active;
}

module.exports = {
  SNAPSHOT_FILES,
  getDataDir,
  getDbPath,
  dynastyIdFromSavePath,
  archiveCurrentExtract,
  listSeasonsForSave,
  listAllSeasons,
  restoreSeasonToDataDir,
  readActiveSeasonMeta,
  markLiveSeason,
  seasonYearFromLeaguePayload,
};
