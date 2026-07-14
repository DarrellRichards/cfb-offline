const fs = require('fs');
const text = fs.readFileSync(
	'C:/Users/richd/.cursor/projects/c-Users-richd-Desktop-CFB27-Mods-offline-cfb/agent-tools/923c2271-210b-4fae-9226-820a6cd6beeb.txt',
	'utf8'
);
const start = text.indexOf('Abilities by Position & Tendency (Based on Generated Recruits)');
const end = text.indexOf('Skill Groups by Pos. & Archetype', start);
const section = text.slice(start, end);
const lines = section
	.split('\n')
	.map((l) =>
		l
			.replace(/^[|>*\s]+/, '')
			.replace(/\*+$/, '')
			.trim()
	)
	.filter(Boolean);

const MENTAL = new Set([
	'Clearheaded',
	'Fan Favorite',
	'Field General',
	'Headstrong',
	'Road Dog',
	'Team Player',
	'The Natural',
	'Winning Time',
	'Best Friend',
	'OL Rally',
	'DL Rally',
	'Legion',
	'Clutch Kicker',
]);
const POS = new Set(['QB', 'HB', 'FB', 'WR', 'TE', 'OT', 'OG', 'C', 'DE', 'DT', 'OLB', 'MLB', 'CB', 'S', 'K', 'P']);
const TENDS = new Set([
	'Field General',
	'Improviser',
	'Scrambler',
	'Elusive Back',
	'Power Back',
	'Receiving Back',
	'Blocking',
	'Utility',
	'Deep Threat',
	'Physical',
	'Route Runner',
	'Possession',
	'Vertical Threat',
	'Agile',
	'Pass Protector',
	'Power',
	'Power Rusher',
	'Run Stopper',
	'Speed Rusher',
	'Pass Coverage',
	'Man to Man',
	'Slot',
	'Zone',
	'Hybrid',
	'Run Support',
	'Accurate',
]);

let pos = '';
let tendency = '';
let mode = '';
const out = {};

function isSkill(line) {
	return /Accuracy|Power|IQ|Health|Elusiveness|Quickness|Hands|Route|Blocking|Footwork|Pass Rush|Run Stopping|Pass Coverage|Run Support|Man Coverage|Zone Coverage|Kick |Throw |Finesse|Pass Blocking|Run Blocking/.test(
		line
	);
}

for (const raw of lines) {
	const line = raw.replace(/\*$/, '');
	if (['Pos.', 'Tendency', 'Physical (5 Max.)', 'Mental (3 Max.)', 'Skill Groups'].includes(line)) continue;
	if (POS.has(line)) {
		pos = line;
		tendency = '';
		mode = 'wait';
		continue;
	}
	if (TENDS.has(line)) {
		tendency = line;
		mode = 'phys';
		const key = `${pos}|${tendency}`;
		if (!out[key]) out[key] = [];
		continue;
	}
	if (MENTAL.has(line)) {
		mode = 'mental';
		continue;
	}
	if (mode !== 'phys') continue;
	if (isSkill(line)) {
		mode = 'skill';
		continue;
	}
	const key = `${pos}|${tendency}`;
	if (!out[key]) out[key] = [];
	if (!out[key].includes(line) && out[key].length < 5) out[key].push(line);
}

console.log(JSON.stringify(out, null, 2));
