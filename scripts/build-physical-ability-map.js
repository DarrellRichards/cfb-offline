/**
 * Builds data/physical-ability-map.json from curated CFB 27 archetype slot orders.
 * Names are not stored in dynasty saves — only AbilitiesRank tiers per PhysicalAbility1–5.
 * Slot order follows collegefootball.gg CFB 27 Physical ability lists (fallback when Labs
 * attribute thresholds are unavailable — mainly OL / FB / KP).
 */
const fs = require('fs');
const path = require('path');

/** @type {Record<string, string[]>} */
const ARCHETYPE_SLOTS = {
	// QB (Labs attribute match preferred; static is fallback)
	'QB|Pocket Passer': ['Resistance', 'Step Up', 'Sleight Of Hand', 'Dot!', 'On Time'],
	'QB|Backfield Creator': ['Off Platform', 'Pull Down', 'On Time', 'Magician', 'Mobile Deadeye'],
	'QB|Dual Threat': ['Downhill', 'Extender', 'Option King', 'Dot!', 'Mobile Resistance'],
	'QB|Pure Runner': ['Downhill', 'Option King', 'Shifty', 'Side Step', 'Workhorse'],

	// HB
	'HB|Backfield Threat': ['360', 'Safety Valve', 'Takeoff', 'Side Step', 'Recoup'],
	'HB|Contact Seeker': ['Downhill', 'Workhorse', 'Battering Ram', 'Ball Security', 'Balanced'],
	'HB|East/West Playmaker': ['Recoup', 'Shifty', 'Side Step', '360', 'Arm Bar'],
	'HB|Elusive Bruiser': ['Shifty', 'Headfirst', 'Side Step', 'Downhill', 'Arm Bar'],
	'HB|North/South Receiver': ['Balanced', 'Arm Bar', 'Safety Valve', 'Headfirst', 'Downhill'],
	'HB|North/South Blocker': ['Headfirst', 'Balanced', 'Sidekick', 'Ball Security', 'Strong Grip'],

	// FB
	'FB|Blocking': ['Strong Grip', 'Second Level', 'Pocket Shield', 'Sidekick', 'Screen Enforcer'],
	'FB|Utility': ['Safety Valve', 'Balanced', 'Screen Enforcer', 'Sidekick', 'Recoup'],

	// WR
	'WR|Contested Specialist': ['50/50', 'Workhorse', 'Balanced', 'Headfirst', 'Downhill'],
	'WR|Elusive Route Runner': ['360', 'Cutter', 'Double Dip', 'Recoup', 'Side Step'],
	'WR|Gadget': ['Side Step', 'Shifty', 'Dot!', 'Cutter', 'Extender'],
	'WR|Gritty Possession': ['Second Level', 'Outside Shield', 'Strong Grip', 'Workhorse', 'Sure Hands'],
	'WR|Physical Route Runner': ['Downhill', 'Press Pro', 'Sure Hands', '50/50', 'Cutter'],
	'WR|Route Artist': ['Cutter', 'Lay Out', 'Recoup', 'Double Dip', 'Sure Hands'],
	'WR|Speedster': ['Side Step', 'Double Dip', 'Take Off', 'Recoup', 'Shifty'],

	// TE
	'TE|Gritty Possession': ['Workhorse', 'Strong Grip', 'Sure Hands', 'Outside Shield', 'Battering Ram'],
	'TE|Physical Route Runner': ['Balanced', '50/50', 'Cutter', 'Downhill', 'Sure Hands'],
	'TE|Pure Possession': ['Sure Hands', 'Wear Down', 'Strong Grip', 'Outside Shield', 'Balanced'],
	'TE|Pure Blocker': ['Strong Grip', 'Quick Drop', 'Outside Shield', 'Pocket Shield', 'Second Level'],
	'TE|Vertical Threat': ['Workhorse', 'Balanced', 'Take Off', 'Recoup', '50/50'],

	// OL — CFB 27 (shared across OT / G / C)
	'OL|Agile': ['Screen Enforcer', 'Quick Step', 'Option Shield', 'Outside Shield', 'Quick Drop'],
	'OL|Pass Protector': ['Pocket Shield', 'Quick Drop', 'PA Shield', 'Strong Grip', 'Wear Down'],
	'OL|Raw Strength': ['Strong Grip', 'Workhorse', 'Second Level', 'Inside Shield', 'Ground N Pound'],
	'OL|Well Rounded': ['Pocket Shield', 'Outside Shield', 'Strong Grip', 'Option Shield', 'Inside Shield'],

	// DL
	'DL|Edge Setter': ['Grip Breaker', 'Inside Disruptor', 'Outside Disruptor', 'Option Disruptor', 'Workhorse'],
	'DL|Power Rusher': ['Pocket Disruptor', 'Duress', 'Grip Breaker', 'Workhorse', 'Take Down'],
	'DL|Pure Power': ['Grip Breaker', 'Pocket Disruptor', 'Inside Disruptor', 'Workhorse', 'Hammer'],
	'DL|Speed Rusher': ['Quick Jump', 'Duress', 'Take Down', 'Pocket Disruptor', 'Recoup'],

	// LB
	'LB|Lurker': ['House Call', 'Knockout', 'Bouncer', 'Robber', 'Wrap Up'],
	'LB|Signal Caller': ['Take Down', 'Workhorse', 'Blow Up', 'Wrap Up', 'Hammer'],
	'LB|Thumper': ['Grip Breaker', 'Wrap Up', 'Aftershock', 'Blow Up', 'Hammer'],

	// CB
	'CB|Boundary': ['Jammer', 'Blanket Coverage', 'Lay Out', 'Wrap Up', 'Quick Jump'],
	'CB|Bump and Run': ['Blanket Coverage', 'Jammer', 'House Call', 'Ball Hawk', 'Knockout'],
	'CB|Field': ['Wrap Up', 'Robber', 'Knockout', 'Blanket Coverage', 'Ball Hawk'],
	'CB|Zone': ['Knockout', 'Lay Out', 'House Call', 'Ball Hawk', 'Bouncer'],

	// S
	'S|Box Specialist': ['Aftershock', 'Wrap Up', 'Hammer', 'Blow Up', 'Workhorse'],
	'S|Coverage Specialist': ['Ball Hawk', 'Lay Out', 'House Call', 'Robber', 'Knockout'],
	'S|Hybrid': ['Wrap Up', 'Hammer', 'Knockout', 'Aftershock', 'Blow Up'],

	// K / P
	'K|Accurate': ['Chip Shot', 'Deep Range', 'Mega Leg'],
	'K|Power': ['Deep Range', 'Mega Leg', 'Coffin Corner'],
	'P|Accurate': ['Chip Shot', 'Deep Range', 'Mega Leg'],
	'P|Power': ['Deep Range', 'Mega Leg', 'Coffin Corner'],
};

