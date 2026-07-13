const { resolveInputPath,
	openSave,
	readTable,
	safeField,
	parseRef,
	buildTeamLookup,
	resolveTeamFromRef,
	writeJson,
	num,
	str,
	bool,
	requireCliSavePath,
} = require('./lib/franchise');


function gameStatusIsFinal(status) {
	const s = String(status || '').toLowerCase();
	return s.includes('won') || s.includes('tie') || s === 'final' || s.includes('complete');
}

async function extractSchedule(savePath, { write = true } = {}) {
	const resolved = resolveInputPath(savePath);
	const file = await openSave(resolved);
	const teamT = await readTable(file, 'Team');
	const seasonGameT = await readTable(file, 'SeasonGame');
	const seasonInfoT = await readTable(file, 'SeasonInfo');
	const seasonInfo = seasonInfoT.records.find((r) => r && !r.isEmpty) || seasonInfoT.records[0];
	const teamLookup = buildTeamLookup(teamT);

	const games = [];
	for (const rec of seasonGameT.records) {
		if (!rec || rec.isEmpty) continue;
		if (bool(rec, 'IsPractice')) continue;

		const homeRef = parseRef(safeField(rec, 'HomeTeam'));
		const awayRef = parseRef(safeField(rec, 'AwayTeam'));
		const home = resolveTeamFromRef(homeRef, teamLookup, teamT);
		const away = resolveTeamFromRef(awayRef, teamLookup, teamT);
		if (!home && !away) continue;

		const gameStatus = str(rec, 'GameStatus');
		const homeScore = num(rec, 'HomeScore');
		const awayScore = num(rec, 'AwayScore');
		const isFinal = gameStatusIsFinal(gameStatus) || (homeScore > 0 || awayScore > 0) && str(rec, 'HomeTeamStatus') !== 'Pending';

		games.push({
			row: rec.index,
			seasonYear: num(rec, 'SeasonYear'),
			seasonWeek: num(rec, 'SeasonWeek'),
			seasonWeekType: str(rec, 'SeasonWeekType'),
			seasonGameNum: num(rec, 'SeasonGameNum'),
			dayOfWeek: str(rec, 'DayOfWeek'),
			gameDateMonth: num(rec, 'GameDateMonth'),
			gameDateDay: num(rec, 'GameDateDay'),
			home: home
				? {
						row: home.row,
						teamIndex: home.teamIndex,
						displayName: home.displayName,
						nickname: home.nickname,
						label: home.label,
				  }
				: null,
			away: away
				? {
						row: away.row,
						teamIndex: away.teamIndex,
						displayName: away.displayName,
						nickname: away.nickname,
						label: away.label,
				  }
				: null,
			homeScore,
			awayScore,
			homeScoreOT: num(rec, 'HomeScoreOT'),
			awayScoreOT: num(rec, 'AwayScoreOT'),
			quarters: {
				home: [
					num(rec, 'HomeScoreQuarter1'),
					num(rec, 'HomeScoreQuarter2'),
					num(rec, 'HomeScoreQuarter3'),
					num(rec, 'HomeScoreQuarter4'),
				],
				away: [
					num(rec, 'AwayScoreQuarter1'),
					num(rec, 'AwayScoreQuarter2'),
					num(rec, 'AwayScoreQuarter3'),
					num(rec, 'AwayScoreQuarter4'),
				],
			},
			gameStatus,
			isFinal,
			isOvertimeGame: bool(rec, 'IsOvertimeGame'),
			isGameOfTheWeek: bool(rec, 'IsGameOfTheWeek'),
			isWorstOfTheWeek: bool(rec, 'IsWorstOfTheWeek'),
			gameOfTheWeekScore: num(rec, 'GameOfTheWeekScore'),
			isSimmed: bool(rec, 'IsSimmed'),
			isKickoffGame: bool(rec, 'IsKickoffGame'),
			isChallengeGame: bool(rec, 'IsChallengeGame'),
			attendance: num(rec, 'Attendance'),
			broadcastNetwork: str(rec, 'BroadcastNetwork'),
			weather: str(rec, 'Weather'),
			temperature: num(rec, 'Temperature'),
			timeOfDay: num(rec, 'TimeOfDay'),
		});
	}

	games.sort((a, b) => {
		if (a.seasonYear !== b.seasonYear) return a.seasonYear - b.seasonYear;
		if (a.seasonWeek !== b.seasonWeek) return a.seasonWeek - b.seasonWeek;
		return a.seasonGameNum - b.seasonGameNum;
	});

	const currentWeek = num(seasonInfo, 'CurrentWeek');
	const currentWeekType = str(seasonInfo, 'CurrentWeekType');

	const gotwExplicit = games.find(
		(g) => g.isGameOfTheWeek && g.seasonWeek === currentWeek && g.seasonWeekType === currentWeekType
	);
	const weekGames = games.filter(
		(g) => g.seasonWeek === currentWeek && (!currentWeekType || g.seasonWeekType === currentWeekType || g.seasonWeekType === 'RegularSeason')
	);
	const gotwFallback = [...weekGames].sort((a, b) => b.gameOfTheWeekScore - a.gameOfTheWeekScore)[0] || null;
	const gameOfTheWeek = gotwExplicit || gotwFallback;

	const weeks = [...new Set(games.map((g) => g.seasonWeek))].sort((a, b) => a - b);

	const payload = {
		generatedAt: new Date().toISOString(),
		savePath: resolved,
		currentWeek,
		currentWeekType,
		weeks,
		gameCount: games.length,
		gameOfTheWeek,
		games,
	};

	if (write) {
		payload.outPath = writeJson('schedule.json', payload);
	}

	return payload;
}

async function main() {
	const args = process.argv.slice(2);
	const explicit = args.find((a) => !a.startsWith('--'));
	const summaryJson = args.includes('--summary-json');
	const noWrite = args.includes('--no-write');
	const savePath = explicit ? resolveInputPath(explicit) : requireCliSavePath(args, 'extract-schedule.js');

	const payload = await extractSchedule(savePath, { write: !noWrite });
	if (summaryJson) {
		console.log(
			JSON.stringify({
				ok: true,
				savePath: payload.savePath,
				gameCount: payload.gameCount,
				currentWeek: payload.currentWeek,
				gotw: payload.gameOfTheWeek
					? `${payload.gameOfTheWeek.away?.displayName || '?'} @ ${payload.gameOfTheWeek.home?.displayName || '?'}`
					: null,
				outPath: payload.outPath || null,
			})
		);
		return;
	}

	console.log(`Wrote schedule: ${payload.outPath} (${payload.gameCount} games)`);
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	});
}

module.exports = { extractSchedule };
