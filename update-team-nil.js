const fs = require('fs');
const path = require('path');
const { FranchiseFile } = require('madden-franchise');

const ROOT_DIR = process.env.CFB_REPO_ROOT
	? path.resolve(process.env.CFB_REPO_ROOT)
	: __dirname;
const SCHEMA_PATH = path.resolve(ROOT_DIR, 'C27_468_2.gz');

function parseRef(bin) {
	if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) {
		return null;
	}

	return {
		tableId: parseInt(bin.slice(0, 15), 2),
		row: parseInt(bin.slice(15), 2),
	};
}

function safeField(rec, field) {
	try {
		return rec[field];
	} catch {
		return undefined;
	}
}

function tableByName(file, name) {
	const hits = file.tables.filter((t) => t.name === name);
	if (!hits.length) {
		throw new Error(`table not found: ${name}`);
	}

	return hits.sort((a, b) => b.header.recordCapacity - a.header.recordCapacity)[0];
}

async function readTable(file, name) {
	const table = tableByName(file, name);
	await table.readRecords();
	return table;
}

function openSave(savePath) {
	return new Promise((resolve, reject) => {
		const file = new FranchiseFile(savePath, {
			autoParse: true,
			schemaDirectory: ROOT_DIR,
			schemaOverride: {
				major: 468,
				minor: 2,
				gameYear: 27,
				path: SCHEMA_PATH,
			},
		});

		file.on('ready', () => resolve(file));
		file.on('error', reject);
	});
}

function getUserControlledCoach(coachT) {
	return coachT.records.find((rec) => rec && !rec.isEmpty && safeField(rec, 'IsUserControlled') === true) || null;
}

function getUserControlledTeamRecord(userCoach, coachT, teamT) {
	if (!userCoach) {
		return null;
	}

	for (const teamRec of teamT.records) {
		if (!teamRec || teamRec.isEmpty) {
			continue;
		}

		const headCoachRef = parseRef(safeField(teamRec, 'HeadCoach'));
		if (headCoachRef && headCoachRef.tableId === coachT.header.tableId && headCoachRef.row === userCoach.index) {
			return teamRec;
		}

		const userCharacterRef = parseRef(safeField(teamRec, 'UserCharacter'));
		if (userCharacterRef && userCharacterRef.tableId === coachT.header.tableId && userCharacterRef.row === userCoach.index) {
			return teamRec;
		}
	}

	const teamIndex = Number(safeField(userCoach, 'TeamIndex'));
	if (Number.isFinite(teamIndex) && teamIndex >= 0 && teamIndex < teamT.records.length) {
		const fallbackTeamRec = teamT.records[teamIndex];
		if (fallbackTeamRec && !fallbackTeamRec.isEmpty) {
			return fallbackTeamRec;
		}
	}

	return null;
}

function buildBackupPath(savePath) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupDir = path.join(path.dirname(savePath), 'macsfeaturebackup');
	fs.mkdirSync(backupDir, { recursive: true });
	return path.join(backupDir, `${path.basename(savePath)}.backup-${timestamp}`);
}

const POINT_FIELD_MAP = {
	totalBudgetValue: 'ProgramPointBudget',
	remainingValue: 'RemainingProgramPoints',
	nilValue: 'NILProgramPointsSpent',
	recruitValue: 'RecruitProgramPointsSpent',
	brandExposureValue: 'BrandExposureProgramPoints',
	conferencePrestigeValue: 'ConferencePrestigeProgramPoints',
	programTraditionsValue: 'ProgramTraditionsProgramPoints',
	stadiumAtmosphereValue: 'StadiumAtmosphereProgramPoints',
};

