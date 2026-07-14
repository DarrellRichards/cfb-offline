const fs = require('fs');
const {
	resolveInputPath,
	openSave,
	readTable,
	num,
	teamIdentity,
} = require('./lib/franchise');
const { buildBackupPath } = require('./lib/backup');

const POLL_FIELDS = {
	media: {
		rank: 'MediaPoll_CurrentRank',
		lastWeekRank: 'MediaPoll_LastWeeksRank',
		points: 'MediaPoll_CurrentPoints',
		firstPlaceVotes: 'MediaPoll_FirstPlaceVotes',
	},
	coaches: {
		rank: 'CoachesPoll_CurrentRank',
		lastWeekRank: 'CoachesPoll_LastWeeksRank',
		points: 'CoachesPoll_CurrentPoints',
		firstPlaceVotes: 'CoachesPoll_FirstPlaceVotes',
	},
};

function normalizePollKey(poll) {
	const key = String(poll || '')
		.trim()
		.toLowerCase();
	if (key === 'media' || key === 'coaches') return key;
	throw new Error('Poll must be "media" or "coaches".');
}

function normalizeEntries(entries) {
	if (!Array.isArray(entries) || !entries.length) {
		throw new Error('Provide an ordered rankings list with at least one team.');
	}
	if (entries.length > 25) {
		throw new Error('Poll boards support at most 25 teams.');
	}

	const seen = new Set();
	const normalized = [];
	for (let i = 0; i < entries.length; i += 1) {
		const entry = entries[i] || {};
		const teamIndex = Number(entry.teamIndex);
		if (!Number.isFinite(teamIndex) || teamIndex < 0) {
			throw new Error(`Invalid teamIndex at position ${i + 1}.`);
		}
		if (seen.has(teamIndex)) {
			throw new Error(`Duplicate teamIndex ${teamIndex} in rankings.`);
		}
		seen.add(teamIndex);

		const rank = i + 1;
		const pointsRaw = entry.points;
		const points =
			pointsRaw === undefined || pointsRaw === null || String(pointsRaw).trim() === ''
				? Math.max(0, (26 - rank) * 40)
				: Math.trunc(Number(pointsRaw));
		if (!Number.isFinite(points) || points < 0) {
			throw new Error(`Invalid points for teamIndex ${teamIndex}.`);
		}

		const fpRaw = entry.firstPlaceVotes;
		const firstPlaceVotes =
			fpRaw === undefined || fpRaw === null || String(fpRaw).trim() === ''
				? rank === 1
					? 1
					: 0
				: Math.trunc(Number(fpRaw));
		if (!Number.isFinite(firstPlaceVotes) || firstPlaceVotes < 0) {
			throw new Error(`Invalid firstPlaceVotes for teamIndex ${teamIndex}.`);
		}

		normalized.push({
			teamIndex,
			rank,
			points,
			firstPlaceVotes,
		});
	}
	return normalized;
}

async function updatePollRankings(savePath, poll, entries, options = {}) {
	const resolved = resolveInputPath(savePath);
	if (!fs.existsSync(resolved)) {
		throw new Error('Save file not found.');
	}

	const pollKey = normalizePollKey(poll);
	const fields = POLL_FIELDS[pollKey];
	const ordered = normalizeEntries(entries);
	const orderedByIndex = new Map(ordered.map((row) => [row.teamIndex, row]));

	const file = await openSave(resolved);
	const teamT = await readTable(file, 'Team');
	const teamsByIndex = new Map();
	for (const teamRec of teamT.records) {
		if (!teamRec || teamRec.isEmpty) continue;
		const identity = teamIdentity(teamRec, teamRec.index);
		if (!Number.isFinite(identity.teamIndex)) continue;
		teamsByIndex.set(identity.teamIndex, { teamRec, identity });
	}

	for (const row of ordered) {
		if (!teamsByIndex.has(row.teamIndex)) {
			throw new Error(`Team ${row.teamIndex} not found in dynasty save.`);
		}
	}

	const changes = [];
	const demoted = [];

	// First pass: apply new top-N ranks; collect teams leaving the board.
	for (const { teamRec, identity } of teamsByIndex.values()) {
		const oldRank = num(teamRec, fields.rank);
		const oldPoints = num(teamRec, fields.points);
		const oldFp = fields.firstPlaceVotes ? num(teamRec, fields.firstPlaceVotes) : 0;
		const next = orderedByIndex.get(identity.teamIndex);

		if (next) {
			const newRank = next.rank;
			const newPoints = next.points;
			const newFp = next.firstPlaceVotes;
			if (oldRank === newRank && oldPoints === newPoints && oldFp === newFp) {
				continue;
			}

			const oldLastWeek = num(teamRec, fields.lastWeekRank);
			teamRec[fields.rank] = newRank;
			teamRec[fields.points] = newPoints;
			if (fields.firstPlaceVotes) {
				teamRec[fields.firstPlaceVotes] = newFp;
			}
			if (!(oldLastWeek > 0)) {
				teamRec[fields.lastWeekRank] = oldRank > 0 ? oldRank : newRank;
			}

			changes.push({
				teamIndex: identity.teamIndex,
				displayName: identity.displayName,
				oldRank,
				newRank,
				oldPoints,
				newPoints,
				oldFirstPlaceVotes: oldFp,
				newFirstPlaceVotes: newFp,
			});
			continue;
		}

		// Game uses 26+ for teams outside the ballot — never write rank 0.
		if (oldRank > 0 && oldRank <= 25) {
			demoted.push({ teamRec, identity, oldRank, oldPoints, oldFp });
		}
	}

	demoted.sort((a, b) => a.oldRank - b.oldRank || a.identity.displayName.localeCompare(b.identity.displayName));

	const usedRanks = new Set(ordered.map((row) => row.rank));
	let nextOutside = 26;
	for (const row of demoted) {
		while (usedRanks.has(nextOutside)) nextOutside += 1;
		const newRank = nextOutside;
		usedRanks.add(newRank);
		nextOutside += 1;

		const oldLastWeek = num(row.teamRec, fields.lastWeekRank);
		row.teamRec[fields.rank] = newRank;
		// Clear ballot points/FP when leaving the top 25.
		row.teamRec[fields.points] = 0;
		if (fields.firstPlaceVotes) {
			row.teamRec[fields.firstPlaceVotes] = 0;
		}
		if (!(oldLastWeek > 0)) {
			row.teamRec[fields.lastWeekRank] = row.oldRank;
		}

		changes.push({
			teamIndex: row.identity.teamIndex,
			displayName: row.identity.displayName,
			oldRank: row.oldRank,
			newRank,
			oldPoints: row.oldPoints,
			newPoints: 0,
			oldFirstPlaceVotes: row.oldFp,
			newFirstPlaceVotes: 0,
		});
	}

	if (!changes.length) {
		return {
			ok: true,
			savePath: resolved,
			poll: pollKey,
			backupPath: null,
			changed: 0,
			board: ordered,
			changes: [],
			message: 'No poll field changes needed.',
		};
	}

	const shouldBackup = options.backup !== false;
	let backupPath = null;
	if (shouldBackup) {
		backupPath = options.backupPath || buildBackupPath(resolved);
		fs.copyFileSync(resolved, backupPath);
	}

	await file.save(resolved);

	return {
		ok: true,
		savePath: resolved,
		poll: pollKey,
		backupPath,
		changed: changes.length,
		board: ordered,
		changes,
	};
}

module.exports = {
	POLL_FIELDS,
	updatePollRankings,
};
