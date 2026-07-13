const { buildConferenceMap } = require('./extract-league-snapshot');
const { resolveInputPath,
	openSave,
	readTable,
	teamIdentity,
	writeJson,
	num,
	str,
	requireCliSavePath,
} = require('./lib/franchise');


function buildTeamPayload(teamRec, conference) {
	const identity = teamIdentity(teamRec, teamRec.index);
	const confWins = num(teamRec, 'ConfWin');
	const confLosses = num(teamRec, 'ConfLoss');
	const confTies = num(teamRec, 'ConfTie');
	const nonConfWins = num(teamRec, 'NonConfWin');
	const nonConfLosses = num(teamRec, 'NonConfLoss');
	const nonConfTies = num(teamRec, 'NonConfTie');

	return {
		...identity,
		conference: conference || null,
		record: {
			wins: confWins + nonConfWins,
			losses: confLosses + nonConfLosses,
			ties: confTies + nonConfTies,
			confWins,
			confLosses,
			confTies,
			nonConfWins,
			nonConfLosses,
			homeWins: num(teamRec, 'HomeWin'),
			homeLosses: num(teamRec, 'HomeLoss'),
			roadWins: num(teamRec, 'RoadWin'),
			roadLosses: num(teamRec, 'RoadLoss'),
			winPct: num(teamRec, 'SeasonWinPct'),
		},
		standings: {
			conference: num(teamRec, 'CurSeasonConfStanding'),
			division: num(teamRec, 'CurSeasonDivStanding'),
			league: num(teamRec, 'CurSeasonLeagStanding'),
			lastWeekConference: num(teamRec, 'LastWeekConferenceStanding'),
		},
		polls: {
			media: {
				rank: num(teamRec, 'MediaPoll_CurrentRank'),
				lastWeekRank: num(teamRec, 'MediaPoll_LastWeeksRank'),
				points: num(teamRec, 'MediaPoll_CurrentPoints'),
				firstPlaceVotes: num(teamRec, 'MediaPoll_FirstPlaceVotes'),
			},
			coaches: {
				rank: num(teamRec, 'CoachesPoll_CurrentRank'),
				lastWeekRank: num(teamRec, 'CoachesPoll_LastWeeksRank'),
				points: num(teamRec, 'CoachesPoll_CurrentPoints'),
				firstPlaceVotes: num(teamRec, 'CoachesPoll_FirstPlaceVotes'),
			},
			cfp: {
				rank: num(teamRec, 'CFPPoll_CurrentRank'),
				lastWeekRank: num(teamRec, 'CFPPoll_LastWeeksRank'),
				points: num(teamRec, 'CFPPoll_CurrentPoints'),
			},
		},
		ratings: {
			overall: num(teamRec, 'TEAM_RATINGOVR'),
			offense: num(teamRec, 'TEAM_RATINGOFF'),
			defense: num(teamRec, 'TEAM_RATINGDEF'),
			qb: num(teamRec, 'TEAM_RATINGQB'),
			rb: num(teamRec, 'TEAM_RATINGRB'),
			wr: num(teamRec, 'TEAM_RATINGWR'),
			te: num(teamRec, 'TEAM_RATINGTE'),
			ol: num(teamRec, 'TEAM_RATINGOL'),
			dl: num(teamRec, 'TEAM_RATINGDL'),
			lb: num(teamRec, 'TEAM_RATINGLB'),
			db: num(teamRec, 'TEAM_RATINGDB'),
			st: num(teamRec, 'TEAM_RATINGST'),
			offensiveRank: num(teamRec, 'OffensiveRank'),
			defensiveRank: num(teamRec, 'DefensiveRank'),
			teamRank: num(teamRec, 'TeamRank'),
			prestige: num(teamRec, 'TeamPrestige'),
			prestigeRank: num(teamRec, 'PrestigeRank'),
		},
		prestigeDisplay: str(teamRec, 'PrestigeDisplay'),
	};
}

function pollBoard(teams, pollKey) {
	return teams
		.filter((t) => t.polls[pollKey].rank > 0 && t.polls[pollKey].rank <= 25)
		.sort((a, b) => a.polls[pollKey].rank - b.polls[pollKey].rank)
		.map((t) => ({
			rank: t.polls[pollKey].rank,
			lastWeekRank: t.polls[pollKey].lastWeekRank,
			points: t.polls[pollKey].points,
			firstPlaceVotes: t.polls[pollKey].firstPlaceVotes || 0,
			movement:
				t.polls[pollKey].lastWeekRank > 0
					? t.polls[pollKey].lastWeekRank - t.polls[pollKey].rank
					: 0,
			teamIndex: t.teamIndex,
			row: t.row,
			displayName: t.displayName,
			nickname: t.nickname,
			label: t.label,
			record: t.record,
			conference: t.conference,
		}));
}

async function extractTeams(savePath, { write = true } = {}) {
	const resolved = resolveInputPath(savePath);
	const file = await openSave(resolved);
	const teamT = await readTable(file, 'Team');
	const { conferences, teamRowToConference } = await buildConferenceMap(file, teamT);

	const teams = [];
	for (const teamRec of teamT.records) {
		if (!teamRec || teamRec.isEmpty) continue;
		const identity = teamIdentity(teamRec, teamRec.index);
		if (!identity.displayName) continue;
		// Skip empty / placeholder FCS shells with no useful identity if needed
		const conference = teamRowToConference.get(identity.row) || null;
		teams.push(buildTeamPayload(teamRec, conference));
	}

	teams.sort((a, b) => a.displayName.localeCompare(b.displayName));

	const payload = {
		generatedAt: new Date().toISOString(),
		savePath: resolved,
		teamCount: teams.length,
		conferences,
		rankings: {
			media: pollBoard(teams, 'media'),
			coaches: pollBoard(teams, 'coaches'),
			cfp: pollBoard(teams, 'cfp'),
		},
		teams,
	};

	if (write) {
		payload.outPath = writeJson('teams.json', payload);
	}

	return payload;
}

async function main() {
	const args = process.argv.slice(2);
	const explicit = args.find((a) => !a.startsWith('--'));
	const summaryJson = args.includes('--summary-json');
	const noWrite = args.includes('--no-write');
	const savePath = explicit ? resolveInputPath(explicit) : requireCliSavePath(args, 'extract-teams.js');

	const payload = await extractTeams(savePath, { write: !noWrite });
	if (summaryJson) {
		console.log(
			JSON.stringify({
				ok: true,
				savePath: payload.savePath,
				teamCount: payload.teamCount,
				mediaTop: payload.rankings.media[0]?.displayName || null,
				outPath: payload.outPath || null,
			})
		);
		return;
	}

	console.log(`Wrote teams: ${payload.outPath} (${payload.teamCount} teams)`);
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	});
}

module.exports = { extractTeams };
