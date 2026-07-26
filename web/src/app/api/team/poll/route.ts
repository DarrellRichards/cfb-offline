import { spawnSync } from 'child_process';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { REPO_ROOT } from '@/lib/data';
import { assertWritableDynastyPath } from '@/lib/uploads';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const savePath = assertWritableDynastyPath(String(body.savePath || '').trim());
    const poll = String(body.poll || '').trim().toLowerCase();
    const entries = Array.isArray(body.entries) ? body.entries : body.rankings;

    if (poll !== 'media' && poll !== 'coaches') {
      return NextResponse.json({ error: 'Poll must be media or coaches.' }, { status: 400 });
    }
    if (!Array.isArray(entries) || !entries.length) {
      return NextResponse.json({ error: 'Provide an ordered rankings list.' }, { status: 400 });
    }

    const cli = path.join(REPO_ROOT, 'update-team-cli.js');
    const run = spawnSync(
      process.execPath,
      [cli, 'poll', savePath, JSON.stringify({ poll, entries })],
      { encoding: 'utf8', cwd: REPO_ROOT, maxBuffer: 5 * 1024 * 1024 }
    );

    if (run.status !== 0) {
      return NextResponse.json(
        { error: (run.stderr || run.stdout || 'Poll update failed').trim() },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse((run.stdout || '').trim()));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = typeof (err as { status?: number })?.status === 'number' ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: message, code: (err as { code?: string })?.code }, { status });
  }
}