/** Map PlayerType enum → ARCHETYPE_SLOTS key */
const PLAYER_TYPE_TO_ARCH = {
	QB_FieldGeneral: 'QB|Pocket Passer',
	QB_Improviser: 'QB|Backfield Creator',
	QB_Scrambler: 'QB|Dual Threat',
	QB_PureScrambler: 'QB|Pure Runner',

	HB_ElusiveBack: 'HB|East/West Playmaker',
	HB_ElusivePower: 'HB|Elusive Bruiser',
	HB_PowerBack: 'HB|Contact Seeker',
	HB_PowerBlocking: 'HB|North/South Blocker',
	HB_PowerReceiving: 'HB|North/South Receiver',
	HB_ReceivingBack: 'HB|Backfield Threat',

	FB_Blocking: 'FB|Blocking',
	FB_Utility: 'FB|Utility',

	WR_DeepThreat: 'WR|Speedster',
	WR_Physical: 'WR|Contested Specialist',
	WR_PhysicalBlocker: 'WR|Gritty Possession',
	WR_PhysicalRouteRunner: 'WR|Physical Route Runner',
	WR_ShiftyRouteRunner: 'WR|Elusive Route Runner',
	WR_Playmaker: 'WR|Route Artist',
	WR_GadgetReceiver: 'WR|Gadget',
	WR_Slot: 'WR|Elusive Route Runner',

	TE_Blocking: 'TE|Pure Blocker',
	TE_Possession: 'TE|Pure Possession',
	TE_PossessionBlocking: 'TE|Gritty Possession',
	TE_VerticalThreat: 'TE|Vertical Threat',
	TE_PhysicalRouteRunner: 'TE|Physical Route Runner',

	OT_Agile: 'OL|Agile',
	OT_PassProtector: 'OL|Pass Protector',
	OT_Power: 'OL|Raw Strength',
	OT_WellRounded: 'OL|Well Rounded',

	G_Agile: 'OL|Agile',
	G_PassProtector: 'OL|Pass Protector',
	G_Power: 'OL|Raw Strength',
	G_WellRounded: 'OL|Well Rounded',

	C_Agile: 'OL|Agile',
	C_PassProtector: 'OL|Pass Protector',
	C_Power: 'OL|Raw Strength',
	C_WellRounded: 'OL|Well Rounded',

	DE_PowerRusher: 'DL|Power Rusher',
	DE_PurePower: 'DL|Pure Power',
	DE_RunStopper: 'DL|Edge Setter',
	DE_SmallerSpeedRusher: 'DL|Speed Rusher',

	DT_PowerRusher: 'DL|Power Rusher',
	DT_PurePower: 'DL|Pure Power',
	DT_NoseTackle: 'DL|Edge Setter',
	DT_RunStopper: 'DL|Edge Setter',
	DT_SpeedRusher: 'DL|Speed Rusher',

	OLB_PassCoverage: 'LB|Lurker',
	OLB_PowerRusher: 'LB|Signal Caller',
	OLB_RunStopper: 'LB|Thumper',

	MLB_FieldGeneral: 'LB|Signal Caller',
	MLB_PassCoverage: 'LB|Lurker',
	MLB_RunStopper: 'LB|Thumper',

	CB_MantoMan: 'CB|Bump and Run',
	CB_Slot: 'CB|Boundary',
	CB_Zone: 'CB|Zone',
	CB_HybridCorner: 'CB|Field',

	S_Hybrid: 'S|Hybrid',
	S_RunSupport: 'S|Box Specialist',
	S_Zone: 'S|Coverage Specialist',

	KP_Accurate: 'K|Accurate',
	KP_Power: 'K|Power',
};

