import fs from 'fs';
import os from 'os';
import path from 'path';

export function resolveInputPath(p: string) {
  if (!p) return p;
  if (fs.existsSync(p)) return p;

  const winDriveMatch = p.match(/^([A-Za-z]):\\(.*)$/);
  if (winDriveMatch) {
    const drive = winDriveMatch[1].toLowerCase();
    const rest = winDriveMatch[2].replace(/\\/g, '/');
    const wslPath = `/mnt/${drive}/${rest}`;
    if (fs.existsSync(wslPath)) return wslPath;
  }

  return p;
}

export function getDefaultSavesDir() {
  const docs = path.join(os.homedir(), 'Documents');
  const direct = path.join(docs, 'EA SPORTS College Football 27', 'saves');
  if (fs.existsSync(direct)) return direct;

  const user = process.env.USERNAME || process.env.USER;
  if (user) {
    const candidates = [
      `/mnt/c/Users/${user}/OneDrive/Documents/EA SPORTS College Football 27/saves`,
      `/mnt/c/Users/${user}/Documents/EA SPORTS College Football 27/saves`,
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return direct;
}

function looksLikeSaveName(name: string) {
  return /^DYNASTY/i.test(name);
}

export type DynastySave = {
  name: string;
  fullPath: string;
  mtimeMs: number;
  size: number;
};

export function listDynastySaves(dirPath: string): DynastySave[] {
  if (!dirPath || !fs.existsSync(dirPath)) return [];

  const out: DynastySave[] = [];
  for (const name of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, name);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    if (!looksLikeSaveName(name)) continue;
    out.push({ name, fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
  }

  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}
