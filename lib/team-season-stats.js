const { safeField, parseRef, teamIdentity, num } = require('./franchise');

function isFcsShellName(name, label = '') {
	return /^FCS\b/i.test(String(name || '')) || /^FCS\b/i.test(String(label || ''));
}

async function loadTeamStatsTableMaps(file) {
	const arrById = new Map();
	const statsById = new Map();
	for (const table of file.tables) {
		if (table.name === 'TeamStats[]') {
			await table.readRecords();
			arrById.set(table.header.tableId, table);
		}
		if (table.name === 'TeamStats') {
			await table.readRecords();
			statsById.set(table.header.tableId, table);
		}
	}
	return { arrById, statsById };
}

function readCurrentTeamSeasonStats(teamRec, arrById, statsById) {
	const arrRef = parseRef(safeField(teamRec, 'TeamSeasonStats'));
	const arrTable = arrRef ? arrById.get(arrRef.tableId) : null;
	const arrRec = arrTable ? arrTable.records[arrRef.row] : null;
	if (!arrRec || arrRec.isEmpty) return null;

	// TeamStats0 is the active season; older slots often lack yardage breakdowns.
	const preferred = ['TeamStats0', 'TeamStats1', 'TeamStats2', 'TeamStats3', 'TeamStats4'];
	const fields = [
		...preferred.filter((f) => arrRec._fields && Object.prototype.hasOwnProperty.call(arrRec._fields, f)),
		...Object.keys(arrRec._fields || {}).filter((f) => !preferred.includes(f)),
	];

	let best = null;
	for (const field of fields) {
		const ref = parseRef(safeField(arrRec, field));
		if (!ref) continue;
		const table = statsById.get(ref.tableId);
		const stats = table ? table.records[ref.row] : null;
		if (!stats || stats.isEmpty) continue;

		const defPassYards = num(stats, 'DEFPASSYARDS');
		const defRushYards = num(stats, 'DEFRUSHYARDS');
		const offYards = num(stats, 'OFFYARDS');
		const defYards = defPassYards + defRushYards;
		const wins = num(stats, 'WINS');
		const losses = num(stats, 'LOSSES');
		const ties = num(stats, 'TIES');
		const games = wins + losses + ties;
		const candidate = {
			field,
			games,
			wins,
			losses,
			ties,
			defPassYards,
			defRushYards,
			defYards,
			offYards,
			offPassYards: num(stats, 'OFFPASSYARDS'),
			offRushYards: num(stats, 'OFFRUSHYARDS'),
			totalYards: num(stats, 'TOTALYARDS'),
		};

		if (field === 'TeamStats0' && (games > 0 || defYards > 0 || offYards > 0)) {
			return candidate;
		}
		if (!best) {
			best = candidate;
			continue;
		}
		const candScore = candidate.defYards + candidate.offYards;
		const bestScore = best.defYards + best.offYards;
		if (candScore > bestScore || (candScore === bestScore && candidate.games > best.games)) {
			best = candidate;
		}
	}
	return best;
}

function buildTotalDefenseYardBoard(teamT, arrById, statsById, { limit = 25 } = {}) {
	const rows = [];
	for (const teamRec of teamT.records) {
		if (!teamRec || teamRec.isEmpty) continue;
		const identity = teamIdentity(teamRec, teamRec.index);
		if (!identity.displayName || isFcsShellName(identity.displayName, identity.label)) continue;
		const stats = readCurrentTeamSeasonStats(teamRec, arrById, statsById);
		if (!stats || !(stats.games > 0)) continue;
		rows.push({
			teamIndex: identity.teamIndex,
			row: identity.row,
			displayName: identity.displayName,
			label: identity.label,
			defYards: stats.defYards,
			defPassYards: stats.defPassYards,
			defRushYards: stats.defRushYards,
			games: stats.games,
			yardsPerGame: stats.games > 0 ? Math.round((stats.defYards / stats.games) * 10) / 10 : 0,
			record: {
				wins: stats.wins,
				losses: stats.losses,
				ties: stats.ties,
			},
		});
	}

	rows.sort((a, b) => {
		if (a.defYards !== b.defYards) return a.defYards - b.defYards;
		if (a.yardsPerGame !== b.yardsPerGame) return a.yardsPerGame - b.yardsPerGame;
		return a.displayName.localeCompare(b.displayName);
	});

	return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

module.exports = {
	isFcsShellName,
	loadTeamStatsTableMaps,
	readCurrentTeamSeasonStats,
	buildTotalDefenseYardBoard,
};
