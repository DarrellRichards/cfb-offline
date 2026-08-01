const fs = require('fs');
const path = require('path');

function getDataDir() {
	if (process.env.CFB_DATA_DIR) return path.resolve(process.env.CFB_DATA_DIR);
	const root = process.env.CFB_REPO_ROOT
		? path.resolve(process.env.CFB_REPO_ROOT)
		: path.resolve(__dirname, '..');
	return path.join(root, 'data');
}

const SUMMARY_HEADERS = [
	'seasonYear',
	'userTeam',
	'wins',
	'losses',
	'ties',
	'conference',
	'coachName',
	'notes',
];

const SCHEDULE_HEADERS = [
	'week',
	'weekType',
	'dayOfWeek',
	'awayTeam',
	'homeTeam',
	'awayScore',
	'homeScore',
	'isFinal',
];

function parseCsv(text) {
	const raw = String(text || '').replace(/^\uFEFF/, '');
	const rows = [];
	let row = [];
	let cell = '';
	let inQuotes = false;

	for (let i = 0; i < raw.length; i += 1) {
		const ch = raw[i];
		const next = raw[i + 1];
		if (inQuotes) {
			if (ch === '"' && next === '"') {
				cell += '"';
				i += 1;
			} else if (ch === '"') {
				inQuotes = false;
			} else {
				cell += ch;
			}
			continue;
		}
		if (ch === '"') {
			inQuotes = true;
			continue;
		}
		if (ch === ',') {
			row.push(cell);
			cell = '';
			continue;
		}
		if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && next === '\n') i += 1;
			row.push(cell);
			cell = '';
			if (row.some((v) => String(v).trim() !== '')) rows.push(row);
			row = [];
			continue;
		}
		cell += ch;
	}
	row.push(cell);
	if (row.some((v) => String(v).trim() !== '')) rows.push(row);
	return rows;
}

function rowsToObjects(rows) {
	if (!rows.length) return [];
	const headers = rows[0].map((h) => String(h || '').trim());
	return rows.slice(1).map((cols) => {
		const obj = {};
		headers.forEach((header, idx) => {
			obj[header] = cols[idx] != null ? String(cols[idx]).trim() : '';
		});
		return obj;
	});
}

