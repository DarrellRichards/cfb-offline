import { spawnSync } from 'child_process';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getDefaultSavesDir, listDynastySaves, resolveInputPath } from '@/lib/saves';
import { REPO_ROOT } from '@/lib/data';

export async function GET(req: NextRequest) {
  const dirRaw = req.nextUrl.searchParams.get('dir') || '';
  const dir = resolveInputPath(dirRaw || getDefaultSavesDir());
  const saves = listDynastySaves(dir);

  const probed = [];
  for (const save of saves.slice(0, 8)) {
    try {
      const extractorPath = path.join(REPO_ROOT, 'extract-league-snapshot.js');
      const run = spawnSync(process.execPath, [extractorPath, save.fullPath, '--summary-json', '--no-write'], {
        encoding: 'utf8',
        maxBuffer: 5 * 1024 * 1024,
      });
      if (run.status !== 0) {
        probed.push({ name: save.name, fullPath: save.fullPath, score: -1 });
        continue;
      }
      const summary = JSON.parse((run.stdout || '').trim());
      probed.push({
        name: save.name,
        fullPath: save.fullPath,
        score: summary.userTeam ? 1 : 0,
        userTeam: summary.userTeam,
        currentWeek: summary.currentWeek,
      });
    } catch {
      probed.push({ name: save.name, fullPath: save.fullPath, score: -1 });
    }
  }

  probed.sort((a, b) => b.score - a.score);
  return NextResponse.json({ dir, best: probed[0] || null, probed });
}
