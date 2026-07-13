const {
	resolveInputPath,
	openSave,
	readTable,
	tableByName,
	buildTeamLookup,
	writeJson,
	num,
	str,
	requireCliSavePath,
} = require('./lib/franchise');
const {
	extractYearSummaries,
	extractHeismanRace,
	extractPlayerAwards,
	extractCoachAwards,
} = require('./lib/awards');

async function extractAwards(savePath, { write = true } = {}) {
	const resolved = resolveInputPath(savePath);
	const file = await openSave(resolved);

	const seasonInfoT = await readTable(file, 'SeasonInfo');
	const seasonInfo = seasonInfoT.records.find((r) => r && !r.isEmpty) || seasonInfoT.records[0];
	const currentSeasonYear = num(seasonInfo, 'CurrentSeasonYear');
	const baseCalendarYear = num(seasonInfo, 'BaseCalendarYear') || currentSeasonYear;
	const currentWeek = num(seasonInfo, 'CurrentWeek');
	const currentWeekType = str(seasonInfo, 'CurrentWeekType');

	const teamT = await readTable(file, 'Team');
	const teamLookup = buildTeamLookup(teamT);
	const playerT = await readTable(file, 'Player');
	const coachT = await readTable(file, 'Coach');
	const conferenceT = await readTable(file, 'Conference');

	let heismanT = null;
	let playerAwardT = null;
	let coachAwardT = null;
	try {
		heismanT = tableByName(file, 'HeismanAwardRanking');
		await heismanT.readRecords();
	} catch {
		heismanT = null;
	}
	try {
		playerAwardT = tableByName(file, 'PlayerAward');
		await playerAwardT.readRecords();
	} catch {
		playerAwardT = null;
	}
	try {
		coachAwardT = tableByName(file, 'CoachAward');
		await coachAwardT.readRecords();
	} catch {
		coachAwardT = null;
	}

	const history = await extractYearSummaries(file, {
		baseCalendarYear,
		currentSeasonYear,
		teamLookup,
		teamT,
	});
	const heismanRace = extractHeismanRace(heismanT, playerT, teamLookup, teamT);
	const liveAwards = extractPlayerAwards(playerAwardT, playerT, teamLookup, teamT, conferenceT);
	const coachAwards = extractCoachAwards(coachAwardT, coachT, teamLookup, teamT);

	const seasonYears = new Set();
	for (const row of history.nationalChampions) if (row.seasonYear) seasonYears.add(row.seasonYear);
	for (const row of history.conferenceChampions) if (row.seasonYear) seasonYears.add(row.seasonYear);
	for (const row of history.annualAwards) if (row.seasonYear) seasonYears.add(row.seasonYear);
	if (currentSeasonYear) seasonYears.add(currentSeasonYear);

	const payload = {
		generatedAt: new Date().toISOString(),
		savePath: resolved,
		seasonYear: currentSeasonYear,
		baseCalendarYear,
		currentWeek,
		currentWeekType,
		seasonYears: [...seasonYears].sort((a, b) => b - a),
		nationalChampions: history.nationalChampions,
		conferenceChampions: history.conferenceChampions,
		annualAwards: history.annualAwards,
		coachAwards,
		current: {
			heismanRace,
			weeklyAwards: liveAwards.weeklyAwards,
			preseasonAllAmericans: liveAwards.preseasonAllAmericans,
			otherSeasonAwards: liveAwards.otherSeasonAwards,
		},
		counts: {
			nationalChampions: history.nationalChampions.length,
			conferenceChampions: history.conferenceChampions.length,
			annualAwards: history.annualAwards.length,
			coachAwards: coachAwards.length,
			heismanRace: heismanRace.length,
			weeklyAwards: liveAwards.weeklyAwards.length,
			preseasonAllAmericans: liveAwards.preseasonAllAmericans.length,
		},
	};

	if (write) {
		payload.outPath = writeJson('awards.json', payload);
	}

	return payload;
}

async function main() {
	const args = process.argv.slice(2);
	const explicit = args.find((a) => !a.startsWith('--'));
	const summaryJson = args.includes('--summary-json');
	const noWrite = args.includes('--no-write');
	const savePath = explicit ? resolveInputPath(explicit) : requireCliSavePath(args, 'extract-awards.js');

	const payload = await extractAwards(savePath, { write: !noWrite });
	if (summaryJson) {
		console.log(
			JSON.stringify({
				ok: true,
				savePath: payload.savePath,
				seasonYear: payload.seasonYear,
				counts: payload.counts,
				outPath: payload.outPath || null,
			})
		);
		return;
	}

	console.log(
		`Wrote awards: ${payload.outPath} (NC ${payload.counts.nationalChampions}, weekly ${payload.counts.weeklyAwards}, Heisman race ${payload.counts.heismanRace})`
	);
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	});
}

module.exports = { extractAwards };