function normalizeTeamKey(name) {
	return String(name || '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

function loadTeamLookup(dataDir = getDataDir()) {
	const full = path.join(dataDir, 'teams.json');
	const byName = new Map();
	if (!fs.existsSync(full)) return byName;
	try {
		const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
		for (const team of payload.teams || []) {
			const ref = {
				row: Number(team.row) || 0,
				teamIndex: team.teamIndex != null ? Number(team.teamIndex) : null,
				displayName: String(team.displayName || '').trim(),
				nickname: String(team.nickname || '').trim(),
				label: String(team.label || team.displayName || '').trim(),
			};
			if (!ref.displayName) continue;
			const keys = [ref.displayName, ref.label, ref.nickname]
				.map(normalizeTeamKey)
				.filter(Boolean);
			for (const key of keys) {
				if (!byName.has(key)) byName.set(key, ref);
			}
		}
	} catch {
		// ignore corrupt teams file
	}
	return byName;
}

function resolveTeamRef(name, lookup, unmatched) {
	const displayName = String(name || '').trim();
	if (!displayName) return null;
	const hit = lookup.get(normalizeTeamKey(displayName));
	if (hit) {
		return {
			row: hit.row,
			teamIndex: hit.teamIndex,
			displayName: hit.displayName,
			nickname: hit.nickname,
			label: hit.label,
		};
	}
	unmatched.add(displayName);
	return {
		row: -1,
		teamIndex: null,
		displayName,
		nickname: '',
		label: displayName,
	};
}

function parseOptionalInt(raw) {
	const text = String(raw ?? '').trim();
	if (!text) return null;
	const n = Number(text);
	if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
		throw new Error(`Invalid non-negative integer: ${text}`);
	}
	return n;
}

function parseBool(raw, fallback = false) {
	const text = String(raw ?? '')
		.trim()
		.toLowerCase();
	if (!text) return fallback;
	if (['true', '1', 'yes', 'y'].includes(text)) return true;
	if (['false', '0', 'no', 'n'].includes(text)) return false;
	return fallback;
}

function parseSummaryCsv(text) {
	const rows = rowsToObjects(parseCsv(text));
	if (!rows.length) throw new Error('Season summary CSV has no data rows.');
	const row = rows[0];
	const seasonYear = Number(row.seasonYear);
	if (!Number.isFinite(seasonYear) || seasonYear < 1900 || seasonYear > 2100) {
		throw new Error('seasonYear is required and must be a valid year.');
	}
	return {
		seasonYear,
		userTeam: String(row.userTeam || '').trim(),
		wins: parseOptionalInt(row.wins) ?? 0,
		losses: parseOptionalInt(row.losses) ?? 0,
		ties: parseOptionalInt(row.ties) ?? 0,
		conference: String(row.conference || '').trim(),
		coachName: String(row.coachName || '').trim(),
		notes: String(row.notes || '').trim(),
	};
}

function parseScheduleCsv(text, seasonYear, lookup) {
	const rows = rowsToObjects(parseCsv(text));
	if (!rows.length) throw new Error('Schedule CSV has no data rows.');

	const unmatched = new Set();
	const warnings = [];
	const games = [];

	rows.forEach((row, idx) => {
		const line = idx + 2;
		const week = Number(row.week);
		if (!Number.isFinite(week) || week < 0) {
			throw new Error(`Schedule row ${line}: week is required.`);
		}
		const awayName = String(row.awayTeam || '').trim();
		const homeName = String(row.homeTeam || '').trim();
		if (!awayName || !homeName) {
			throw new Error(`Schedule row ${line}: awayTeam and homeTeam are required.`);
		}

		let awayScore = null;
		let homeScore = null;
		try {
			awayScore = parseOptionalInt(row.awayScore);
			homeScore = parseOptionalInt(row.homeScore);
		} catch (err) {
			throw new Error(`Schedule row ${line}: ${err.message}`);
		}

		const scoresPresent = awayScore != null && homeScore != null;
		const isFinal = parseBool(row.isFinal, scoresPresent);
		if (isFinal && !scoresPresent) {
			warnings.push(`Row ${line}: marked final without scores.`);
		}

		const weekType = String(row.weekType || 'RegularSeason').trim() || 'RegularSeason';
		const away = resolveTeamRef(awayName, lookup, unmatched);
		const home = resolveTeamRef(homeName, lookup, unmatched);

		games.push({
			row: idx,
			seasonYear,
			seasonWeek: week,
			seasonWeekType: weekType,
			seasonGameNum: idx + 1,
			dayOfWeek: String(row.dayOfWeek || '').trim(),
			gameDateMonth: 0,
			gameDateDay: 0,
			home,
			away,
			homeScore: homeScore ?? 0,
			awayScore: awayScore ?? 0,
			homeScoreOT: 0,
			awayScoreOT: 0,
			quarters: { home: [0, 0, 0, 0], away: [0, 0, 0, 0] },
			gameStatus: isFinal ? 'Final' : 'Pending',
			isFinal,
			isOvertimeGame: false,
			isGameOfTheWeek: false,
			isWorstOfTheWeek: false,
			gameOfTheWeekScore: 0,
			isSimmed: false,
			isKickoffGame: false,
			isChallengeGame: false,
			attendance: 0,
			broadcastNetwork: '',
			weather: '',
			temperature: 0,
			timeOfDay: 0,
		});
	});

	games.sort((a, b) => {
		if (a.seasonWeek !== b.seasonWeek) return a.seasonWeek - b.seasonWeek;
		return a.seasonGameNum - b.seasonGameNum;
	});

	for (const name of [...unmatched].sort()) {
		warnings.push(`Unmatched team name: ${name}`);
	}

	return { games, warnings };
}

function buildLeagueSnapshot(summary, savePath, lookup) {
	const userTeamName = summary.userTeam;
	let userTeam = null;
	if (userTeamName) {
		const unmatched = new Set();
		const ref = resolveTeamRef(userTeamName, lookup, unmatched);
		userTeam = {
			row: ref.row,
			teamIndex: ref.teamIndex,
			displayName: ref.displayName,
			nickname: ref.nickname || '',
			label: ref.label,
			conference: summary.conference
				? { name: summary.conference, enum: summary.conference }
				: null,
			coachName: summary.coachName || '',
			overall: 0,
			record: {
				wins: summary.wins,
				losses: summary.losses,
				ties: summary.ties,
				confWins: 0,
				confLosses: 0,
			},
			mediaPollRank: 0,
			coachesPollRank: 0,
			cfpRank: 0,
		};
	}

	const maxWeekHint = 15;
	return {
		generatedAt: new Date().toISOString(),
		savePath: String(savePath || ''),
		season: {
			currentYear: summary.seasonYear,
			currentSeasonYear: summary.seasonYear,
			baseCalendarYear: summary.seasonYear,
			currentWeek: maxWeekHint,
			currentWeekType: 'RegularSeason',
			currentStage: 'Offseason',
			isRecruitingPeriodActive: false,
			isSigningPeriodActive: false,
			isTransferPortalNewlyAvailable: false,
			isLiveSeasonsLeague: false,
			isLeagueStarted: true,
			regularSeasonLastWeekScheduled: maxWeekHint,
		},
		userTeam,
		conferences: [],
		_meta: {
			source: 'csv-import',
			notes: summary.notes || '',
			importedAt: new Date().toISOString(),
		},
	};
}

function buildScheduleSnapshot(games, seasonYear, savePath) {
	const weeks = [...new Set(games.map((g) => g.seasonWeek))].sort((a, b) => a - b);
	const currentWeek = weeks.length ? weeks[weeks.length - 1] : 0;
	return {
		generatedAt: new Date().toISOString(),
		savePath: String(savePath || ''),
		currentWeek,
		currentWeekType: 'RegularSeason',
		weeks,
		gameCount: games.length,
		gameOfTheWeek: null,
		games,
		_meta: {
			source: 'csv-import',
			seasonYear,
			importedAt: new Date().toISOString(),
		},
	};
}

function buildImportedSeasonPayloads({
	summaryText,
	scheduleText,
	savePath,
	dataDir = getDataDir(),
	seasonYearOverride = null,
} = {}) {
	const lookup = loadTeamLookup(dataDir);
	const summary = parseSummaryCsv(summaryText);
	if (seasonYearOverride != null) {
		const year = Number(seasonYearOverride);
		if (Number.isFinite(year) && year > 0) summary.seasonYear = year;
	}
	const { games, warnings } = parseScheduleCsv(scheduleText, summary.seasonYear, lookup);
	if (summary.userTeam) {
		const key = normalizeTeamKey(summary.userTeam);
		if (!lookup.has(key)) warnings.push(`Unmatched user team: ${summary.userTeam}`);
	}

	const league = buildLeagueSnapshot(summary, savePath, lookup);
	const schedule = buildScheduleSnapshot(games, summary.seasonYear, savePath);
	// Align league current week with schedule
	league.season.currentWeek = schedule.currentWeek;
	league.season.regularSeasonLastWeekScheduled = schedule.currentWeek;

	return {
		seasonYear: summary.seasonYear,
		summary,
		league,
		schedule,
		gameCount: games.length,
		warnings,
		unmatchedTeamCount: warnings.filter((w) => w.startsWith('Unmatched')).length,
	};
}

function summaryTemplateCsv() {
	return `${SUMMARY_HEADERS.join(',')}\n2025,Ohio State,12,2,0,Big Ten,Ryan Day,\n`;
}

function scheduleTemplateCsv() {
	return `${SCHEDULE_HEADERS.join(',')}\n1,RegularSeason,Saturday,Akron,Ohio State,7,52,true\n2,RegularSeason,Saturday,Ohio State,Michigan,,,\n`;
}

module.exports = {
	SUMMARY_HEADERS,
	SCHEDULE_HEADERS,
	parseCsv,
	parseSummaryCsv,
	parseScheduleCsv,
	buildImportedSeasonPayloads,
	summaryTemplateCsv,
	scheduleTemplateCsv,
	loadTeamLookup,
};
