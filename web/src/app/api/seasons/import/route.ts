import { createRequire } from 'module';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { resolveInputPath } from '@/lib/saves';
import { DATA_DIR, REPO_ROOT } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const require = createRequire(path.join(REPO_ROOT, 'package.json'));

function loadArchive() {
  return require(path.join(REPO_ROOT, 'lib', 'season-archive.js')) as {
    importSeasonSnapshots: (
      savePath: string,
      opts: { seasonYear: number; snapshots: Record<string, unknown>; replace?: boolean }
    ) => Promise<{
      dynastyId: string;
      seasonYear: number;
      seasonId: number;
      replaced: boolean;
      snapshotNames: string[];
    }>;
    findSeasonByYear: (
      savePath: string,
      seasonYear: number
    ) => Promise<{ seasonId: number; seasonYear: number } | null>;
  };
}

function loadImport() {
  return require(path.join(REPO_ROOT, 'lib', 'season-import.js')) as {
    buildImportedSeasonPayloads: (opts: {
      summaryText: string;
      scheduleText: string;
      savePath: string;
      dataDir?: string;
      seasonYearOverride?: number | null;
    }) => {
      seasonYear: number;
      summary: Record<string, unknown>;
      league: unknown;
      schedule: unknown;
      gameCount: number;
      warnings: string[];
      unmatchedTeamCount: number;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const savePathRaw = String(form.get('savePath') || '').trim();
    const savePath = resolveInputPath(savePathRaw);
    if (!savePath) {
      return NextResponse.json({ error: 'savePath required.' }, { status: 400 });
    }

    const replaceRaw = String(form.get('replace') || 'true').toLowerCase();
    const replace = replaceRaw !== 'false' && replaceRaw !== '0';
    const previewOnly = String(form.get('previewOnly') || '').toLowerCase() === 'true';
    const yearRaw = String(form.get('seasonYear') || '').trim();
    const seasonYearOverride = yearRaw ? Number(yearRaw) : null;

    const summaryFile = form.get('summary');
    const scheduleFile = form.get('schedule');
    if (!(summaryFile instanceof File) || !(scheduleFile instanceof File)) {
      return NextResponse.json(
        { error: 'summary and schedule CSV files are required.' },
        { status: 400 }
      );
    }

    const summaryText = await summaryFile.text();
    const scheduleText = await scheduleFile.text();

    process.env.CFB_REPO_ROOT = REPO_ROOT;
    process.env.CFB_DATA_DIR = DATA_DIR;

    const { buildImportedSeasonPayloads } = loadImport();
    const { importSeasonSnapshots, findSeasonByYear } = loadArchive();

    const built = buildImportedSeasonPayloads({
      summaryText,
      scheduleText,
      savePath,
      dataDir: DATA_DIR,
      seasonYearOverride:
        seasonYearOverride != null && Number.isFinite(seasonYearOverride)
          ? seasonYearOverride
          : null,
    });

    const existing = await findSeasonByYear(savePath, built.seasonYear);

    if (previewOnly) {
      return NextResponse.json({
        ok: true,
        preview: true,
        seasonYear: built.seasonYear,
        gameCount: built.gameCount,
        warnings: built.warnings,
        unmatchedTeamCount: built.unmatchedTeamCount,
        summary: built.summary,
        exists: Boolean(existing),
        existingSeasonId: existing?.seasonId ?? null,
      });
    }

    if (!replace) {
      if (existing) {
        return NextResponse.json(
          {
            error: `Season ${built.seasonYear} already exists in the archive.`,
            code: 'SEASON_EXISTS',
            seasonId: existing.seasonId,
            seasonYear: built.seasonYear,
            gameCount: built.gameCount,
            warnings: built.warnings,
          },
          { status: 409 }
        );
      }
    }

    const result = await importSeasonSnapshots(savePath, {
      seasonYear: built.seasonYear,
      replace,
      snapshots: {
        league: built.league,
        schedule: built.schedule,
      },
    });

    return NextResponse.json({
      ok: true,
      ...result,
      gameCount: built.gameCount,
      warnings: built.warnings,
      unmatchedTeamCount: built.unmatchedTeamCount,
      summary: built.summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
