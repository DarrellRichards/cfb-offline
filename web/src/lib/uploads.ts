import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/data';
import { resolveInputPath } from '@/lib/saves';

export const UPLOADS_DIR_NAME = 'uploads';

export function getUploadsDir() {
  return path.join(DATA_DIR, UPLOADS_DIR_NAME);
}

export function ensureUploadsDir() {
  const dir = getUploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function sanitizeDynastyUploadName(name: string) {
  const base = path.basename(String(name || '').trim()).replace(/[<>:"|?*\u0000-\u001f]/g, '_');
  if (!base || !/^DYNASTY/i.test(base)) {
    throw new Error('Upload a DYNASTY save file (name must start with DYNASTY).');
  }
  // Keep extensions / suffixes the game uses; block path tricks.
  if (base.includes('..') || base.includes('/') || base.includes('\\')) {
    throw new Error('Invalid dynasty file name.');
  }
  return base;
}

export function isUploadedSavePath(savePath: string) {
  const resolved = resolveInputPath(String(savePath || '').trim());
  if (!resolved) return false;
  const uploadsRoot = path.resolve(getUploadsDir());
  const candidate = path.resolve(resolved);
  return candidate === uploadsRoot || candidate.startsWith(uploadsRoot + path.sep);
}

export function assertWritableDynastyPath(savePath: string) {
  const resolved = resolveInputPath(String(savePath || '').trim());
  if (!resolved || !fs.existsSync(resolved)) {
    const err = new Error('Save file not found.') as Error & { status: number };
    err.status = 400;
    throw err;
  }
  if (isUploadedSavePath(resolved)) {
    const err = new Error(
      'This dynasty was uploaded for viewing only. Cloud hosts cannot write changes back into the save file.'
    ) as Error & { status: number; code: string };
    err.status = 403;
    err.code = 'view_only';
    throw err;
  }
  return resolved;
}
