import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import path from 'path';
import { REPO_ROOT } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const require = createRequire(path.join(REPO_ROOT, 'package.json'));

function loadImport() {
  return require(path.join(REPO_ROOT, 'lib', 'season-import.js')) as {
    summaryTemplateCsv: () => string;
    scheduleTemplateCsv: () => string;
  };
}

export async function GET(req: NextRequest) {
  try {
    const which = (req.nextUrl.searchParams.get('type') || 'summary').toLowerCase();
    const { summaryTemplateCsv, scheduleTemplateCsv } = loadImport();

    if (which === 'schedule') {
      return new NextResponse(scheduleTemplateCsv(), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="schedule.csv"',
        },
      });
    }

    return new NextResponse(summaryTemplateCsv(), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="season-summary.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
