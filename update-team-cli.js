const { updateTeamNilPoints, updateTeamProgramPoints } = require('./update-team-nil');
const { updatePollRankings } = require('./update-poll-rankings');
const { resolveInputPath } = require('./lib/franchise');

async function main() {
	const args = process.argv.slice(2);
	const mode = args[0];
	const savePath = resolveInputPath(args[1]);
	const payloadRaw = args[2] || '{}';
	const payload = JSON.parse(payloadRaw);

	if (!savePath) {
		throw new Error('Save path required');
	}

	let result;
	if (mode === 'nil') {
		result = await updateTeamNilPoints(savePath, payload.nilValue, { backup: true });
	} else if (mode === 'points') {
		result = await updateTeamProgramPoints(savePath, payload, { backup: true });
	} else if (mode === 'poll') {
		result = await updatePollRankings(savePath, payload.poll, payload.entries || payload.rankings, {
			backup: true,
		});
	} else {
		throw new Error(`Unknown mode: ${mode}`);
	}

	console.log(JSON.stringify(result));
}

main().catch((err) => {
	console.error(err && err.message ? err.message : err);
	process.exit(1);
});
