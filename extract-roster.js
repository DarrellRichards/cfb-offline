const {
	resolveInputPath,
	openSave,
	readTable,
	tableByName,
	safeField,
	parseRef,
	teamIdentity,
	writeJson,
	num,
	str,
	requireCliSavePath,
} = require('./lib/franchise');
const {
	resolvePhysicalAbilityEntries,
	resolveArchetypeLabel,
} = require('./lib/physical-abilities');
const {
	loadPlayerSeasonStatTables,
	collectPlayerSeasonStats,
} = require('./lib/player-season-stats');

function playerName(playerRec) {
	return {
		firstName: str(playerRec, 'FirstName') || str(playerRec, 'NameFirst') || str(playerRec, 'PLYR_FIRSTNAME'),
		lastName: str(playerRec, 'LastName') || str(playerRec, 'NameLast') || str(playerRec, 'PLYR_LASTNAME'),
	};
}

function getPosition(playerRec) {
	for (const field of ['Position', 'PositionAbbreviation', 'Pos', 'PLYR_POSITION']) {
		const value = str(playerRec, field);
		if (value) return value;
	}
	return '';
}

function getOverall(playerRec) {
	for (const field of ['OverallRating', 'Overall', 'OVR', 'PlayerOverall']) {
		const value = num(playerRec, field, NaN);
		if (Number.isFinite(value)) return Math.trunc(value);
	}
	return null;
}

function getJersey(playerRec) {
	for (const field of ['JerseyNum', 'JerseyNumber', 'Jersey']) {
		const value = num(playerRec, field, NaN);
		if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
	}
	return null;
}

function collectRatings(playerRec) {
	const out = {};
	if (!playerRec || playerRec.isEmpty || !playerRec._fields) return out;
	for (const key of Object.keys(playerRec._fields)) {
		if (!/Rating$/i.test(key) && key !== 'OverallRating') continue;
		const value = Number(safeField(playerRec, key));
		if (!Number.isFinite(value)) continue;
		out[key] = Math.trunc(value);
	}
	return out;
}

function buildPlayerPayload(playerRec, team, seasonStatTables, currentSeasonYear) {
	const name = playerName(playerRec);
	if (!name.firstName && !name.lastName) return null;

	const playerType = str(playerRec, 'PlayerType');
	const abilityEntries = resolvePhysicalAbilityEntries(playerRec, playerType);
	const physicalAbilities = abilityEntries
		.map((entry) => entry.label || entry.name)
		.filter(Boolean)
		.join(', ');
	const seasons = seasonStatTables
		? collectPlayerSeasonStats(playerRec, seasonStatTables.seasonStatsArrById, seasonStatTables.tableById, {
				currentSeasonYear,
			})
		: [];

	return {
		playerRow: playerRec.index,
		teamIndex: team.teamIndex,
		teamDisplayName: team.displayName,
		teamLabel: team.label,
		firstName: name.firstName,
		lastName: name.lastName,
		position: getPosition(playerRec),
		overall: getOverall(playerRec),
		jersey: getJersey(playerRec),
		schoolYear: str(playerRec, 'SchoolYear') || str(playerRec, 'PlayerClassDisplayName'),
		redshirtStatus: str(playerRec, 'RedshirtStatus'),
		height: (() => {
			const value = num(playerRec, 'Height', NaN);
			return Number.isFinite(value) ? Math.trunc(value) : null;
		})(),
		weight: (() => {
			const value = num(playerRec, 'Weight', NaN);
			return Number.isFinite(value) ? Math.trunc(value) : null;
		})(),
		yearsPlayed: (() => {
			const value = num(playerRec, 'YearsPlayed', NaN);
			return Number.isFinite(value) ? Math.trunc(value) : null;
		})(),
		playerType,
		archetypeLabel: resolveArchetypeLabel(playerType),
		devTrait: str(playerRec, 'TraitDevelopment'),
		physicalAbilities,
		physicalAbilityEntries: abilityEntries,
		ratings: collectRatings(playerRec),
		seasons,
	};
}

async function playersFromRoster(file, teamRec, team, playerT, seasonStatTables, currentSeasonYear) {
	const rosterRef = parseRef(safeField(teamRec, 'Roster'));
	if (!rosterRef) return [];

	const rosterTable = file.tables.find((t) => t.header.tableId === rosterRef.tableId);
	if (!rosterTable) return [];

	await rosterTable.readRecords();
	const rosterRec = rosterTable.records[rosterRef.row];
	if (!rosterRec || rosterRec.isEmpty) return [];

	const players = [];
	const seen = new Set();
	for (const field of Object.keys(rosterRec._fields || {})) {
		const ref = parseRef(safeField(rosterRec, field));
		if (!ref || ref.tableId !== playerT.header.tableId) continue;
		if (seen.has(ref.row)) continue;
		seen.add(ref.row);

		const playerRec = playerT.records[ref.row];
		if (!playerRec || playerRec.isEmpty) continue;
		const payload = buildPlayerPayload(playerRec, team, seasonStatTables, currentSeasonYear);
		if (payload) players.push(payload);
	}
	return players;
}

