import { NextRequest, NextResponse } from 'next/server';
import { getDefaultSavesDir, listDynastySaves, resolveInputPath } from '@/lib/saves';
import { REPO_ROOT } from '@/lib/data';

export async function GET(req: NextRequest) {
  const dirRaw = req.nextUrl.searchParams.get('dir') || '';
  const includeRepo = req.nextUrl.searchParams.get('includeRepo') === '1';
  const dir = resolveInputPath(dirRaw || getDefaultSavesDir());

  const byPath = new Map<string, ReturnType<typeof listDynastySaves>[number]>();
  for (const save of listDynastySaves(dir)) {
    byPath.set(save.fullPath, save);
  }

  if (includeRepo) {
    for (const save of listDynastySaves(REPO_ROOT)) {
      if (!byPath.has(save.fullPath)) byPath.set(save.fullPath, save);
    }
    // Also check common WSL project-relative absolute paths already covered by REPO_ROOT
  }

  const saves = [...byPath.values()].sort((a, b) => b.mtimeMs - a.mtimeMs);
  return NextResponse.json({
    dir,
    repoRoot: includeRepo ? REPO_ROOT : undefined,
    saves,
  });
}
