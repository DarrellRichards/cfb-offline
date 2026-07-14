const fs = require('fs');
const path = require('path');
const { safeField, num, str, normalizeKey } = require('./franchise');

const REQUIREMENTS_PATH = path.resolve(__dirname, '..', 'data', 'physical-ability-requirements.json');
const STATIC_MAP_PATH = path.resolve(__dirname, '..', 'data', 'physical-ability-map.json');

/** PlayerType enum → CFB 27 Labs archetype + position short code */
const PLAYER_TYPE_ARCHETYPE = {
	QB_FieldGeneral: { position: 'QB', archetype: 'Pocket Passer' },
	QB_Improviser: { position: 'QB', archetype: 'Backfield Creator' },
	QB_Scrambler: { position: 'QB', archetype: 'Dual Threat' },
	QB_PureScrambler: { position: 'QB', archetype: 'Pure Runner' },

	HB_ElusiveBack: { position: 'HB', archetype: 'East/West Playmaker' },
	HB_ElusivePower: { position: 'HB', archetype: 'Elusive Bruiser' },
	HB_PowerBack: { position: 'HB', archetype: 'Contact Seeker' },
	HB_PowerBlocking: { position: 'HB', archetype: 'North/South Blocker' },
	HB_PowerReceiving: { position: 'HB', archetype: 'North/South Receiver' },
	HB_ReceivingBack: { position: 'HB', archetype: 'Backfield Threat' },

	WR_DeepThreat: { position: 'WR', archetype: 'Speedster' },
	WR_GadgetReceiver: { position: 'WR', archetype: 'Gadget' },
	WR_Physical: { position: 'WR', archetype: 'Contested Specialist' },
	WR_PhysicalBlocker: { position: 'WR', archetype: 'Gritty Possession' },
	WR_PhysicalRouteRunner: { position: 'WR', archetype: 'Physical Route Runner' },
	WR_ShiftyRouteRunner: { position: 'WR', archetype: 'Elusive Route Runner' },
	WR_Playmaker: { position: 'WR', archetype: 'Route Artist' },

	TE_Blocking: { position: 'TE', archetype: 'Pure Blocker' },
	TE_PhysicalRouteRunner: { position: 'TE', archetype: 'Physical Route Runner' },
	TE_Possession: { position: 'TE', archetype: 'Pure Possession' },
	TE_PossessionBlocking: { position: 'TE', archetype: 'Gritty Possession' },
	TE_VerticalThreat: { position: 'TE', archetype: 'Vertical Threat' },

	// OL / FB / KP have no Labs attribute rows — labels + static slot map only.
	FB_Blocking: { position: 'FB', archetype: 'Blocking' },
	FB_Utility: { position: 'FB', archetype: 'Utility' },
	OT_Agile: { position: 'OL', archetype: 'Agile' },
	OT_PassProtector: { position: 'OL', archetype: 'Pass Protector' },
	OT_Power: { position: 'OL', archetype: 'Raw Strength' },
	OT_WellRounded: { position: 'OL', archetype: 'Well Rounded' },
	G_Agile: { position: 'OL', archetype: 'Agile' },
	G_PassProtector: { position: 'OL', archetype: 'Pass Protector' },
	G_Power: { position: 'OL', archetype: 'Raw Strength' },
	G_WellRounded: { position: 'OL', archetype: 'Well Rounded' },
	C_Agile: { position: 'OL', archetype: 'Agile' },
	C_PassProtector: { position: 'OL', archetype: 'Pass Protector' },
	C_Power: { position: 'OL', archetype: 'Raw Strength' },
	C_WellRounded: { position: 'OL', archetype: 'Well Rounded' },
	KP_Accurate: { position: 'KP', archetype: 'Accurate' },
	KP_Power: { position: 'KP', archetype: 'Power' },

	DE_PowerRusher: { position: 'EDGE', archetype: 'Power Rusher' },
	DE_PurePower: { position: 'EDGE', archetype: 'Pure Power' },
	DE_RunStopper: { position: 'EDGE', archetype: 'Edge Setter' },
	DE_SmallerSpeedRusher: { position: 'EDGE', archetype: 'Speed Rusher' },

	DT_PowerRusher: { position: 'EDGE', archetype: 'Power Rusher' },
	DT_PurePower: { position: 'EDGE', archetype: 'Pure Power' },
	DT_NoseTackle: { position: 'EDGE', archetype: 'Edge Setter' },
	DT_RunStopper: { position: 'EDGE', archetype: 'Edge Setter' },
	DT_SpeedRusher: { position: 'EDGE', archetype: 'Speed Rusher' },

	MLB_FieldGeneral: { position: 'MIKE', archetype: 'Signal Caller' },
	MLB_PassCoverage: { position: 'MIKE', archetype: 'Lurker' },
	MLB_RunStopper: { position: 'MIKE', archetype: 'Thumper' },
	OLB_PassCoverage: { position: 'MIKE', archetype: 'Lurker' },
	OLB_PowerRusher: { position: 'MIKE', archetype: 'Signal Caller' },
	OLB_RunStopper: { position: 'MIKE', archetype: 'Thumper' },

	CB_MantoMan: { position: 'CB', archetype: 'Bump and Run' },
	CB_Slot: { position: 'CB', archetype: 'Boundary' },
	CB_Zone: { position: 'CB', archetype: 'Field' },
	CB_HybridCorner: { position: 'CB', archetype: 'Field' },

	S_Hybrid: { position: 'FS', archetype: 'Hybrid' },
	S_RunSupport: { position: 'FS', archetype: 'Hybrid' },
	S_Zone: { position: 'FS', archetype: 'Coverage Specialist' },
};

