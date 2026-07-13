import { spawnSync } from 'child_process';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { DATA_DIR, REPO_ROOT } from '@/lib/data';

function runArchiveCli(args: string[]) {
  const cli = path.join(REPO_ROOT, 'archive-cli.js');
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      CFB_REPO_ROOT: REPO_ROOT,
      CFB_DATA_DIR: DATA_DIR,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const savePath = req.nextUrl.searchParams.get('savePath') || '';
    const args = savePath ? ['list', savePath] : ['list'];
    const run = runArchiveCli(args);
    if (run.status !== 0) {
      return NextResponse.json(
        { error: (run.stderr || run.stdout || 'Failed to list seasons').trim() },
        { status: 500 }
      );
    }
    const payload = JSON.parse((run.stdout || '').trim());
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const seasonId = Number(body.seasonId);
    if (!Number.isFinite(seasonId) || seasonId <= 0) {
      return NextResponse.json({ error: 'seasonId required.' }, { status: 400 });
    }
    const run = runArchiveCli(['restore', String(seasonId)]);
    if (run.status !== 0) {
      return NextResponse.json(
        { error: (run.stderr || run.stdout || 'Failed to restore season').trim() },
        { status: 500 }
      );
    }
    const payload = JSON.parse((run.stdout || '').trim());
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
