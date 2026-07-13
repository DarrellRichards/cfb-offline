const path = require('path');
const { resolveInputPath,
	openSave,
	readTable,
	safeField,
	parseRef,
	getUserControlledCoach,
	getUserControlledTeamRecord,
	buildTeamLookup,
	teamIdentity,
	writeJson,
	num,
	str,
	bool,
	requireCliSavePath,
} = require('./lib/franchise');


async function buildConferenceMap(file, teamT) {
	const confT = await readTable(file, 'Conference');
	const teamArrTables = file.tables.filter((t) => t.name === 'Team[]');
	for (const t of teamArrTables) {
		await t.readRecords();
	}
	const teamArrById = new Map(teamArrTables.map((t) => [t.header.tableId, t]));

	const conferences = [];
	const teamRowToConference = new Map();

	for (const confRec of confT.records) {
		if (!confRec || confRec.isEmpty) continue;
		const name = str(confRec, 'Name');
		if (!name) continue;

		const conf = {
			row: confRec.index,
			name,
			enum: str(confRec, 'ConferenceEnum'),
			teamRows: [],
			teamIndexes: [],
		};

		const slotsRef = parseRef(safeField(confRec, 'TeamSlots'));
		const slotsTable = slotsRef ? teamArrById.get(slotsRef.tableId) : null;
		const slotsRec = slotsTable ? slotsTable.records[slotsRef.row] : null;
		if (slotsRec && !slotsRec.isEmpty) {
			for (const field of Object.keys(slotsRec._fields || {})) {
				const teamRef = parseRef(safeField(slotsRec, field));
				if (!teamRef || teamRef.tableId !== teamT.header.tableId) continue;
				const teamRec = teamT.records[teamRef.row];
				if (!teamRec || teamRec.isEmpty) continue;
				const identity = teamIdentity(teamRec, teamRec.index);
				conf.teamRows.push(identity.row);
				conf.teamIndexes.push(identity.teamIndex);
				teamRowToConference.set(identity.row, { name: conf.name, enum: conf.enum });
			}
		}

		conferences.push(conf);
	}

	return { conferences, teamRowToConference };
}

async function extractLeagueSnapshot(savePath, { write = true } = {}) {
	const resolved = resolveInputPath(savePath);
	const file = await openSave(resolved);
	const coachT = await readTable(file, 'Coach');
	const teamT = await readTable(file, 'Team');
	const seasonInfoT = await readTable(file, 'SeasonInfo');
	const seasonInfo = seasonInfoT.records.find((r) => r && !r.isEmpty) || seasonInfoT.records[0];

	const userCoach = getUserControlledCoach(coachT);
	const userTeamRec = getUserControlledTeamRecord(userCoach, coachT, teamT);
	const userTeam = userTeamRec ? teamIdentity(userTeamRec, userTeamRec.index) : null;

	const { conferences, teamRowToConference } = await buildConferenceMap(file, teamT);
	const userConference = userTeam ? teamRowToConference.get(userTeam.row) || null : null;

	const payload = {
		generatedAt: new Date().toISOString(),
		savePath: resolved,
		season: {
			currentYear: num(seasonInfo, 'CurrentYear'),
			currentSeasonYear: num(seasonInfo, 'CurrentSeasonYear'),
			baseCalendarYear: num(seasonInfo, 'BaseCalendarYear'),
			currentWeek: num(seasonInfo, 'CurrentWeek'),
			currentWeekType: str(seasonInfo, 'CurrentWeekType'),
			currentStage: str(seasonInfo, 'CurrentStage'),
			isRecruitingPeriodActive: bool(seasonInfo, 'IsRecruitingPeriodActive'),
			isSigningPeriodActive: bool(seasonInfo, 'IsSigningPeriodActive'),
			isTransferPortalNewlyAvailable: bool(seasonInfo, 'IsTransferPortalNewlyAvailable'),
			isLiveSeasonsLeague: bool(seasonInfo, 'IsLiveSeasonsLeague'),
			isLeagueStarted: bool(seasonInfo, 'IsLeagueStarted'),
			regularSeasonLastWeekScheduled: num(seasonInfo, 'RegularSeasonLastWeekScheduled'),
		},
		userTeam: userTeam
			? {
					...userTeam,
					conference: userConference,
					coachName: userCoach
						? `${str(userCoach, 'FirstName')} ${str(userCoach, 'LastName')}`.trim()
						: '',
					overall: num(userTeamRec, 'TEAM_RATINGOVR'),
					record: {
						wins: num(userTeamRec, 'ConfWin') + num(userTeamRec, 'NonConfWin'),
						losses: num(userTeamRec, 'ConfLoss') + num(userTeamRec, 'NonConfLoss'),
						ties: num(userTeamRec, 'ConfTie') + num(userTeamRec, 'NonConfTie'),
						confWins: num(userTeamRec, 'ConfWin'),
						confLosses: num(userTeamRec, 'ConfLoss'),
					},
					mediaPollRank: num(userTeamRec, 'MediaPoll_CurrentRank'),
					coachesPollRank: num(userTeamRec, 'CoachesPoll_CurrentRank'),
					cfpRank: num(userTeamRec, 'CFPPoll_CurrentRank'),
			  }
			: null,
		conferences,
	};

	if (write) {
		payload.outPath = writeJson('league-snapshot.json', payload);
	}

	return payload;
}

async function main() {
	const args = process.argv.slice(2);
	const explicit = args.find((a) => !a.startsWith('--'));
	const summaryJson = args.includes('--summary-json');
	const noWrite = args.includes('--no-write');
	const savePath = explicit ? resolveInputPath(explicit) : requireCliSavePath(args, 'extract-league-snapshot.js');

	const payload = await extractLeagueSnapshot(savePath, { write: !noWrite });
	if (summaryJson) {
		console.log(
			JSON.stringify({
				ok: true,
				savePath: payload.savePath,
				currentWeek: payload.season.currentWeek,
				currentWeekType: payload.season.currentWeekType,
				userTeam: payload.userTeam ? payload.userTeam.label : null,
				conferences: payload.conferences.length,
				outPath: payload.outPath || null,
			})
		);
		return;
	}

	console.log(`Wrote league snapshot: ${payload.outPath}`);
	console.log(
		`Week ${payload.season.currentWeek} (${payload.season.currentWeekType}) — ${payload.userTeam ? payload.userTeam.label : 'No user team'}`
	);
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	});
}

module.exports = { extractLeagueSnapshot, buildConferenceMap };
