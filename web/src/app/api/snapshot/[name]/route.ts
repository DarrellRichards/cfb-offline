import { NextResponse } from 'next/server';
import { readSnapshot, snapshotMeta, type SnapshotName } from '@/lib/data';

const NAMES: SnapshotName[] = ['league', 'schedule', 'teams', 'stats', 'awards', 'recruits'];

export async function GET(
  _req: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  if (name === 'status') {
    return NextResponse.json({
      snapshots: Object.fromEntries(NAMES.map((n) => [n, snapshotMeta(n)])),
    });
  }

  if (!NAMES.includes(name as SnapshotName)) {
    return NextResponse.json({ error: 'Unknown snapshot' }, { status: 404 });
  }

  const data = readSnapshot(name as SnapshotName);
  if (!data) {
    return NextResponse.json({ error: `Snapshot ${name} not found. Extract a dynasty first.` }, { status: 404 });
  }

  return NextResponse.json(data);
}
