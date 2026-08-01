const { safeField, parseRef, num, readTable } = require('./franchise');

function readOffenseStat(statRec) {
	return {
		seasYear: num(statRec, 'SEAS_YEAR'),
		gamesPlayed: num(statRec, 'GAMESPLAYED'),
		passYards: num(statRec, 'PASSYARDS'),
		passAttempts: num(statRec, 'PASSATTEMPTS'),
		passCompletions: num(statRec, 'PASSCOMPLETED'),
		passTds: num(statRec, 'PASSTDS'),
		passInts: num(statRec, 'PASSINTS'),
		rushYards: num(statRec, 'RUSHYARDS'),
		rushAttempts: num(statRec, 'RUSHATTEMPTS'),
		rushTds: num(statRec, 'RUSHTDS'),
		receiveYards: num(statRec, 'RECEIVEYARDS'),
		receiveCatches: num(statRec, 'RECEIVECATCHES'),
		receiveTds: num(statRec, 'RECEIVETDS'),
	};
}

function readDefenseStat(statRec) {
	return {
		seasYear: num(statRec, 'SEAS_YEAR'),
		gamesPlayed: num(statRec, 'GAMESPLAYED'),
		tackles: num(statRec, 'DEFTACKLES'),
		sacks: num(statRec, 'DLINESACKS'),
		ints: num(statRec, 'DSECINTS'),
		tfl: num(statRec, 'DEFTACKLESFORLOSS'),
		deflections: num(statRec, 'DEFPASSDEFLECTIONS'),
		forcedFumbles: num(statRec, 'DLINEFORCEDFUMBLES'),
	};
}

function readKickingStat(statRec) {
	return {
		seasYear: num(statRec, 'SEAS_YEAR'),
		gamesPlayed: num(statRec, 'GAMESPLAYED'),
		fgMade: num(statRec, 'KICKFGMADE'),
		fgAttempts: num(statRec, 'KICKFGATTEMPTS'),
		fgLong: num(statRec, 'KICKFGLONGEST'),
		xpMade: num(statRec, 'KICKEPMADE'),
		xpAttempts: num(statRec, 'KICKEPATTEMPTS'),
		puntYards: num(statRec, 'PUNTYARDS'),
		puntAttempts: num(statRec, 'PUNTATTEMPTS'),
	};
}

async function loadPlayerSeasonStatTables(file) {
	const seasonStatsArrTables = file.tables.filter((t) => t.name === 'SeasonStats[]');
	for (const t of seasonStatsArrTables) {
		await t.readRecords();
	}
	const seasonStatsArrById = new Map(seasonStatsArrTables.map((t) => [t.header.tableId, t]));

	const offT = await readTable(file, 'SeasonOffensiveStats');
	const defT = await readTable(file, 'SeasonDefensiveStats');
	const kickT = await readTable(file, 'SeasonKickingStats');
	const tableById = new Map([
		[offT.header.tableId, { name: 'offense', table: offT, read: readOffenseStat }],
		[defT.header.tableId, { name: 'defense', table: defT, read: readDefenseStat }],
		[kickT.header.tableId, { name: 'kicking', table: kickT, read: readKickingStat }],
	]);

	return { seasonStatsArrById, tableById };
}

function collectPlayerSeasonStats(playerRec, seasonStatsArrById, tableById, { currentSeasonYear = null } = {}) {
	const arrRef = parseRef(safeField(playerRec, 'SeasonStats'));
	if (!arrRef) return [];
	const arrTable = seasonStatsArrById.get(arrRef.tableId);
	if (!arrTable) return [];
	const arrRec = arrTable.records[arrRef.row];
	if (!arrRec || arrRec.isEmpty) return [];

	const byYear = new Map();

	function ensureYear(seasYear) {
		const key = Number.isFinite(seasYear) ? seasYear : -1;
		if (!byYear.has(key)) {
			const isCurrent = key === 0 || (currentSeasonYear != null && key === currentSeasonYear);
			byYear.set(key, {
				seasonYear: key === 0 && currentSeasonYear != null ? currentSeasonYear : key,
				rawSeasonYear: key,
				isCurrent,
				gamesPlayed: 0,
				offense: null,
				defense: null,
				kicking: null,
			});
		}
		return byYear.get(key);
	}

	for (const field of Object.keys(arrRec._fields || {})) {
		const ref = parseRef(safeField(arrRec, field));
		if (!ref) continue;
		const meta = tableById.get(ref.tableId);
		if (!meta) continue;
		const statRec = meta.table.records[ref.row];
		if (!statRec || statRec.isEmpty) continue;
		const parsed = meta.read(statRec);
		const bucket = ensureYear(parsed.seasYear);
		bucket[meta.name] = parsed;
		bucket.gamesPlayed = Math.max(bucket.gamesPlayed, parsed.gamesPlayed || 0);
		if (parsed.seasYear === 0) bucket.isCurrent = true;
	}

	return [...byYear.values()]
		.filter((row) => row.offense || row.defense || row.kicking)
		.sort((a, b) => {
			if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
			return (b.seasonYear || 0) - (a.seasonYear || 0);
		});
}

function pickBestSeasonStat(statRecs, preferYear) {
	if (!statRecs.length) return null;
	if (preferYear != null) {
		const match = statRecs.find((s) => s.seasYear === preferYear);
		if (match) return match;
	}
	return [...statRecs].sort((a, b) => b.seasYear - a.seasYear || b.gamesPlayed - a.gamesPlayed)[0];
}

module.exports = {
	loadPlayerSeasonStatTables,
	collectPlayerSeasonStats,
	pickBestSeasonStat,
	readOffenseStat,
	readDefenseStat,
	readKickingStat,
};