function playersFromTeamIndex(playerT, team, claimedRows, seasonStatTables, currentSeasonYear) {
	const players = [];
	for (const playerRec of playerT.records) {
		if (!playerRec || playerRec.isEmpty) continue;
		if (claimedRows.has(playerRec.index)) continue;
		const teamIndex = num(playerRec, 'TeamIndex', -1);
		if (teamIndex !== team.teamIndex) continue;
		const payload = buildPlayerPayload(playerRec, team, seasonStatTables, currentSeasonYear);
		if (payload) players.push(payload);
	}
	return players;
}

function sortPlayers(players) {
	return players.sort((a, b) => {
		const pos = String(a.position || '').localeCompare(String(b.position || ''));
		if (pos !== 0) return pos;
		const ovr = (b.overall || 0) - (a.overall || 0);
		if (ovr !== 0) return ovr;
		return String(a.lastName || '').localeCompare(String(b.lastName || ''));
	});
}

async function extractRoster(savePath, { write = true } = {}) {
	const resolved = resolveInputPath(savePath);
	const file = await openSave(resolved);
	const teamT = await readTable(file, 'Team');
	const playerT = tableByName(file, 'Player');
	await playerT.readRecords();
	const seasonStatTables = await loadPlayerSeasonStatTables(file);

	let currentSeasonYear = null;
	try {
		const seasonInfoT = await readTable(file, 'SeasonInfo');
		const seasonRec = seasonInfoT.records.find((rec) => rec && !rec.isEmpty);
		if (seasonRec) {
			const year = num(seasonRec, 'CurrentSeasonYear', NaN) || num(seasonRec, 'SeasonYear', NaN);
			if (Number.isFinite(year) && year > 0) currentSeasonYear = Math.trunc(year);
		}
	} catch {
		currentSeasonYear = null;
	}

	const players = [];
	const teams = [];

	for (const teamRec of teamT.records) {
		if (!teamRec || teamRec.isEmpty) continue;
		const identity = teamIdentity(teamRec, teamRec.index);
		if (!identity.displayName) continue;
		if (/^FCS\b/i.test(identity.displayName) || /^FCS\b/i.test(identity.label || '')) continue;

		const fromRoster = await playersFromRoster(
			file,
			teamRec,
			identity,
			playerT,
			seasonStatTables,
			currentSeasonYear
		);
		const claimed = new Set(fromRoster.map((p) => p.playerRow));
		const extras = playersFromTeamIndex(
			playerT,
			identity,
			claimed,
			seasonStatTables,
			currentSeasonYear
		);
		const teamPlayers = sortPlayers([...fromRoster, ...extras]);

		teams.push({
			teamIndex: identity.teamIndex,
			displayName: identity.displayName,
			label: identity.label,
			playerCount: teamPlayers.length,
		});
		players.push(...teamPlayers);
	}

	players.sort((a, b) => {
		const team = String(a.teamDisplayName || '').localeCompare(String(b.teamDisplayName || ''));
		if (team !== 0) return team;
		const pos = String(a.position || '').localeCompare(String(b.position || ''));
		if (pos !== 0) return pos;
		return (b.overall || 0) - (a.overall || 0);
	});

	const payload = {
		generatedAt: new Date().toISOString(),
		savePath: resolved,
		currentSeasonYear,
		teamCount: teams.length,
		playerCount: players.length,
		teams,
		players,
	};

	if (write) {
		payload.outPath = writeJson('roster.json', payload);
	}

	return payload;
}

async function main() {
	const args = process.argv.slice(2);
	const explicit = args.find((a) => !a.startsWith('--'));
	const summaryJson = args.includes('--summary-json');
	const noWrite = args.includes('--no-write');
	const savePath = explicit ? resolveInputPath(explicit) : requireCliSavePath(args, 'extract-roster.js');

	const payload = await extractRoster(savePath, { write: !noWrite });
	if (summaryJson) {
		console.log(
			JSON.stringify({
				ok: true,
				savePath: payload.savePath,
				teamCount: payload.teamCount,
				playerCount: payload.playerCount,
				currentSeasonYear: payload.currentSeasonYear,
				outPath: payload.outPath || null,
			})
		);
		return;
	}

	console.log(`Wrote roster: ${payload.outPath} (${payload.playerCount} players across ${payload.teamCount} teams)`);
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	});
}

module.exports = { extractRoster };
