import { spawnSync } from 'child_process';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { resolveInputPath } from '@/lib/saves';
import { REPO_ROOT } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const savePath = resolveInputPath(String(body.savePath || '').trim());
    if (!savePath) {
      return NextResponse.json({ error: 'Save file not found.' }, { status: 400 });
    }

    const cli = path.join(REPO_ROOT, 'update-team-cli.js');
    const payload = {
      totalBudgetValue: body.totalBudgetValue,
      nilValue: body.nilValue,
      recruitValue: body.recruitValue,
      brandExposureValue: body.brandExposureValue,
      conferencePrestigeValue: body.conferencePrestigeValue,
      programTraditionsValue: body.programTraditionsValue,
      stadiumAtmosphereValue: body.stadiumAtmosphereValue,
    };

    const run = spawnSync(
      process.execPath,
      [cli, 'points', savePath, JSON.stringify(payload)],
      { encoding: 'utf8', cwd: REPO_ROOT, maxBuffer: 5 * 1024 * 1024 }
    );

    if (run.status !== 0) {
      return NextResponse.json(
        { error: (run.stderr || run.stdout || 'Points update failed').trim() },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse((run.stdout || '').trim()));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