function normalizePointValue(value, label) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${label} must be a non-negative number.`);
	}

	return Math.trunc(parsed);
}

function getPointUpdateEntries(pointValues) {
	const entries = [];
	for (const [inputKey, fieldName] of Object.entries(POINT_FIELD_MAP)) {
		if (!Object.prototype.hasOwnProperty.call(pointValues || {}, inputKey)) {
			continue;
		}

		const rawValue = pointValues[inputKey];
		if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
			continue;
		}

		entries.push({
			inputKey,
			fieldName,
			newValue: normalizePointValue(rawValue, inputKey),
		});
	}

	return entries;
}

async function updateTeamProgramPoints(savePath, pointValues, options = {}) {
	if (!fs.existsSync(savePath)) {
		throw new Error('Save file not found.');
	}

	const updates = getPointUpdateEntries(pointValues);
	if (!updates.length) {
		throw new Error('Provide at least one point value to update.');
	}

	const file = await openSave(savePath);
	const coachT = await readTable(file, 'Coach');
	const teamT = await readTable(file, 'Team');
	const userCoach = getUserControlledCoach(coachT);
	const teamRec = getUserControlledTeamRecord(userCoach, coachT, teamT);

	if (!teamRec) {
		throw new Error('Could not resolve the active user-controlled team.');
	}

	const changes = {};
	for (const update of updates) {
		const oldValue = Number(safeField(teamRec, update.fieldName)) || 0;
		teamRec[update.fieldName] = update.newValue;
		changes[update.inputKey] = {
			fieldName: update.fieldName,
			oldValue,
			newValue: update.newValue,
		};
	}

	if (changes.totalBudgetValue) {
		const currentSpent = [
			'NILProgramPointsSpent',
			'RecruitProgramPointsSpent',
			'BrandExposureProgramPoints',
			'ConferencePrestigeProgramPoints',
			'ProgramTraditionsProgramPoints',
			'StadiumAtmosphereProgramPoints',
		].reduce((sum, fieldName) => sum + (Number(safeField(teamRec, fieldName)) || 0), 0);
		const recalculatedRemaining = Math.max(0, (Number(safeField(teamRec, 'ProgramPointBudget')) || 0) - currentSpent);
		const oldRemaining = Number(safeField(teamRec, 'RemainingProgramPoints')) || 0;
		teamRec.RemainingProgramPoints = recalculatedRemaining;
		changes.remainingValue = {
			fieldName: 'RemainingProgramPoints',
			oldValue: oldRemaining,
			newValue: recalculatedRemaining,
		};
	}

	const shouldBackup = options.backup !== false;
	let backupPath = null;
	if (shouldBackup) {
		backupPath = options.backupPath || buildBackupPath(savePath);
		fs.copyFileSync(savePath, backupPath);
	}

	await file.save(savePath);

	const result = {
		savePath,
		backupPath,
		teamIndex: teamRec.index,
		teamDisplayName: String(safeField(teamRec, 'DisplayName') || safeField(teamRec, 'LongName') || '').trim(),
		nickname: String(safeField(teamRec, 'NickName') || '').trim(),
		changes,
	};

	if (changes.nilValue) {
		result.oldNilValue = changes.nilValue.oldValue;
		result.newNilValue = changes.nilValue.newValue;
	}
	if (changes.totalBudgetValue) {
		result.oldTotalBudgetValue = changes.totalBudgetValue.oldValue;
		result.newTotalBudgetValue = changes.totalBudgetValue.newValue;
	}
	if (changes.remainingValue) {
		result.oldRemainingValue = changes.remainingValue.oldValue;
		result.newRemainingValue = changes.remainingValue.newValue;
	}
	if (changes.recruitValue) {
		result.oldRecruitValue = changes.recruitValue.oldValue;
		result.newRecruitValue = changes.recruitValue.newValue;
	}
	if (changes.brandExposureValue) {
		result.oldBrandExposureValue = changes.brandExposureValue.oldValue;
		result.newBrandExposureValue = changes.brandExposureValue.newValue;
	}
	if (changes.conferencePrestigeValue) {
		result.oldConferencePrestigeValue = changes.conferencePrestigeValue.oldValue;
		result.newConferencePrestigeValue = changes.conferencePrestigeValue.newValue;
	}
	if (changes.programTraditionsValue) {
		result.oldProgramTraditionsValue = changes.programTraditionsValue.oldValue;
		result.newProgramTraditionsValue = changes.programTraditionsValue.newValue;
	}
	if (changes.stadiumAtmosphereValue) {
		result.oldStadiumAtmosphereValue = changes.stadiumAtmosphereValue.oldValue;
		result.newStadiumAtmosphereValue = changes.stadiumAtmosphereValue.newValue;
	}

	return result;
}

async function updateTeamNilPoints(savePath, nextNilValue, options = {}) {
	return updateTeamProgramPoints(savePath, { nilValue: nextNilValue }, options);
}

module.exports = {
	updateTeamProgramPoints,
	updateTeamNilPoints,
};