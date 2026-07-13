const fs = require('fs');
const os = require('os');
const path = require('path');
const { FranchiseFile } = require('madden-franchise');

const ROOT_DIR = process.env.CFB_REPO_ROOT
	? path.resolve(process.env.CFB_REPO_ROOT)
	: path.resolve(__dirname, '..');
const SCHEMA_PATH = path.resolve(ROOT_DIR, 'C27_468_2.gz');
const DATA_DIR = process.env.CFB_DATA_DIR
	? path.resolve(process.env.CFB_DATA_DIR)
	: path.resolve(ROOT_DIR, 'data');
const GAME_YEAR_SAVES = ['EA SPORTS College Football 27', 'saves'];

function resolveInputPath(p) {
	if (!p) return p;
	if (fs.existsSync(p)) return p;

	const winDriveMatch = String(p).match(/^([A-Za-z]):\\(.*)$/);
	if (winDriveMatch) {
		const drive = winDriveMatch[1].toLowerCase();
		const rest = winDriveMatch[2].replace(/\\/g, '/');
		const wslPath = `/mnt/${drive}/${rest}`;
		if (fs.existsSync(wslPath)) return wslPath;
	}

	return p;
}

function getDefaultSavesDir() {
	const docs = path.join(os.homedir(), 'Documents');
	const direct = path.join(docs, ...GAME_YEAR_SAVES);
	if (fs.existsSync(direct)) return direct;

	const user = process.env.USERNAME || process.env.USER;
	if (user) {
		const candidates = [
			path.posix.join('/mnt/c/Users', user, 'OneDrive/Documents', ...GAME_YEAR_SAVES),
			path.posix.join('/mnt/c/Users', user, 'Documents', ...GAME_YEAR_SAVES),
		];
		for (const candidate of candidates) {
			if (fs.existsSync(candidate)) return candidate;
		}
	}

	return direct;
}

/** CLI helper: require an explicit dynasty save path (no personal defaults). */
function requireCliSavePath(argv = process.argv.slice(2), scriptName = 'extract') {
	const explicit = argv.find((a) => !a.startsWith('--'));
	if (!explicit) {
		console.error(`Usage: node ${scriptName} <path-to-DYNASTY-save> [options]`);
		console.error(`Default saves folder: ${getDefaultSavesDir()}`);
		process.exit(1);
	}
	return resolveInputPath(explicit);
}

function parseRef(bin) {
	if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) {
		return null;
	}

	return {
		tableId: parseInt(bin.slice(0, 15), 2),
		row: parseInt(bin.slice(15), 2),
	};
}

function safeField(rec, field) {
	try {
		return rec[field];
	} catch {
		return undefined;
	}
}

