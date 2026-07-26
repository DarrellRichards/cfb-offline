import { spawnSync } from 'child_process';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { REPO_ROOT } from '@/lib/data';
import { assertWritableDynastyPath } from '@/lib/uploads';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const savePath = assertWritableDynastyPath(String(body.savePath || '').trim());

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
    const status = typeof (err as { status?: number })?.status === 'number' ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: message, code: (err as { code?: string })?.code }, { status });
  }
}
