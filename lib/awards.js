const {
	safeField,
	parseRef,
	num,
	str,
	teamIdentity,
	resolveTeamFromRef,
} = require('./franchise');

const WEEKLY_AWARD_TYPES = new Set([
	'Offensive_Player_of_Week',
	'Defensive_Player_of_Week',
	'Offensive_Player_of_Week_Conf',
	'Defensive_Player_of_Week_Conf',
]);

const PRESEASON_ALL_AM_TYPES = new Set([
	'ALL_AM_1ST_PRE',
	'ALL_AM_2ND_PRE',
	'ALL_AM_1ST_PRE_CONF',
	'ALL_AM_2ND_PRE_CONF',
]);

function humanizeAwardType(raw) {
	const value = String(raw || '').trim();
	if (!value) return 'Award';
	const map = {
		HEISMAN: 'Heisman Trophy',
		BEST_QB: 'Best Quarterback',
		BEST_RB: 'Best Running Back',
		BEST_WR: 'Best Wide Receiver',
		BEST_TE: 'Best Tight End',
		BEST_OL: 'Best Offensive Lineman',
		BEST_DL: 'Best Defensive Lineman',
		BEST_LB: 'Best Linebacker',
		BEST_DB: 'Best Defensive Back',
		BEST_K: 'Best Kicker',
		BEST_P: 'Best Punter',
		BEST_ATH: 'Best Athlete',
		BEST_PLAYER: 'Best Player',
		BEST_POTY: 'Player of the Year',
		BEST_COACH: 'Coach of the Year',
		BEST_ACADEMIC: 'Academic Award',
		Offensive_Player_of_Week: 'Offensive Player of the Week',
		Defensive_Player_of_Week: 'Defensive Player of the Week',
		Offensive_Player_of_Week_Conf: 'Conference Offensive POW',
		Defensive_Player_of_Week_Conf: 'Conference Defensive POW',
		ALL_AM_1ST_PRE: 'Preseason All-American (1st)',
		ALL_AM_2ND_PRE: 'Preseason All-American (2nd)',
		ALL_AM_1ST_PRE_CONF: 'Preseason All-Conference (1st)',
		ALL_AM_2ND_PRE_CONF: 'Preseason All-Conference (2nd)',
		ALL_AM_1ST: 'All-American (1st)',
		ALL_AM_2ND: 'All-American (2nd)',
		ALL_AM_1ST_CONF: 'All-Conference (1st)',
		ALL_AM_2ND_CONF: 'All-Conference (2nd)',
	};
	if (map[value]) return map[value];
	return value
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (ch) => ch.toUpperCase())
		.trim();
}

function isWeeklyAwardType(awardType) {
	return WEEKLY_AWARD_TYPES.has(String(awardType || '')) || /player_of_week/i.test(String(awardType || ''));
}

function isPreseasonAllAmType(awardType) {
	return PRESEASON_ALL_AM_TYPES.has(String(awardType || '')) || /_PRE(_|$)/i.test(String(awardType || ''));
}

function resolveSeasonYear(periodIndex, baseCalendarYear, currentSeasonYear) {
	const idx = Number(periodIndex);
	if (!Number.isFinite(idx)) return currentSeasonYear || baseCalendarYear || null;
	if (idx >= 2000) return idx;
	const base = Number(baseCalendarYear) || Number(currentSeasonYear) || 0;
	if (!base) return idx;
	return base + idx;
}

function playerNameFromRec(playerRec) {
	if (!playerRec || playerRec.isEmpty) return null;
	const firstName = str(playerRec, 'FirstName') || str(playerRec, 'NameFirst');
	const lastName = str(playerRec, 'LastName') || str(playerRec, 'NameLast');
	const position = str(playerRec, 'Position');
	const teamIndex = num(playerRec, 'TeamIndex', -1);
	const overall = num(playerRec, 'OverallRating') || num(playerRec, 'Overall');
	if (!firstName && !lastName) return null;
	return { firstName, lastName, position, teamIndex, overall };
}

function coachNameFromRec(coachRec) {
	if (!coachRec || coachRec.isEmpty) return null;
	const firstName = str(coachRec, 'FirstName') || str(coachRec, 'NameFirst');
	const lastName = str(coachRec, 'LastName') || str(coachRec, 'NameLast');
	if (!firstName && !lastName) return null;
	return { firstName, lastName };
}

function resolveConferenceName(ref, conferenceT) {
	if (!ref || !conferenceT) return null;
	const rec = conferenceT.records[ref.row];
	if (!rec || rec.isEmpty) return null;
	return str(rec, 'Name') || str(rec, 'ConferenceEnum') || null;
}