function normalizeKey(v) {
	return String(v || '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9_]/g, '');
}

function tableByName(file, name) {
	const hits = file.tables.filter((t) => t.name === name);
	if (!hits.length) {
		throw new Error(`table not found: ${name}`);
	}

	return hits.sort((a, b) => b.header.recordCapacity - a.header.recordCapacity)[0];
}

async function readTable(file, name) {
	const table = tableByName(file, name);
	await table.readRecords();
	return table;
}

function openSave(savePath) {
	const resolved = resolveInputPath(savePath);
	return new Promise((resolve, reject) => {
		const file = new FranchiseFile(resolved, {
			autoParse: true,
			schemaDirectory: ROOT_DIR,
			schemaOverride: {
				major: 468,
				minor: 2,
				gameYear: 27,
				path: SCHEMA_PATH,
			},
		});

		file.on('ready', () => resolve(file));
		file.on('error', reject);
	});
}

function getUserControlledCoach(coachT) {
	return (
		coachT.records.find(
			(rec) => rec && !rec.isEmpty && safeField(rec, 'IsUserControlled') === true
		) || null
	);
}

function getUserControlledTeamRecord(userCoach, coachT, teamT) {
	if (!userCoach) return null;

	for (const teamRec of teamT.records) {
		if (!teamRec || teamRec.isEmpty) continue;

		const headCoachRef = parseRef(safeField(teamRec, 'HeadCoach'));
		if (
			headCoachRef &&
			headCoachRef.tableId === coachT.header.tableId &&
			headCoachRef.row === userCoach.index
		) {
			return teamRec;
		}

		const userCharacterRef = parseRef(safeField(teamRec, 'UserCharacter'));
		if (
			userCharacterRef &&
			userCharacterRef.tableId === coachT.header.tableId &&
			userCharacterRef.row === userCoach.index
		) {
			return teamRec;
		}
	}

	const teamIndex = Number(safeField(userCoach, 'TeamIndex'));
	if (Number.isFinite(teamIndex) && teamIndex >= 0 && teamIndex < teamT.records.length) {
		const fallbackTeamRec = teamT.records[teamIndex];
		if (fallbackTeamRec && !fallbackTeamRec.isEmpty) {
			return fallbackTeamRec;
		}
	}

	return null;
}

function teamIdentity(teamRec, rowIndex) {
	const displayName = String(
		safeField(teamRec, 'DisplayName') || safeField(teamRec, 'LongName') || ''
	).trim();
	const nickname = String(safeField(teamRec, 'NickName') || '').trim();
	const teamIndex = Number(safeField(teamRec, 'TeamIndex'));
	return {
		row: rowIndex,
		teamIndex: Number.isFinite(teamIndex) ? teamIndex : rowIndex,
		displayName,
		longName: String(safeField(teamRec, 'LongName') || displayName).trim(),
		nickname,
		label: `${displayName} ${nickname}`.trim(),
		assetName: String(safeField(teamRec, 'AssetName') || '').trim(),
		primaryColor: {
			r: Number(safeField(teamRec, 'TEAM_LOGO_PRIMARYR')) || Number(safeField(teamRec, 'TEAM_BACKGROUNDCOLORR')) || 0,
			g: Number(safeField(teamRec, 'TEAM_LOGO_PRIMARYG')) || Number(safeField(teamRec, 'TEAM_BACKGROUNDCOLORG')) || 0,
			b: Number(safeField(teamRec, 'TEAM_LOGO_PRIMARYB')) || Number(safeField(teamRec, 'TEAM_BACKGROUNDCOLORB')) || 0,
		},
	};
}

function buildTeamLookup(teamT) {
	const byRow = new Map();
	const byTeamIndex = new Map();

	for (const teamRec of teamT.records) {
		if (!teamRec || teamRec.isEmpty) continue;
		const identity = teamIdentity(teamRec, teamRec.index);
		if (!identity.displayName) continue;
		byRow.set(teamRec.index, { rec: teamRec, ...identity });
		byTeamIndex.set(identity.teamIndex, { rec: teamRec, ...identity });
	}

	return { byRow, byTeamIndex };
}

function resolveTeamFromRef(ref, teamLookup, teamT) {
	if (!ref) return null;
	if (teamT && ref.tableId === teamT.header.tableId) {
		return teamLookup.byRow.get(ref.row) || null;
	}
	return teamLookup.byRow.get(ref.row) || null;
}

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
	return DATA_DIR;
}

function writeJson(filename, payload) {
	ensureDataDir();
	const outPath = path.join(DATA_DIR, filename);
	fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
	return outPath;
}

function num(rec, field, fallback = 0) {
	const v = Number(safeField(rec, field));
	return Number.isFinite(v) ? v : fallback;
}

function str(rec, field, fallback = '') {
	const v = safeField(rec, field);
	if (v == null) return fallback;
	return String(v).trim();
}

function bool(rec, field) {
	return Boolean(safeField(rec, field));
}

module.exports = {
	ROOT_DIR,
	SCHEMA_PATH,
	DATA_DIR,
	GAME_YEAR_SAVES,
	resolveInputPath,
	getDefaultSavesDir,
	requireCliSavePath,
	parseRef,
	safeField,
	normalizeKey,
	tableByName,
	readTable,
	openSave,
	getUserControlledCoach,
	getUserControlledTeamRecord,
	teamIdentity,
	buildTeamLookup,
	resolveTeamFromRef,
	ensureDataDir,
	writeJson,
	num,
	str,
	bool,
};
