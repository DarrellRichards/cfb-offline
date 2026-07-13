import { spawnSync } from 'child_process';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { resolveInputPath } from '@/lib/saves';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const savePathRaw = String(body.savePath || '').trim();
    const scopeRaw = String(body.scope || 'all').trim();
    const savePath = resolveInputPath(savePathRaw);

    if (!savePath) {
      return NextResponse.json({ error: 'Save path required.' }, { status: 400 });
    }

    const extractorPath = path.join(REPO_ROOT, 'extract-all.js');
    const args = [extractorPath, savePath];
    if (scopeRaw && scopeRaw !== 'all') {
      args.push(`--scope=${scopeRaw}`);
    }

    const run = spawnSync(process.execPath, args, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        CFB_REPO_ROOT: REPO_ROOT,
        CFB_DATA_DIR: DATA_DIR,
      },
    });

    if (run.status !== 0) {
      return NextResponse.json(
        { error: (run.stderr || run.stdout || 'Extract failed').trim() },
        { status: 500 }
      );
    }

    const payload = JSON.parse((run.stdout || '').trim());

    let archive = null;
    let archiveError = null;
    if (!scopeRaw || scopeRaw === 'all' || scopeRaw === 'recruits') {
      const archived = runArchiveCli(['archive', savePath]);
      if (archived.status === 0) {
        try {
          archive = JSON.parse((archived.stdout || '').trim());
        } catch {
          archive = { ok: true };
        }
      } else {
        archiveError = (archived.stderr || archived.stdout || 'Archive failed').trim();
      }
    }

    return NextResponse.json({ ...payload, archive, archiveError });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