function compactTeam(identity) {
	if (!identity) return null;
	return {
		teamIndex: identity.teamIndex,
		displayName: identity.displayName,
		label: identity.label,
	};
}

async function loadTableMaps(file, names) {
	const byName = new Map();
	for (const name of names) {
		const tables = file.tables.filter((t) => t.name === name);
		for (const table of tables) {
			await table.readRecords();
		}
		byName.set(name, tables);
	}
	return byName;
}

function tableById(file, tableId) {
	return file.tables.find((t) => t.header.tableId === tableId) || null;
}

async function ensureTableRecords(table) {
	if (!table) return null;
	if (!table.recordsRead) await table.readRecords();
	return table;
}

function readFilledArraySlots(arrRec) {
	if (!arrRec || arrRec.isEmpty) return [];
	const slots = [];
	for (const field of Object.keys(arrRec._fields || {})) {
		const ref = parseRef(safeField(arrRec, field));
		if (!ref) continue;
		slots.push({ field, ref });
	}
	return slots;
}

async function extractYearSummaries(file, { baseCalendarYear, currentSeasonYear, teamLookup, teamT }) {
	const nationalChampions = [];
	const conferenceChampions = [];
	const annualAwards = [];

	const managers = file.tables.filter((t) => t.name === 'LeagueHistoryManager');
	for (const mgrT of managers) await mgrT.readRecords();
	const mgrRec =
		managers
			.flatMap((t) => t.records)
			.find((r) => r && !r.isEmpty) || null;
	if (!mgrRec) {
		return { nationalChampions, conferenceChampions, annualAwards };
	}

	const historyRef = parseRef(safeField(mgrRec, 'LeagueHistory'));
	const historyArrTable = historyRef ? await ensureTableRecords(tableById(file, historyRef.tableId)) : null;
	const historyArrRec = historyArrTable ? historyArrTable.records[historyRef.row] : null;
	if (!historyArrRec || historyArrRec.isEmpty) {
		return { nationalChampions, conferenceChampions, annualAwards };
	}

	for (const { field, ref } of readFilledArraySlots(historyArrRec)) {
		const ysTable = await ensureTableRecords(tableById(file, ref.tableId));
		const ys = ysTable ? ysTable.records[ref.row] : null;
		if (!ys || ys.isEmpty) continue;

		const periodIndex = num(ys, 'PeriodIndex');
		const seasonYear = resolveSeasonYear(periodIndex, baseCalendarYear, currentSeasonYear);
		const winningScore = num(ys, 'WinningTeamScore');
		const losingScore = num(ys, 'LosingTeamScore');
		const winningWins = num(ys, 'WinningTeamWins');
		const winningIdentity = resolveTeamFromRef(parseRef(safeField(ys, 'WinningTeamIdentity')), teamLookup, teamT);
		const losingIdentity = resolveTeamFromRef(parseRef(safeField(ys, 'LosingTeamIdentity')), teamLookup, teamT);
		const winningName =
			(winningIdentity && winningIdentity.displayName) ||
			str(ys, 'WinningTeamDisplayName') ||
			str(ys, 'WinningTeamName');
		const losingName =
			(losingIdentity && losingIdentity.displayName) ||
			str(ys, 'LosingTeamDisplayName') ||
			str(ys, 'LosingTeamName');
		const hasChampion = Boolean(winningName) || winningScore > 0 || winningWins > 0;

		if (hasChampion) {
			nationalChampions.push({
				seasonYear,
				periodIndex,
				slot: field,
				champion: {
					teamIndex: winningIdentity ? winningIdentity.teamIndex : null,
					displayName: winningName || 'Unknown',
					rank: num(ys, 'WinningTeamRank'),
					score: winningScore,
					wins: winningWins,
					losses: num(ys, 'WinningTeamLosses'),
					coachFirstName: str(ys, 'WinningCoachFirstName'),
					coachLastName: str(ys, 'WinningCoachLastName'),
				},
				runnerUp: {
					teamIndex: losingIdentity ? losingIdentity.teamIndex : null,
					displayName: losingName || 'Unknown',
					rank: num(ys, 'LosingTeamRank'),
					score: losingScore,
					wins: num(ys, 'LosingTeamWins'),
					losses: num(ys, 'LosingTeamLosses'),
					coachFirstName: str(ys, 'LosingCoachFirstName'),
					coachLastName: str(ys, 'LosingCoachLastName'),
				},
			});
		}

		const awardsArrRef = parseRef(safeField(ys, 'AnnualAwards'));
		const awardsArrTable = awardsArrRef ? await ensureTableRecords(tableById(file, awardsArrRef.tableId)) : null;
		const awardsArrRec = awardsArrTable ? awardsArrTable.records[awardsArrRef.row] : null;
		for (const slot of readFilledArraySlots(awardsArrRec)) {
			const awardTable = await ensureTableRecords(tableById(file, slot.ref.tableId));
			const awardRec = awardTable ? awardTable.records[slot.ref.row] : null;
			if (!awardRec || awardRec.isEmpty) continue;
			const awardType = str(awardRec, 'AwardType');
			if (!awardType) continue;
			const teamRef = parseRef(safeField(awardRec, 'TeamIdentity'));
			const team = resolveTeamFromRef(teamRef, teamLookup, teamT);
			annualAwards.push({
				seasonYear,
				periodIndex,
				awardType,
				awardLabel: humanizeAwardType(awardType),
				firstName: str(awardRec, 'firstName') || str(awardRec, 'FirstName'),
				lastName: str(awardRec, 'lastName') || str(awardRec, 'LastName'),
				position: str(awardRec, 'Position'),
				teamDisplayName:
					str(awardRec, 'TeamDisplayName') || (team ? team.displayName : ''),
				teamIndex: team ? team.teamIndex : null,
			});
		}

		const confArrRef = parseRef(safeField(ys, 'ConferenceChampions'));
		const confArrTable = confArrRef ? await ensureTableRecords(tableById(file, confArrRef.tableId)) : null;
		const confArrRec = confArrTable ? confArrTable.records[confArrRef.row] : null;
		for (const slot of readFilledArraySlots(confArrRec)) {
			const champTable = await ensureTableRecords(tableById(file, slot.ref.tableId));
			const champRec = champTable ? champTable.records[slot.ref.row] : null;
			if (!champRec || champRec.isEmpty) continue;
			const winningTeamName = str(champRec, 'WinningTeamName');
			const conferenceName = str(champRec, 'ConferenceName');
			if (!winningTeamName && !conferenceName) continue;
			const winTeam = resolveTeamFromRef(
				parseRef(safeField(champRec, 'WinningTeamIdentity')),
				teamLookup,
				teamT
			);
			const loseTeam = resolveTeamFromRef(
				parseRef(safeField(champRec, 'LosingTeamIdentity')),
				teamLookup,
				teamT
			);
			conferenceChampions.push({
				seasonYear,
				periodIndex,
				conferenceName,
				champion: {
					teamIndex: winTeam ? winTeam.teamIndex : null,
					displayName: winningTeamName || (winTeam ? winTeam.displayName : 'Unknown'),
					rank: num(champRec, 'WinningTeamRank'),
					score: num(champRec, 'WinningTeamScore'),
					wins: num(champRec, 'WinningTeamWins'),
					losses: num(champRec, 'WinningTeamLosses'),
					ties: num(champRec, 'WinningTeamTies'),
					coachFirstName: str(champRec, 'WinningCoachFirstName'),
					coachLastName: str(champRec, 'WinningCoachLastName'),
				},
				runnerUp: {
					teamIndex: loseTeam ? loseTeam.teamIndex : null,
					displayName: str(champRec, 'LosingTeamName') || (loseTeam ? loseTeam.displayName : ''),
					rank: num(champRec, 'LosingTeamRank'),
					score: num(champRec, 'LosingTeamScore'),
					wins: num(champRec, 'LosingTeamWins'),
					losses: num(champRec, 'LosingTeamLosses'),
					ties: num(champRec, 'LosingTeamTies'),
				},
			});
		}
	}

	nationalChampions.sort((a, b) => (b.seasonYear || 0) - (a.seasonYear || 0));
	conferenceChampions.sort((a, b) => {
		if ((b.seasonYear || 0) !== (a.seasonYear || 0)) return (b.seasonYear || 0) - (a.seasonYear || 0);
		return String(a.conferenceName || '').localeCompare(String(b.conferenceName || ''));
	});
	annualAwards.sort((a, b) => {
		if ((b.seasonYear || 0) !== (a.seasonYear || 0)) return (b.seasonYear || 0) - (a.seasonYear || 0);
		return String(a.awardLabel || '').localeCompare(String(b.awardLabel || ''));
	});

	return { nationalChampions, conferenceChampions, annualAwards };
}