const ATTR_FIELD = {
	Acceleration: 'AccelerationRating',
	'Block Shedding': 'BlockSheddingRating',
	'Break Sack': 'BreakSackRating',
	'Break Tackle': 'BreakTackleRating',
	Carrying: 'CarryingRating',
	'Catch in Traffic': 'CatchInTrafficRating',
	Catching: 'CatchingRating',
	'Change of Direction': 'ChangeOfDirectionRating',
	'Deep Route Running': 'DeepRouteRunningRating',
	'Deep Throw Accuracy': 'ThrowAccuracyDeepRating',
	'Finesse Moves': 'FinesseMovesRating',
	'Hit Power': 'HitPowerRating',
	'Impact Blocking': 'ImpactBlockingRating',
	'Juke Move': 'JukeMoveRating',
	'Man Coverage': 'ManCoverageRating',
	'Medium Route Running': 'MediumRouteRunningRating',
	'Medium Throw Accuracy': 'ThrowAccuracyMidRating',
	'Pass Block': 'PassBlockRating',
	'Play Action': 'PlayActionRating',
	'Power Moves': 'PowerMovesRating',
	Pursuit: 'PursuitRating',
	Release: 'ReleaseRating',
	'Run Block': 'RunBlockRating',
	'Short Throw Accuracy': 'ThrowAccuracyShortRating',
	'Spectacular Catch': 'SpectacularCatchRating',
	Speed: 'SpeedRating',
	'Spin Move': 'SpinMoveRating',
	'Stiff Arm': 'StiffArmRating',
	Strength: 'StrengthRating',
	Tackle: 'TackleRating',
	'Throw Accuracy': 'ThrowAccuracyRating',
	'Throw Power': 'ThrowPowerRating',
	'Throw Under Pressure': 'ThrowUnderPressureRating',
	'Throw on the Run': 'ThrowOnTheRunRating',
	Toughness: 'ToughnessRating',
	Trucking: 'TruckingRating',
	'Zone Coverage': 'ZoneCoverageRating',
};

const TIER_RANK = { None: 0, Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 };

let requirementsCache = null;
let staticMapCache = null;

function loadRequirements() {
	if (requirementsCache) return requirementsCache;
	if (!fs.existsSync(REQUIREMENTS_PATH)) {
		requirementsCache = [];
		return requirementsCache;
	}
	const raw = JSON.parse(fs.readFileSync(REQUIREMENTS_PATH, 'utf8'));
	requirementsCache = Array.isArray(raw.abilities) ? raw.abilities : [];
	return requirementsCache;
}

function loadStaticMap() {
	if (staticMapCache) return staticMapCache;
	if (!fs.existsSync(STATIC_MAP_PATH)) {
		staticMapCache = { byPlayerType: {} };
		return staticMapCache;
	}
	staticMapCache = JSON.parse(fs.readFileSync(STATIC_MAP_PATH, 'utf8'));
	return staticMapCache;
}

function normalizeTier(raw) {
	const tier = String(raw || '').trim();
	if (!tier || tier === 'None' || /^(First_|Last_|Count_)/i.test(tier)) return '';
	return tier;
}

function maxTierFromAttrs(playerRec, abilityReq) {
	const field1 = ATTR_FIELD[abilityReq.Attribute];
	if (!field1) return 'None';
	const v1 = num(playerRec, field1);
	let v2 = null;
	if (abilityReq.Attribute2) {
		const field2 = ATTR_FIELD[abilityReq.Attribute2];
		if (field2) v2 = num(playerRec, field2);
	}

	let best = 'None';
	for (const tier of ['Bronze', 'Silver', 'Gold', 'Platinum']) {
		const need1 = Number(abilityReq[tier]);
		if (!Number.isFinite(need1)) continue;
		if (v1 < need1) break;
		const raw2 = abilityReq[`${tier}2`];
		if (raw2 !== '' && raw2 != null) {
			const need2 = Number(raw2);
			if (Number.isFinite(need2) && (v2 == null || v2 < need2)) break;
		}
		best = tier;
	}
	return best;
}

