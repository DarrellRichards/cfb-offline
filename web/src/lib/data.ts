import path from 'path';
import fs from 'fs';

export const REPO_ROOT = process.env.CFB_REPO_ROOT
  ? path.resolve(process.env.CFB_REPO_ROOT)
  : path.resolve(process.cwd(), '..');

export const DATA_DIR = process.env.CFB_DATA_DIR
  ? path.resolve(process.env.CFB_DATA_DIR)
  : path.join(REPO_ROOT, 'data');

export type SnapshotName = 'league' | 'schedule' | 'teams' | 'stats' | 'awards' | 'recruits';

const FILE_MAP: Record<SnapshotName, string> = {
  league: 'league-snapshot.json',
  schedule: 'schedule.json',
  teams: 'teams.json',
  stats: 'stats.json',
  awards: 'awards.json',
  recruits: 'recruit-board.json',
};

export function snapshotPath(name: SnapshotName) {
  return path.join(DATA_DIR, FILE_MAP[name]);
}

export function readSnapshot<T = unknown>(name: SnapshotName): T | null {
  const filePath = snapshotPath(name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function snapshotMeta(name: SnapshotName) {
  const filePath = snapshotPath(name);
  if (!fs.existsSync(filePath)) {
    return { exists: false as const, path: filePath };
  }
  const stat = fs.statSync(filePath);
  return {
    exists: true as const,
    path: filePath,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  };
}
