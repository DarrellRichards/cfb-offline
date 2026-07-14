const fs = require('fs');
const path = require('path');
const { FranchiseFile } = require('madden-franchise');
const { requireCliSavePath, ensureDataDir } = require('./lib/franchise');
const {
	resolvePhysicalAbilityEntries,
	resolveArchetypeLabel,
} = require('./lib/physical-abilities');

const SCHEMA_PATH = path.resolve(__dirname, 'C27_468_2.gz');

function resolveInputPath(p) {
	if (fs.existsSync(p)) {
		return p;
	}

	const winDriveMatch = p.match(/^([A-Za-z]):\\(.*)$/);
	if (winDriveMatch) {
		const drive = winDriveMatch[1].toLowerCase();
		const rest = winDriveMatch[2].replace(/\\/g, '/');
		const wslPath = `/mnt/${drive}/${rest}`;
		if (fs.existsSync(wslPath)) {
			return wslPath;
		}
	}

	return p;
}

function parseRef(bin) {
	if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) {
		return null;
	}

	return {
		tableId: parseInt(bin.slice(0, 15), 2),
		row: parseInt(bin.slice(15), 2),
	};
}

function normalizeKey(v) {
	return String(v || '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9_]/g, '');
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
	const t = tableByName(file, name);
	await t.readRecords();
	return t;
}

function openSave(savePath) {
	return new Promise((resolve, reject) => {
		const f = new FranchiseFile(savePath, {
			autoParse: true,
			schemaDirectory: __dirname,
			schemaOverride: {
				major: 468,
				minor: 2,
				gameYear: 27,
				path: SCHEMA_PATH,
			},
		});

		f.on('ready', () => resolve(f));
		f.on('error', reject);
	});
}

function getRecruitName(playerRec, recruitRec) {
	const first =
		safeField(playerRec, 'FirstName') ||
		safeField(playerRec, 'NameFirst') ||
		safeField(playerRec, 'PLYR_FIRSTNAME');
	const last =
		safeField(playerRec, 'LastName') ||
		safeField(playerRec, 'NameLast') ||
		safeField(playerRec, 'PLYR_LASTNAME');

	if (first || last) {
		return {
			firstName: String(first || '').trim(),
			lastName: String(last || '').trim(),
		};
	}

	const fallbackFirst = safeField(recruitRec, 'FirstName') || safeField(recruitRec, 'NameFirst');
	const fallbackLast = safeField(recruitRec, 'LastName') || safeField(recruitRec, 'NameLast');
	return {
		firstName: String(fallbackFirst || '').trim(),
		lastName: String(fallbackLast || '').trim(),
	};
}

function getOverall(playerRec, recruitRec) {
	const playerOverallFields = ['OverallRating', 'Overall', 'OVR', 'PlayerOverall'];
	for (const field of playerOverallFields) {
		const v = safeField(playerRec, field);
		if (Number.isFinite(v)) {
			return v;
		}
	}

	const recruitOverallFields = ['OverallRating', 'Overall', 'OVR', 'PlayerOverall'];
	for (const field of recruitOverallFields) {
		const v = safeField(recruitRec, field);
		if (Number.isFinite(v)) {
			return v;
		}
	}

	return null;
}

function getPosition(playerRec, recruitRec) {
	const playerPositionFields = ['Position', 'PositionAbbreviation', 'Pos', 'PLYR_POSITION'];
	for (const field of playerPositionFields) {
		const v = safeField(playerRec, field);
		if (v != null && String(v).trim() !== '') {
			return String(v).trim();
		}
	}

	const recruitPositionFields = ['Position', 'PositionAbbreviation', 'Pos'];
	for (const field of recruitPositionFields) {
		const v = safeField(recruitRec, field);
		if (v != null && String(v).trim() !== '') {
			return String(v).trim();
		}
	}

	return '';
}

function getPlayerType(playerRec) {
	const v = safeField(playerRec, 'PlayerType');
	if (v == null) return '';
	return String(v).trim();
}

function parseDirectStars(value) {
	if (value == null) {
		return null;
	}

	const normalized = String(value).trim().toUpperCase();
	const numericMatch = normalized.match(/([1-5])(?:\s|-|_)?STAR/)
		|| normalized.match(/^([1-5])$/)
		|| normalized.match(/\b([1-5])\b/);
	if (numericMatch) {
		return Number(numericMatch[1]);
	}
	if (normalized.includes('FIVE')) return 5;
	if (normalized.includes('FOUR')) return 4;
	if (normalized.includes('THREE')) return 3;
	if (normalized.includes('TWO')) return 2;
	if (normalized.includes('ONE')) return 1;

	return null;
}

function getStars(playerRec, recruitRec) {
	const directPlayer = parseDirectStars(safeField(playerRec, 'ProspectStarRating'));
	if (directPlayer != null) {
		return directPlayer;
	}

	const directRecruit = parseDirectStars(safeField(recruitRec, 'ProspectStarRating'));
	if (directRecruit != null) {
		return directRecruit;
	}

	const rankRaw = safeField(recruitRec, 'NationalRank');
	const rank = Number(rankRaw);
	if (!Number.isFinite(rank) || rank <= 0) {
		return '';
	}

	if (rank <= 32) return 5;
	if (rank <= 300) return 4;
	if (rank <= 1000) return 3;
	if (rank <= 2000) return 2;
	return 1;
}

function getPositionGroup(position) {
	const pos = normalizeKey(position);
	if (['LT', 'LG', 'C', 'RG', 'RT'].includes(pos)) return 'OL';
	if (['LE', 'RE', 'DT'].includes(pos)) return 'DL';
	if (['LOLB', 'MLB', 'ROLB'].includes(pos)) return 'LB';
	if (['CB', 'FS', 'SS'].includes(pos)) return 'DB';
	if (['HB', 'FB'].includes(pos)) return 'RB';
	if (['K', 'P'].includes(pos)) return 'KP';
	return pos;
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

function getProPotentialGrade(teamContext, position) {
	if (!teamContext) return '';
	const posKey = normalizeKey(position);
	if (posKey === 'K') return teamContext.proPotentialByPosition.K || '';
	if (posKey === 'P') return teamContext.proPotentialByPosition.P || '';

	const groupKey = normalizeKey(getPositionGroup(position));
	return teamContext.proPotentialByPosition[groupKey] || '';
}

function getStarterSlots(position) {
	const pos = normalizeKey(position);
	if (pos === 'WR') return 3;
	if (pos === 'CB' || pos === 'DT') return 2;
	return 1;
}

function getPlayingTimeDealbreakerStatus(teamContext, position, overall) {
	if (!teamContext || !position || !Number.isFinite(Number(overall))) {
		return { status: 'unknown', detail: '' };
	}

	const posKey = normalizeKey(position);
	const overalls = teamContext.rosterOverallsByPosition[posKey] || [];
	if (!overalls.length) {
		return { status: 'unknown', detail: '' };
	}

	const starterSlots = getStarterSlots(position);
	const benchmarkIndex = Math.min(starterSlots - 1, overalls.length - 1);
	const benchmarkOverall = overalls[benchmarkIndex];
	const recruitOverall = Number(overall);
	return {
		status: recruitOverall >= benchmarkOverall ? 'likely_met' : 'likely_not_met',
		detail: `${position} starter benchmark ${benchmarkOverall}`,
	};
}

function getProximityDealbreakerStatus(teamContext, playerRec) {
	if (!teamContext) {
		return { status: 'unknown', detail: '' };
	}

	const homePipeline = String(safeField(playerRec, 'HomePipeline') || '').trim();
	if (!homePipeline) {
		return { status: 'unknown', detail: '' };
	}

	const matched = teamContext.teamPipelines.some((pipeline) => normalizeKey(pipeline.pipeline) === normalizeKey(homePipeline));
	return {
		status: matched ? 'met' : 'not_met',
		detail: homePipeline,
	};
}

function getDealbreakerStatus(teamContext, playerRec, position, overall, dealbreaker) {
	const key = normalizeKey(dealbreaker);
	if (!key) {
		return { status: 'unknown', detail: '' };
	}

	if (key === 'PROXIMITYTOHOME') {
		return getProximityDealbreakerStatus(teamContext, playerRec);
	}

	if (key === 'PLAYINGTIME') {
		return getPlayingTimeDealbreakerStatus(teamContext, position, overall);
	}

	return { status: 'unknown', detail: '' };
}

function buildUserTeamContext(file, coachT, teamT, mySchoolTrackingT) {
	const userCoach = getUserControlledCoach(coachT);
	if (!userCoach) {
		return null;
	}

	const teamRec = getUserControlledTeamRecord(userCoach, coachT, teamT);
	if (!teamRec || teamRec.isEmpty) {
		return null;
	}
	const teamIndex = teamRec.index;

	const mySchoolRef = parseRef(safeField(teamRec, 'MySchoolTrackingTable'));
	const mySchoolRec = mySchoolRef && mySchoolRef.tableId === mySchoolTrackingT.header.tableId
		? mySchoolTrackingT.records[mySchoolRef.row]
		: null;
	const schoolPipelineInfluenceListRef = parseRef(safeField(teamRec, 'SchoolPipelineInfluenceList'));
	let teamPipelines = [];
	if (schoolPipelineInfluenceListRef) {
		const listTable = file.tables.find((t) => t.header.tableId === schoolPipelineInfluenceListRef.tableId);
		const pipelineTable = tableByName(file, 'SchoolPipelineInfluence');
		if (listTable) {
			return readTable(file, listTable.name).then(async (loadedListTable) => {
				await pipelineTable.readRecords();
				const listRec = loadedListTable.records[schoolPipelineInfluenceListRef.row];
				if (listRec && !listRec.isEmpty) {
					teamPipelines = Object.keys(listRec._fields)
						.map((field) => parseRef(safeField(listRec, field)))
						.filter(Boolean)
						.map((ref) => pipelineTable.records[ref.row])
						.filter((rec) => rec && !rec.isEmpty)
						.map((rec) => ({
							pipeline: String(safeField(rec, 'Pipeline') || '').trim(),
							level: String(safeField(rec, 'InfluenceLevel') || '').trim(),
							value: Number(safeField(rec, 'InfluenceValue')) || 0,
						}));
				}

				return buildResolvedTeamContext(file, userCoach, teamRec, teamIndex, mySchoolRec, teamPipelines);
			});
		}
	}

	return buildResolvedTeamContext(file, userCoach, teamRec, teamIndex, mySchoolRec, teamPipelines);
}

function buildRosterOverallsByPosition(file, teamRec) {
	const rosterRef = parseRef(safeField(teamRec, 'Roster'));
	if (!rosterRef) {
		return Promise.resolve({});
	}

	const rosterTable = file.tables.find((t) => t.header.tableId === rosterRef.tableId);
	const playerT = tableByName(file, 'Player');
	if (!rosterTable) {
		return Promise.resolve({});
	}

	return readTable(file, rosterTable.name).then(async (loadedRosterTable) => {
		await playerT.readRecords();
		const rosterRec = loadedRosterTable.records[rosterRef.row];
		const out = {};
		if (!rosterRec || rosterRec.isEmpty) {
			return out;
		}

		for (const field of Object.keys(rosterRec._fields)) {
			const ref = parseRef(safeField(rosterRec, field));
			if (!ref || ref.tableId !== playerT.header.tableId) {
				continue;
			}
			const playerRec = playerT.records[ref.row];
			if (!playerRec || playerRec.isEmpty) {
				continue;
			}
			const posKey = normalizeKey(getPosition(playerRec, playerRec));
			const overall = Number(getOverall(playerRec, playerRec));
			if (!posKey || !Number.isFinite(overall)) {
				continue;
			}
			if (!out[posKey]) {
				out[posKey] = [];
			}
			out[posKey].push(overall);
		}

		for (const posKey of Object.keys(out)) {
			out[posKey].sort((a, b) => b - a);
		}

		return out;
	});
}

function buildResolvedTeamContext(file, userCoach, teamRec, teamIndex, mySchoolRec, teamPipelines) {
	return buildRosterOverallsByPosition(file, teamRec).then((rosterOverallsByPosition) => {
		let playingStyleByPlayerType = {};
		const styleRef = mySchoolRec ? parseRef(safeField(mySchoolRec, 'PlayingStyleGradeByPlayerTypeTable')) : null;
		if (styleRef) {
			const styleTable = file.tables.find((t) => t.header.tableId === styleRef.tableId);
			if (styleTable) {
				return readTable(file, styleTable.name).then((loadedStyleTable) => {
					const styleRec = loadedStyleTable.records[styleRef.row];
					if (styleRec && !styleRec.isEmpty) {
						playingStyleByPlayerType = Object.keys(styleRec._fields).reduce((acc, field) => {
							acc[normalizeKey(field)] = String(safeField(styleRec, field) || '').trim();
							return acc;
						}, {});
					}
					return finalizeTeamContext(userCoach, teamRec, teamIndex, mySchoolRec, teamPipelines, rosterOverallsByPosition, playingStyleByPlayerType);
				});
			}
		}

		return finalizeTeamContext(userCoach, teamRec, teamIndex, mySchoolRec, teamPipelines, rosterOverallsByPosition, playingStyleByPlayerType);
	});
}

function finalizeTeamContext(userCoach, teamRec, teamIndex, mySchoolRec, teamPipelines, rosterOverallsByPosition, playingStyleByPlayerType) {
	return {
		coachName: `${String(safeField(userCoach, 'FirstName') || '').trim()} ${String(safeField(userCoach, 'LastName') || '').trim()}`.trim(),
		coachPrestige: String(safeField(userCoach, 'CoachPrestige') || '').trim(),
		teamIndex,
		teamDisplayName: String(safeField(teamRec, 'DisplayName') || safeField(teamRec, 'LongName') || '').trim(),
		teamLongName: String(safeField(teamRec, 'LongName') || '').trim(),
		nickname: String(safeField(teamRec, 'NickName') || '').trim(),
		teamLabel: `${String(safeField(teamRec, 'DisplayName') || safeField(teamRec, 'LongName') || '').trim()} ${String(safeField(teamRec, 'NickName') || '').trim()}`.trim(),
		teamPipelines,
		rosterOverallsByPosition,
		programPointBudget: Number(safeField(teamRec, 'ProgramPointBudget')) || 0,
		remainingProgramPoints: Number(safeField(teamRec, 'RemainingProgramPoints')) || 0,
		recruitProgramPointsSpent: Number(safeField(teamRec, 'RecruitProgramPointsSpent')) || 0,
		nilProgramPointsSpent: Number(safeField(teamRec, 'NILProgramPointsSpent')) || 0,
		brandExposureProgramPoints: Number(safeField(teamRec, 'BrandExposureProgramPoints')) || 0,
		conferencePrestigeProgramPoints: Number(safeField(teamRec, 'ConferencePrestigeProgramPoints')) || 0,
		programTraditionsProgramPoints: Number(safeField(teamRec, 'ProgramTraditionsProgramPoints')) || 0,
		stadiumAtmosphereProgramPoints: Number(safeField(teamRec, 'StadiumAtmosphereProgramPoints')) || 0,
		grades: mySchoolRec ? {
			academicPrestige: String(safeField(mySchoolRec, 'AcademicPrestigeGrade') || '').trim(),
			athleticFacilities: String(safeField(mySchoolRec, 'AthleticFacilitiesGrade') || '').trim(),
			brandExposure: String(safeField(mySchoolRec, 'BrandExposureGrade') || '').trim(),
			campusLifestyle: String(safeField(mySchoolRec, 'CampusLifestyleGrade') || '').trim(),
			championshipContender: String(safeField(mySchoolRec, 'ChampionshipContenderGrade') || '').trim(),
			coachPrestige: String(safeField(mySchoolRec, 'CoachPrestigeGrade') || '').trim(),
			coachStability: String(safeField(mySchoolRec, 'CoachStabilityGrade') || '').trim(),
			conferencePrestige: String(safeField(mySchoolRec, 'ConferencePrestigeGrade') || '').trim(),
			programTradition: String(safeField(mySchoolRec, 'ProgramTraditionGrade') || '').trim(),
			stadiumAtmosphere: String(safeField(mySchoolRec, 'StadiumAtmosphereGrade') || '').trim(),
		} : {},
		proPotentialByPosition: mySchoolRec ? {
			QB: String(safeField(mySchoolRec, 'ProPotentialGradeQB') || '').trim(),
			RB: String(safeField(mySchoolRec, 'ProPotentialGradeRB') || '').trim(),
			WR: String(safeField(mySchoolRec, 'ProPotentialGradeWR') || '').trim(),
			TE: String(safeField(mySchoolRec, 'ProPotentialGradeTE') || '').trim(),
			OL: String(safeField(mySchoolRec, 'ProPotentialGradeOL') || '').trim(),
			DL: String(safeField(mySchoolRec, 'ProPotentialGradeDL') || '').trim(),
			LB: String(safeField(mySchoolRec, 'ProPotentialGradeLB') || '').trim(),
			DB: String(safeField(mySchoolRec, 'ProPotentialGradeDB') || '').trim(),
			K: String(safeField(mySchoolRec, 'ProPotentialGradeK') || '').trim(),
			P: String(safeField(mySchoolRec, 'ProPotentialGradeP') || '').trim(),
		} : {},
		playingStyleByPlayerType,
	};
}

function getDealbreakerSchoolGrade(teamContext, playerType, position, dealbreaker) {
	if (!teamContext) {
		return '';
	}

	const key = normalizeKey(dealbreaker);
	if (!key) {
		return '';
	}

	switch (key) {
		case 'BRANDEXPOSURE':
			return teamContext.grades.brandExposure || '';
		case 'CAMPUSPERSONALITY':
			return teamContext.grades.campusLifestyle || '';
		case 'CHAMPIONSHIPCONTENDER':
			return teamContext.grades.championshipContender || '';
		case 'COACHPRESTIGE':
			return teamContext.grades.coachPrestige || '';
		case 'CONFERENCEPRESTIGE':
			return teamContext.grades.conferencePrestige || '';
		case 'PLAYINGSTYLE': {
			const typeKey = normalizeKey(playerType);
			return teamContext.playingStyleByPlayerType[typeKey] || '';
		}
		case 'PROPOTENTIAL':
			return getProPotentialGrade(teamContext, position);
		default:
			return '';
	}
}

function collectRatings(playerRec, recruitRec) {
	const out = {};
	const addFromRecord = (rec) => {
		if (!rec || rec.isEmpty || !rec._fields) return;
		for (const key of Object.keys(rec._fields)) {
			if (!/Rating$/i.test(key) && key !== 'OverallRating') {
				continue;
			}
			const value = Number(safeField(rec, key));
			if (!Number.isFinite(value)) {
				continue;
			}
			if (!Object.prototype.hasOwnProperty.call(out, key)) {
				out[key] = Math.trunc(value);
			}
		}
	};

	addFromRecord(playerRec);
	addFromRecord(recruitRec);

	return out;
}

function getActiveSchoolCountForStage(stage) {
	const normalized = String(stage || '').trim();
	if (normalized === 'Top10') return 10;
	if (normalized === 'Top5') return 5;
	if (normalized === 'Top3') return 3;
	if (normalized === 'Battle') return 2;
	if (normalized === 'SoftCommitted' || normalized === 'HardCommitted') return 1;
	return 5;
}

function buildProspectInteractionMap(prospectInteractionT) {
	const out = new Map();
	for (const rec of prospectInteractionT.records) {
		if (!rec || rec.isEmpty) continue;
		const recruitRef = parseRef(safeField(rec, 'Recruit'));
		const teamRef = parseRef(safeField(rec, 'Team'));
		if (!recruitRef || !teamRef) continue;
		out.set(`${recruitRef.row}:${teamRef.row}`, {
			hasOfferedScholarship: safeField(rec, 'HasOfferedScholarship') === true,
			isVisitScheduled: safeField(rec, 'IsVisitScheduled') === true,
			timesScouted: Number(safeField(rec, 'TimesScouted')) || 0,
			visitWeekNumber: Number(safeField(rec, 'VisitWeekNumber')) || 0,
			visitWeekType: String(safeField(rec, 'VisitWeekType') || '').trim(),
		});
	}
	return out;
}

function buildProspectInteractionMapByTeamIndex(prospectInteractionT, teamT) {
	const out = new Map();
	for (const rec of prospectInteractionT.records) {
		if (!rec || rec.isEmpty) continue;
		const recruitRef = parseRef(safeField(rec, 'Recruit'));
		const teamRef = parseRef(safeField(rec, 'Team'));
		if (!recruitRef || !teamRef) continue;
		const teamRec = teamT.records[teamRef.row];
		const teamIndex = Number(safeField(teamRec, 'TeamIndex'));
		if (!Number.isFinite(teamIndex)) continue;
		out.set(`${recruitRef.row}:${teamRef.row}`, {
			hasOfferedScholarship: safeField(rec, 'HasOfferedScholarship') === true,
			isVisitScheduled: safeField(rec, 'IsVisitScheduled') === true,
			timesScouted: Number(safeField(rec, 'TimesScouted')) || 0,
			visitWeekNumber: Number(safeField(rec, 'VisitWeekNumber')) || 0,
			visitWeekType: String(safeField(rec, 'VisitWeekType') || '').trim(),
		});
		out.set(`${recruitRef.row}:${teamIndex}`, {
			hasOfferedScholarship: safeField(rec, 'HasOfferedScholarship') === true,
			isVisitScheduled: safeField(rec, 'IsVisitScheduled') === true,
			timesScouted: Number(safeField(rec, 'TimesScouted')) || 0,
			visitWeekNumber: Number(safeField(rec, 'VisitWeekNumber')) || 0,
			visitWeekType: String(safeField(rec, 'VisitWeekType') || '').trim(),
		});
	}
	return out;
}

function buildTeamLookupByIndex(teamT) {
	const byTeamIndex = new Map();
	for (let teamRow = 0; teamRow < teamT.records.length; teamRow++) {
		const rec = teamT.records[teamRow];
		if (!rec || rec.isEmpty) continue;
		const teamIndex = Number(safeField(rec, 'TeamIndex'));
		if (!Number.isFinite(teamIndex)) continue;
		if (!byTeamIndex.has(teamIndex)) {
			byTeamIndex.set(teamIndex, { teamRow, rec });
		}
	}
	return byTeamIndex;
}

function buildTopSchoolsData(recruitRec, recruitRow, topSchoolsArrayT, prospectTargetSchoolTablesById, teamT, teamLookupByIndex, prospectInteractionMap) {
	const listRef = parseRef(safeField(recruitRec, 'TopSchoolsList'));
	if (!listRef || listRef.tableId !== topSchoolsArrayT.header.tableId) {
		return [];
	}

	const listRec = topSchoolsArrayT.records[listRef.row];
	if (!listRec || listRec.isEmpty) {
		return [];
	}

	const recruitStage = String(safeField(recruitRec, 'RecruitStage') || '').trim();
	const offerCount = Number(safeField(recruitRec, 'TotalScholarshipOffers')) || 0;
	const activeSchoolCount = getActiveSchoolCountForStage(recruitStage);
	const candidates = [];

	for (let slot = 0; slot < 10; slot++) {
		const schoolRef = parseRef(safeField(listRec, `ProspectTargetSchool${slot}`));
		if (!schoolRef) continue;
		const schoolTable = prospectTargetSchoolTablesById.get(schoolRef.tableId);
		if (!schoolTable) continue;
		const schoolRec = schoolTable.records[schoolRef.row];
		if (!schoolRec || schoolRec.isEmpty) continue;

		const schoolTeamId = Number(safeField(schoolRec, 'TeamId'));
		const teamLookup = Number.isFinite(schoolTeamId) ? teamLookupByIndex.get(schoolTeamId) : null;
		const teamRec = teamLookup ? teamLookup.rec : Number.isFinite(schoolTeamId) ? teamT.records[schoolTeamId] : null;
		const interaction = Number.isFinite(schoolTeamId)
			? prospectInteractionMap.get(`${recruitRow}:${schoolTeamId}`) || (teamLookup ? prospectInteractionMap.get(`${recruitRow}:${teamLookup.teamRow}`) : null)
			: null;

		candidates.push({
			slot,
			teamIndex: schoolTeamId,
			teamDisplayName: String(safeField(teamRec, 'DisplayName') || safeField(teamRec, 'LongName') || '').trim(),
			nickname: String(safeField(teamRec, 'NickName') || '').trim(),
			teamLabel: `${String(safeField(teamRec, 'DisplayName') || safeField(teamRec, 'LongName') || '').trim()} ${String(safeField(teamRec, 'NickName') || '').trim()}`.trim(),
			influence: Number(safeField(schoolRec, 'TeamInfluence')) || 0,
			scholarshipStatus: interaction ? (interaction.hasOfferedScholarship ? 'offered' : 'not_offered') : 'unknown',
			isVisitScheduled: interaction ? interaction.isVisitScheduled : false,
			visitWeekNumber: interaction ? interaction.visitWeekNumber : 0,
			visitWeekType: interaction ? interaction.visitWeekType : '',
		});
	}

	const sorted = candidates
		.sort((a, b) => b.influence - a.influence || a.slot - b.slot)
		.slice(0, activeSchoolCount)
		.map((entry, index) => {
			let scholarshipStatus = entry.scholarshipStatus;
			if (scholarshipStatus === 'unknown') {
				if (offerCount === 0) {
					scholarshipStatus = 'not_offered';
				} else if (index < offerCount) {
					scholarshipStatus = 'likely_offered';
				}
			}

			return {
				rank: index + 1,
				teamIndex: entry.teamIndex,
				teamDisplayName: entry.teamDisplayName,
				nickname: entry.nickname,
				teamLabel: entry.teamLabel,
				influence: entry.influence,
				scholarshipStatus,
				isVisitScheduled: entry.isVisitScheduled,
				visitWeekNumber: entry.visitWeekNumber,
				visitWeekType: entry.visitWeekType,
			};
		});

	return sorted;
}

async function main() {
	const args = process.argv.slice(2);
	const explicitPath = args.find((a) => !a.startsWith('--'));
	const summaryJson = args.includes('--summary-json');
	const noWrite = args.includes('--no-write');
	const boardOnlyMode = args.includes('--board-only');
	const extractAllClass = !boardOnlyMode;
	const outArgIdx = args.indexOf('--out');
	const outPathArg = outArgIdx >= 0 && outArgIdx + 1 < args.length ? args[outArgIdx + 1] : null;
	const outDirArgIdx = args.indexOf('--out-dir');
	const outDirArg = outDirArgIdx >= 0 && outDirArgIdx + 1 < args.length ? args[outDirArgIdx + 1] : null;
	const savePath = requireCliSavePath(args, 'extract-recruit-board.js');

	if (!fs.existsSync(savePath)) {
		throw new Error(`Save file not found: ${savePath}`);
	}

	if (!fs.existsSync(SCHEMA_PATH)) {
		throw new Error(`Schema file missing: ${SCHEMA_PATH}`);
	}

	const file = await openSave(savePath);
	const recruitTargetArrayT = await readTable(file, 'RecruitTarget[]');
	const recruitTargetT = await readTable(file, 'RecruitTarget');
	const recruitT = await readTable(file, 'Recruit');
	const playerT = tableByName(file, 'Player');
	await playerT.readRecords();
	const coachT = await readTable(file, 'Coach');
	const teamT = await readTable(file, 'Team');
	const topSchoolsArrayT = await readTable(file, 'ProspectTargetSchool[]');
	const prospectInteractionT = await readTable(file, 'ProspectInteraction');
	const prospectTargetSchoolTables = file.tables.filter((t) => t.name === 'ProspectTargetSchool');
	for (const t of prospectTargetSchoolTables) {
		await t.readRecords();
	}
	const prospectTargetSchoolTablesById = new Map(prospectTargetSchoolTables.map((t) => [t.header.tableId, t]));
	const teamLookupByIndex = buildTeamLookupByIndex(teamT);
	const prospectInteractionMap = buildProspectInteractionMapByTeamIndex(prospectInteractionT, teamT);
	const mySchoolTrackingT = await readTable(file, 'MySchoolTrackingTable');
	const teamContext = await buildUserTeamContext(file, coachT, teamT, mySchoolTrackingT);

	const rows = [];
	const seen = new Set();
	const cols = recruitTargetArrayT.offsetTable.map((o) => o.name);

	const csvEscape = (v) => {
		const s = String(v == null ? '' : v);
		if (/[",\n]/.test(s)) {
			return `"${s.replace(/"/g, '""')}"`;
		}
		return s;
	};

	const appendRow = ({ recruitRec, playerRec, recruitRow, playerRow, boardRow, targetRow, targetRec }) => {
		const { firstName, lastName } = getRecruitName(playerRec, recruitRec);
		if (!firstName || !lastName) {
			return;
		}

		const key = String(recruitRow);
		if (seen.has(key)) {
			return;
		}

		const overall = getOverall(playerRec, recruitRec);
		const position = getPosition(playerRec, recruitRec);
		const playerType = getPlayerType(playerRec);
		const stars = getStars(playerRec, recruitRec);
		const nationalRankRaw = safeField(recruitRec, 'NationalRank');
		const nationalRank = Number(nationalRankRaw);
		const devTrait = safeField(playerRec, 'TraitDevelopment') || '';
		const dealbreaker = safeField(playerRec, 'RecruitingDealbreaker') || '';
		const dealbreakerSchoolGrade = getDealbreakerSchoolGrade(teamContext, playerType, position, dealbreaker);
		const dealbreakerStatusMeta = getDealbreakerStatus(teamContext, playerRec, position, overall, dealbreaker);
		const offerCount = Number(safeField(recruitRec, 'TotalScholarshipOffers')) || 0;
		const recruitStage = String(safeField(recruitRec, 'RecruitStage') || '').trim();
		const idealPitch = safeField(playerRec, 'IdealRecruitingPitch') || '';
		const activePitches = (targetRec && safeField(targetRec, 'ActivePitches')) || '';
		const swayPitch = (targetRec && safeField(targetRec, 'SwayPitch')) || '';
		const physicalAbilityEntries = resolvePhysicalAbilityEntries(playerRec, playerType);
		const archetypeLabel = resolveArchetypeLabel(playerType);
		const physicalAbilities = [
			safeField(playerRec, 'PhysicalAbility1') || '',
			safeField(playerRec, 'PhysicalAbility2') || '',
			safeField(playerRec, 'PhysicalAbility3') || '',
			safeField(playerRec, 'PhysicalAbility4') || '',
			safeField(playerRec, 'PhysicalAbility5') || '',
		];
		const physicalAbilityDisplay = physicalAbilityEntries.map((e) => e.label).join(' | ');

		seen.add(key);
		const ratings = collectRatings(playerRec, recruitRec);
		const topSchools = buildTopSchoolsData(
			recruitRec,
			recruitRow,
			topSchoolsArrayT,
			prospectTargetSchoolTablesById,
			teamT,
			teamLookupByIndex,
			prospectInteractionMap
		);
		rows.push({
			firstName,
			lastName,
			position,
			playerType,
			archetypeLabel,
			nationalRank: Number.isFinite(nationalRank) && nationalRank > 0 ? nationalRank : '',
			stars,
			overall: overall == null ? '' : overall,
			devTrait,
			dealbreaker,
			offerCount,
			recruitStage,
			dealbreakerSchoolGrade,
			dealbreakerStatus: dealbreakerStatusMeta.status,
			dealbreakerStatusDetail: dealbreakerStatusMeta.detail,
			ratings,
			topSchools,
			idealPitch,
			activePitches,
			swayPitch,
			physicalAbility1: physicalAbilities[0],
			physicalAbility2: physicalAbilities[1],
			physicalAbility3: physicalAbilities[2],
			physicalAbility4: physicalAbilities[3],
			physicalAbility5: physicalAbilities[4],
			physicalAbilityName1: physicalAbilityEntries.find((e) => e.slot === 1)?.name || '',
			physicalAbilityName2: physicalAbilityEntries.find((e) => e.slot === 2)?.name || '',
			physicalAbilityName3: physicalAbilityEntries.find((e) => e.slot === 3)?.name || '',
			physicalAbilityName4: physicalAbilityEntries.find((e) => e.slot === 4)?.name || '',
			physicalAbilityName5: physicalAbilityEntries.find((e) => e.slot === 5)?.name || '',
			physicalAbilityEntries,
			physicalAbilities: physicalAbilityDisplay,
			onMyBoard: boardRow !== '' && boardRow != null,
			boardRow,
			targetRow,
			playerRow,
			recruitRow,
		});
	};

	// Index pipeline-board targets so all-class extracts can still attach pitches / board rows.
	const boardTargetByRecruitRow = new Map();
	for (let boardRow = 0; boardRow < recruitTargetArrayT.header.recordCapacity; boardRow++) {
		const boardRec = recruitTargetArrayT.records[boardRow];
		if (!boardRec || boardRec.isEmpty) continue;
		for (const col of cols) {
			const targetRef = parseRef(safeField(boardRec, col));
			if (!targetRef || targetRef.tableId !== recruitTargetT.header.tableId) continue;
			const targetRec = recruitTargetT.records[targetRef.row];
			if (!targetRec || targetRec.isEmpty) continue;
			const recruitRef = parseRef(safeField(targetRec, 'Recruit'));
			if (!recruitRef || recruitRef.tableId !== recruitT.header.tableId) continue;
			if (!boardTargetByRecruitRow.has(recruitRef.row)) {
				boardTargetByRecruitRow.set(recruitRef.row, {
					boardRow,
					targetRow: targetRef.row,
					targetRec,
				});
			}
		}
	}

	if (extractAllClass) {
		for (let recruitRow = 0; recruitRow < recruitT.records.length; recruitRow++) {
			const recruitRec = recruitT.records[recruitRow];
			if (!recruitRec || recruitRec.isEmpty) continue;

			const playerRef = parseRef(safeField(recruitRec, 'Player'));
			if (!playerRef || playerRef.tableId !== playerT.header.tableId) continue;
			const playerRec = playerT.records[playerRef.row];
			if (!playerRec || playerRec.isEmpty) continue;

			const boardHit = boardTargetByRecruitRow.get(recruitRow);
			appendRow({
				recruitRec,
				playerRec,
				recruitRow,
				playerRow: playerRef.row,
				boardRow: boardHit ? boardHit.boardRow : '',
				targetRow: boardHit ? boardHit.targetRow : '',
				targetRec: boardHit ? boardHit.targetRec : null,
			});
		}
	} else {
		for (const [recruitRow, boardHit] of boardTargetByRecruitRow.entries()) {
			const recruitRec = recruitT.records[recruitRow];
			if (!recruitRec || recruitRec.isEmpty) continue;
			const playerRef = parseRef(safeField(recruitRec, 'Player'));
			const playerRec =
				playerRef && playerRef.tableId === playerT.header.tableId ? playerT.records[playerRef.row] : null;
			if (!playerRec || playerRec.isEmpty) continue;

			appendRow({
				recruitRec,
				playerRec,
				recruitRow,
				playerRow: playerRef.row,
				boardRow: boardHit.boardRow,
				targetRow: boardHit.targetRow,
				targetRec: boardHit.targetRec,
			});
		}
	}

	rows.sort(
		(a, b) =>
			Number(b.onMyBoard) - Number(a.onMyBoard) ||
			(Number(a.nationalRank) || 99999) - (Number(b.nationalRank) || 99999) ||
			a.lastName.localeCompare(b.lastName) ||
			a.firstName.localeCompare(b.firstName)
	);

	const csvLines = [
		'firstName,lastName,position,playerType,stars,overall,devTrait,dealbreaker,offerCount,recruitStage,dealbreakerSchoolGrade,dealbreakerStatus,dealbreakerStatusDetail,idealPitch,activePitches,swayPitch,physicalAbility1,physicalAbility2,physicalAbility3,physicalAbility4,physicalAbility5,physicalAbilityName1,physicalAbilityName2,physicalAbilityName3,physicalAbilityName4,physicalAbilityName5,physicalAbilities,boardRow,targetRow,playerRow,recruitRow',
	];
	for (const r of rows) {
		csvLines.push(
			[
				r.firstName,
				r.lastName,
				r.position,
				r.playerType,
				r.stars,
				r.overall,
				r.devTrait,
				r.dealbreaker,
				r.offerCount,
				r.recruitStage,
					r.dealbreakerSchoolGrade,
					r.dealbreakerStatus,
					r.dealbreakerStatusDetail,
				r.idealPitch,
				r.activePitches,
				r.swayPitch,
				r.physicalAbility1,
				r.physicalAbility2,
				r.physicalAbility3,
				r.physicalAbility4,
				r.physicalAbility5,
				r.physicalAbilityName1,
				r.physicalAbilityName2,
				r.physicalAbilityName3,
				r.physicalAbilityName4,
				r.physicalAbilityName5,
				r.physicalAbilities,
				r.boardRow,
				r.targetRow,
				r.playerRow,
				r.recruitRow,
			]
				.map(csvEscape)
				.join(',')
		);
	}

	// Write under CFB_DATA_DIR (userData on packaged desktop) — never Program Files.
	const outDir = outDirArg ? path.resolve(outDirArg) : ensureDataDir();
	const outPath = outPathArg ? path.resolve(outPathArg) : path.join(outDir, 'recruit-board.csv');
	const jsonPath = path.join(outDir, 'recruit-board.json');
	const indexedJsonPath = path.join(outDir, 'recruit-board-indexed.json');
	if (!noWrite) {
		fs.mkdirSync(outDir, { recursive: true });
		fs.writeFileSync(outPath, csvLines.join('\n') + '\n');

		const payload = {
			generatedAt: new Date().toISOString(),
			savePath,
			rowCount: rows.length,
			teamContext,
			recruits: rows,
		};
		fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + '\n');

		const byRecruitRow = {};
		const byBoardRow = {};
		for (const rec of rows) {
			const recruitKey = String(rec.recruitRow);
			if (!byRecruitRow[recruitKey]) {
				byRecruitRow[recruitKey] = [];
			}
			byRecruitRow[recruitKey].push(rec);

			const boardKey = String(rec.boardRow);
			if (!byBoardRow[boardKey]) {
				byBoardRow[boardKey] = [];
			}
			byBoardRow[boardKey].push(rec);
		}

		const indexedPayload = {
			generatedAt: new Date().toISOString(),
			savePath,
			rowCount: rows.length,
			teamContext,
			byRecruitRow,
			byBoardRow,
		};
		fs.writeFileSync(indexedJsonPath, JSON.stringify(indexedPayload, null, 2) + '\n');
	}

	if (summaryJson) {
		console.log(
			JSON.stringify({
				savePath,
				scope: boardOnlyMode ? 'board-only' : 'all-recruits',
				rows: rows.length,
				onMyBoard: rows.filter((r) => r.onMyBoard).length,
				teamContext,
				outPath,
				jsonPath,
				indexedJsonPath,
				wroteFile: !noWrite,
			})
		);
		return;
	}

	console.log(`save: ${savePath}`);
	console.log(`rows: ${rows.length}`);
	if (!noWrite) {
		console.log(`out: ${outPath}`);
		console.log(`json: ${jsonPath}`);
		console.log(`indexedJson: ${indexedJsonPath}`);
	}
}

main().catch((err) => {
	console.error(err.message || err);
	process.exit(1);
});