function archetypePool(playerType) {
	const key = String(playerType || '').trim();
	const meta = PLAYER_TYPE_ARCHETYPE[key];
	if (!meta) return [];
	return loadRequirements().filter(
		(row) => row.Position_Short === meta.position && row.Archetype === meta.archetype
	);
}

function staticSlotName(playerType, slot) {
	const map = loadStaticMap();
	const typeKey = normalizeKey(playerType);
	const entry = map.byPlayerType && map.byPlayerType[typeKey];
	if (!entry) return '';
	return String(entry[`slot${slot}`] || '').trim();
}

/**
 * Resolve physical abilities for a player.
 * Prefers CFB 27 attribute-threshold matching within the archetype pool
 * (slot index alone is not reliable). Falls back to static slot maps for OL/KP/etc.
 */
function resolvePhysicalAbilityEntries(playerRec, playerType) {
	const observed = [];
	for (let slot = 1; slot <= 5; slot += 1) {
		const tier = normalizeTier(safeField(playerRec, `PhysicalAbility${slot}`));
		if (!tier) continue;
		observed.push({ slot, tier });
	}
	if (!observed.length) return [];

	const pool = archetypePool(playerType);
	if (pool.length) {
		const predicted = pool
			.map((ability) => ({
				name: String(ability.Ability || '').trim(),
				tier: maxTierFromAttrs(playerRec, ability),
			}))
			.filter((row) => row.name && row.tier !== 'None');

		// Match predicted unlocks to observed slot tiers (exact tier match).
		const usedPredicted = new Set();
		const usedObserved = new Set();
		const matched = [];

		const obsByTier = [...observed].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.slot - b.slot);
		const predByTier = [...predicted].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.name.localeCompare(b.name));

		for (const obs of obsByTier) {
			const hit = predByTier.find(
				(pred, idx) => !usedPredicted.has(idx) && pred.tier === obs.tier
			);
			if (!hit) continue;
			const predIdx = predByTier.indexOf(hit);
			usedPredicted.add(predIdx);
			usedObserved.add(obs.slot);
			matched.push({
				slot: obs.slot,
				name: hit.name,
				tier: obs.tier,
				label: `${hit.name} (${obs.tier})`,
				matchedBy: 'attributes',
			});
		}

		// Remaining observed slots: soft-match nearest lower/equal predicted tier, else static/unknown.
		for (const obs of observed) {
			if (usedObserved.has(obs.slot)) continue;
			let best = null;
			let bestIdx = -1;
			let bestDelta = Infinity;
			predByTier.forEach((pred, idx) => {
				if (usedPredicted.has(idx)) return;
				const delta = TIER_RANK[obs.tier] - TIER_RANK[pred.tier];
				if (delta < 0) return;
				if (delta < bestDelta) {
					bestDelta = delta;
					best = pred;
					bestIdx = idx;
				}
			});
			if (best) {
				usedPredicted.add(bestIdx);
				matched.push({
					slot: obs.slot,
					name: best.name,
					tier: obs.tier,
					label: `${best.name} (${obs.tier})`,
					matchedBy: 'attributes-soft',
				});
				continue;
			}
			const fallback = staticSlotName(playerType, obs.slot);
			matched.push({
				slot: obs.slot,
				name: fallback,
				tier: obs.tier,
				label: fallback ? `${fallback} (${obs.tier})` : obs.tier,
				matchedBy: fallback ? 'static-slot' : 'tier-only',
			});
		}

		return matched.sort((a, b) => a.slot - b.slot);
	}

	// OL / FB / KP and other types without Labs rows: static slot map only.
	return observed.map((obs) => {
		const name = staticSlotName(playerType, obs.slot);
		return {
			slot: obs.slot,
			name,
			tier: obs.tier,
			label: name ? `${name} (${obs.tier})` : obs.tier,
			matchedBy: name ? 'static-slot' : 'tier-only',
		};
	});
}

function resolveArchetypeLabel(playerType) {
	const meta = PLAYER_TYPE_ARCHETYPE[String(playerType || '').trim()];
	if (!meta) return '';
	return meta.archetype;
}

module.exports = {
	PLAYER_TYPE_ARCHETYPE,
	resolvePhysicalAbilityEntries,
	resolveArchetypeLabel,
	loadRequirements,
};
