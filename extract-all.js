const { spawnSync } = require('child_process');
const path = require('path');
const { resolveInputPath,
	requireCliSavePath,
} = require('./lib/franchise');


const EXTRACTORS = [
	{ id: 'league', script: 'extract-league-snapshot.js' },
	{ id: 'schedule', script: 'extract-schedule.js' },
	{ id: 'teams', script: 'extract-teams.js' },
	{ id: 'stats', script: 'extract-stats.js' },
	{ id: 'recruits', script: 'extract-recruit-board.js', extraArgs: [] },
];

function runExtractor(script, savePath, extraArgs = []) {
	const scriptPath = path.resolve(__dirname, script);
	const args = [scriptPath, savePath, '--summary-json', ...extraArgs];
	const run = spawnSync(process.execPath, args, {
		encoding: 'utf8',
		maxBuffer: 20 * 1024 * 1024,
		env: process.env,
		cwd: __dirname,
	});
	if (run.status !== 0) {
		const errText = (run.stderr || run.stdout || `Extractor failed: ${script}`).trim();
		throw new Error(errText);
	}

	try {
		return JSON.parse((run.stdout || '').trim().split('\n').filter(Boolean).pop());
	} catch (err) {
		throw new Error(`Invalid JSON from ${script}: ${err.message}\n${run.stdout}`);
	}
}

async function extractAll(savePath, { scopes = null } = {}) {
	const resolved = resolveInputPath(savePath);
	const selected = scopes
		? EXTRACTORS.filter((e) => scopes.includes(e.id) || scopes.includes('all'))
		: EXTRACTORS;

	const results = {};
	for (const extractor of selected) {
		results[extractor.id] = runExtractor(extractor.script, resolved, extractor.extraArgs || []);
	}

	return {
		ok: true,
		savePath: resolved,
		generatedAt: new Date().toISOString(),
		results,
	};
}

async function main() {
	const args = process.argv.slice(2);
	const savePath = requireCliSavePath(args, 'extract-all.js');
	const scopeArg = args.find((a) => a.startsWith('--scope='));
	const scopes = scopeArg
		? scopeArg
				.replace('--scope=', '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
		: null;

	const payload = await extractAll(savePath, { scopes });
	console.log(JSON.stringify(payload, null, 2));
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	});
}

module.exports = { extractAll, EXTRACTORS, runExtractor };