function extractHeismanRace(heismanT, playerT, teamLookup, teamT) {
	const rows = [];
	if (!heismanT) return rows;
	for (const rec of heismanT.records) {
		if (!rec || rec.isEmpty) continue;
		const playerRef = parseRef(safeField(rec, 'Player'));
		const teamRef = parseRef(safeField(rec, 'Team'));
		const playerRec = playerRef && playerT ? playerT.records[playerRef.row] : null;
		const player = playerNameFromRec(playerRec);
		const team = resolveTeamFromRef(teamRef, teamLookup, teamT);
		if (!player && !team) continue;
		const currentRank = num(rec, 'CurrentRank');
		rows.push({
			rank: currentRank + 1,
			currentRank,
			lastWeekRank: num(rec, 'LastWeekRank'),
			firstName: player ? player.firstName : '',
			lastName: player ? player.lastName : '',
			position: player ? player.position : '',
			overall: player ? player.overall : 0,
			teamIndex: team ? team.teamIndex : player ? player.teamIndex : null,
			teamDisplayName: team ? team.displayName : '',
		});
	}
	rows.sort((a, b) => a.currentRank - b.currentRank);
	return rows;
}

function extractPlayerAwards(playerAwardT, playerT, teamLookup, teamT, conferenceT) {
	const weeklyAwards = [];
	const preseasonAllAmericans = [];
	const otherSeasonAwards = [];

	if (!playerAwardT) {
		return { weeklyAwards, preseasonAllAmericans, otherSeasonAwards };
	}

	for (const rec of playerAwardT.records) {
		if (!rec || rec.isEmpty) continue;
		const awardType = str(rec, 'AwardType');
		if (!awardType) continue;
		const playerRef = parseRef(safeField(rec, 'Player'));
		const teamRef = parseRef(safeField(rec, 'Team'));
		const confRef = parseRef(safeField(rec, 'Conference'));
		const playerRec = playerRef && playerT ? playerT.records[playerRef.row] : null;
		const player = playerNameFromRec(playerRec);
		const team = resolveTeamFromRef(teamRef, teamLookup, teamT);
		const positionRaw = str(rec, 'Position');
		const position =
			positionRaw && !/^invalid/i.test(positionRaw)
				? positionRaw
				: player
					? player.position
					: '';

		const entry = {
			awardType,
			awardLabel: humanizeAwardType(awardType),
			period: str(rec, 'Period'),
			periodIndex: num(rec, 'PeriodIndex'),
			awardScore: num(rec, 'AwardScore'),
			position,
			firstName: player ? player.firstName : '',
			lastName: player ? player.lastName : '',
			teamIndex: team ? team.teamIndex : player ? player.teamIndex : null,
			teamDisplayName: team ? team.displayName : '',
			conferenceName: resolveConferenceName(confRef, conferenceT),
		};

		if (!entry.firstName && !entry.lastName) continue;

		if (isWeeklyAwardType(awardType)) {
			weeklyAwards.push(entry);
		} else if (isPreseasonAllAmType(awardType)) {
			preseasonAllAmericans.push(entry);
		} else {
			otherSeasonAwards.push(entry);
		}
	}

	weeklyAwards.sort((a, b) => {
		if (a.periodIndex !== b.periodIndex) return b.periodIndex - a.periodIndex;
		return String(a.awardLabel).localeCompare(String(b.awardLabel));
	});
	preseasonAllAmericans.sort((a, b) => {
		const a1 = /1ST/i.test(a.awardType) ? 0 : 1;
		const b1 = /1ST/i.test(b.awardType) ? 0 : 1;
		if (a1 !== b1) return a1 - b1;
		return String(a.position).localeCompare(String(b.position));
	});

	return { weeklyAwards, preseasonAllAmericans, otherSeasonAwards };
}