function slotsToObj(names) {
	const obj = {};
	names.forEach((name, idx) => {
		obj[`slot${idx + 1}`] = name;
	});
	return obj;
}

const byPlayerType = {};
for (const [playerType, archKey] of Object.entries(PLAYER_TYPE_TO_ARCH)) {
	const slots = ARCHETYPE_SLOTS[archKey];
	if (!slots || !slots.length) continue;
	byPlayerType[playerType.toUpperCase().replace(/[^A-Z0-9_]/g, '')] = slotsToObj(slots);
}

const payload = {
	_meta: {
		note: 'Physical ability display names by PlayerType (archetype) and slot. Save stores tier only on PhysicalAbility1–5.',
		tiers: ['Bronze', 'Silver', 'Gold', 'Platinum'],
		source: 'CFB 27 physical ability lists (collegefootball.gg). Slot order is best-effort for types without Labs attribute thresholds.',
	},
	byPlayerType,
	aliases: Object.fromEntries(
		Object.entries(PLAYER_TYPE_TO_ARCH).map(([k, v]) => [
			k.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
			v,
		])
	),
};

const outPath = path.resolve(__dirname, '..', 'data', 'physical-ability-map.json');
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Wrote ${outPath} (${Object.keys(byPlayerType).length} player types)`);
