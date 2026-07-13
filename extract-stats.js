const { resolveInputPath,
	openSave,
	readTable,
	tableByName,
	safeField,
	parseRef,
	buildTeamLookup,
	writeJson,
	num,
	str,
	requireCliSavePath,
} = require('./lib/franchise');


function playerName(playerRec) {
	return {
		firstName: str(playerRec, 'FirstName') || str(playerRec, 'NameFirst'),
		lastName: str(playerRec, 'LastName') || str(playerRec, 'NameLast'),
		position: str(playerRec, 'Position'),
		overall: num(playerRec, 'OverallRating') || num(playerRec, 'Overall'),
		teamIndex: num(playerRec, 'TeamIndex', -1),
		playerRow: playerRec.index,
	};
}

function pickBestSeasonStat(statRecs, preferYear) {
	if (!statRecs.length) return null;
	if (preferYear != null) {
		const match = statRecs.find((s) => s.seasYear === preferYear);
		if (match) return match;
	}
	return statRecs.sort((a, b) => b.seasYear - a.seasYear || b.gamesPlayed - a.gamesPlayed)[0];
}

async function extractStats(savePath, { write = true } = {}) {
	const resolved = resolveInputPath(savePath);
	const file = await openSave(resolved);
	const playerT = tableByName(file, 'Player');
	await playerT.readRecords();
	const teamT = await readTable(file, 'Team');
	const teamLookup = buildTeamLookup(teamT);

	const seasonStatsArrTables = file.tables.filter((t) => t.name === 'SeasonStats[]');
	for (const t of seasonStatsArrTables) {
		await t.readRecords();
	}
	const seasonStatsArrById = new Map(seasonStatsArrTables.map((t) => [t.header.tableId, t]));

	const offT = await readTable(file, 'SeasonOffensiveStats');
	const defT = await readTable(file, 'SeasonDefensiveStats');
	const kickT = await readTable(file, 'SeasonKickingStats');
	const tableById = new Map([
		[offT.header.tableId, { name: 'offense', table: offT }],
		[defT.header.tableId, { name: 'defense', table: defT }],
		[kickT.header.tableId, { name: 'kicking', table: kickT }],
	]);

	const playerStats = [];
	const teamAgg = new Map();

	function ensureTeamAgg(teamIndex) {
		if (!teamAgg.has(teamIndex)) {
			const team = teamLookup.byTeamIndex.get(teamIndex);
			teamAgg.set(teamIndex, {
				teamIndex,
				row: team ? team.row : null,
				displayName: team ? team.displayName : `Team ${teamIndex}`,
				label: team ? team.label : `Team ${teamIndex}`,
				passYards: 0,
				passTds: 0,
				rushYards: 0,
				rushTds: 0,
				receiveYards: 0,
				receiveTds: 0,
				tackles: 0,
				sacks: 0,
				ints: 0,
				fgMade: 0,
				fgAttempts: 0,
			});
		}
		return teamAgg.get(teamIndex);
	}

	for (const playerRec of playerT.records) {
		if (!playerRec || playerRec.isEmpty) continue;
		const identity = playerName(playerRec);
		if (!identity.firstName && !identity.lastName) continue;
		if (identity.teamIndex < 0 || identity.teamIndex >= 255) continue;

		const arrRef = parseRef(safeField(playerRec, 'SeasonStats'));
		if (!arrRef) continue;
		const arrTable = seasonStatsArrById.get(arrRef.tableId);
		if (!arrTable) continue;
		const arrRec = arrTable.records[arrRef.row];
		if (!arrRec || arrRec.isEmpty) continue;

		const offenseCandidates = [];
		const defenseCandidates = [];
		const kickingCandidates = [];

		for (const field of Object.keys(arrRec._fields || {})) {
			const ref = parseRef(safeField(arrRec, field));
			if (!ref) continue;
			const meta = tableById.get(ref.tableId);
			if (!meta) continue;
			const statRec = meta.table.records[ref.row];
			if (!statRec || statRec.isEmpty) continue;

			if (meta.name === 'offense') {
				offenseCandidates.push({
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
				});
			} else if (meta.name === 'defense') {
				defenseCandidates.push({
					seasYear: num(statRec, 'SEAS_YEAR'),
					gamesPlayed: num(statRec, 'GAMESPLAYED'),
					tackles: num(statRec, 'DEFTACKLES'),
					sacks: num(statRec, 'DLINESACKS'),
					ints: num(statRec, 'DSECINTS'),
					tfl: num(statRec, 'DEFTACKLESFORLOSS'),
					deflections: num(statRec, 'DEFPASSDEFLECTIONS'),
					forcedFumbles: num(statRec, 'DLINEFORCEDFUMBLES'),
				});
			} else if (meta.name === 'kicking') {
				kickingCandidates.push({
					seasYear: num(statRec, 'SEAS_YEAR'),
					gamesPlayed: num(statRec, 'GAMESPLAYED'),
					fgMade: num(statRec, 'KICKFGMADE'),
					fgAttempts: num(statRec, 'KICKFGATTEMPTS'),
					fgLong: num(statRec, 'KICKFGLONGEST'),
					xpMade: num(statRec, 'KICKEPMADE'),
					xpAttempts: num(statRec, 'KICKEPATTEMPTS'),
					puntYards: num(statRec, 'PUNTYARDS'),
					puntAttempts: num(statRec, 'PUNTATTEMPTS'),
				});
			}
		}

		const offense = pickBestSeasonStat(offenseCandidates, 0) || pickBestSeasonStat(offenseCandidates);
		const defense = pickBestSeasonStat(defenseCandidates, 0) || pickBestSeasonStat(defenseCandidates);
		const kicking = pickBestSeasonStat(kickingCandidates, 0) || pickBestSeasonStat(kickingCandidates);

		if (!offense && !defense && !kicking) continue;

		const team = teamLookup.byTeamIndex.get(identity.teamIndex);
		const entry = {
			...identity,
			teamDisplayName: team ? team.displayName : '',
			teamLabel: team ? team.label : '',
			offense: offense || null,
			defense: defense || null,
			kicking: kicking || null,
		};
		playerStats.push(entry);

		const agg = ensureTeamAgg(identity.teamIndex);
		if (offense) {
			agg.passYards += offense.passYards;
			agg.passTds += offense.passTds;
			agg.rushYards += offense.rushYards;
			agg.rushTds += offense.rushTds;
			agg.receiveYards += offense.receiveYards;
			agg.receiveTds += offense.receiveTds;
		}
		if (defense) {
			agg.tackles += defense.tackles;
			agg.sacks += defense.sacks;
			agg.ints += defense.ints;
		}
		if (kicking) {
			agg.fgMade += kicking.fgMade;
			agg.fgAttempts += kicking.fgAttempts;
		}
	}

	function top(list, scoreFn, limit = 25) {
		return [...list]
			.filter((p) => scoreFn(p) > 0)
			.sort((a, b) => scoreFn(b) - scoreFn(a))
			.slice(0, limit)
			.map((p, idx) => ({
				rank: idx + 1,
				firstName: p.firstName,
				lastName: p.lastName,
				position: p.position,
				overall: p.overall,
				teamIndex: p.teamIndex,
				teamDisplayName: p.teamDisplayName,
				value: scoreFn(p),
				offense: p.offense,
				defense: p.defense,
				kicking: p.kicking,
			}));
	}

	const leaders = {
		passingYards: top(playerStats, (p) => (p.offense ? p.offense.passYards : 0)),
		passingTds: top(playerStats, (p) => (p.offense ? p.offense.passTds : 0)),
		rushingYards: top(playerStats, (p) => (p.offense ? p.offense.rushYards : 0)),
		rushingTds: top(playerStats, (p) => (p.offense ? p.offense.rushTds : 0)),
		receivingYards: top(playerStats, (p) => (p.offense ? p.offense.receiveYards : 0)),
		receivingTds: top(playerStats, (p) => (p.offense ? p.offense.receiveTds : 0)),
		receptions: top(playerStats, (p) => (p.offense ? p.offense.receiveCatches : 0)),
		tackles: top(playerStats, (p) => (p.defense ? p.defense.tackles : 0)),
		sacks: top(playerStats, (p) => (p.defense ? p.defense.sacks : 0)),
		interceptions: top(playerStats, (p) => (p.defense ? p.defense.ints : 0)),
		fieldGoals: top(playerStats, (p) => (p.kicking ? p.kicking.fgMade : 0)),
	};

	const teamTotals = [...teamAgg.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));

	const teamRankings = {
		passYards: [...teamTotals].sort((a, b) => b.passYards - a.passYards).slice(0, 25),
		rushYards: [...teamTotals].sort((a, b) => b.rushYards - a.rushYards).slice(0, 25),
		totalOffense: [...teamTotals]
			.map((t) => ({ ...t, totalYards: t.passYards + t.rushYards }))
			.sort((a, b) => b.totalYards - a.totalYards)
			.slice(0, 25),
		sacks: [...teamTotals].sort((a, b) => b.sacks - a.sacks).slice(0, 25),
		ints: [...teamTotals].sort((a, b) => b.ints - a.ints).slice(0, 25),
	};

	const payload = {
		generatedAt: new Date().toISOString(),
		savePath: resolved,
		playerCount: playerStats.length,
		leaders,
		teamTotals,
		teamRankings,
	};

	if (write) {
		payload.outPath = writeJson('stats.json', payload);
	}

	return payload;
}

async function main() {
	const args = process.argv.slice(2);
	const explicit = args.find((a) => !a.startsWith('--'));
	const summaryJson = args.includes('--summary-json');
	const noWrite = args.includes('--no-write');
	const savePath = explicit ? resolveInputPath(explicit) : requireCliSavePath(args, 'extract-stats.js');

	const payload = await extractStats(savePath, { write: !noWrite });
	if (summaryJson) {
		console.log(
			JSON.stringify({
				ok: true,
				savePath: payload.savePath,
				playerCount: payload.playerCount,
				topPasser: payload.leaders.passingYards[0]
					? `${payload.leaders.passingYards[0].firstName} ${payload.leaders.passingYards[0].lastName}`
					: null,
				outPath: payload.outPath || null,
			})
		);
		return;
	}

	console.log(`Wrote stats: ${payload.outPath} (${payload.playerCount} players)`);
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	});
}

module.exports = { extractStats };