function extractCoachAwards(coachAwardT, coachT, teamLookup, teamT) {
	const rows = [];
	if (!coachAwardT) return rows;
	for (const rec of coachAwardT.records) {
		if (!rec || rec.isEmpty) continue;
		const awardType = str(rec, 'AwardType');
		if (!awardType) continue;
		const coachRef = parseRef(safeField(rec, 'Coach'));
		const teamRef = parseRef(safeField(rec, 'Team'));
		const coachRec = coachRef && coachT ? coachT.records[coachRef.row] : null;
		const coach = coachNameFromRec(coachRec);
		const team = resolveTeamFromRef(teamRef, teamLookup, teamT);
		if (!coach && !team) continue;
		rows.push({
			awardType,
			awardLabel: humanizeAwardType(awardType),
			period: str(rec, 'Period'),
			periodIndex: num(rec, 'PeriodIndex'),
			firstName: coach ? coach.firstName : '',
			lastName: coach ? coach.lastName : '',
			teamIndex: team ? team.teamIndex : null,
			teamDisplayName: team ? team.displayName : '',
		});
	}
	return rows;
}

module.exports = {
	humanizeAwardType,
	isWeeklyAwardType,
	isPreseasonAllAmType,
	resolveSeasonYear,
	compactTeam,
	loadTableMaps,
	extractYearSummaries,
	extractHeismanRace,
	extractPlayerAwards,
	extractCoachAwards,
};
