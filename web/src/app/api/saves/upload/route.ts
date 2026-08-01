import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { ensureUploadsDir, sanitizeDynastyUploadName } from '@/lib/uploads';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_BYTES = 256 * 1024 * 1024; // 256MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Choose a DYNASTY save file to upload.' }, { status: 400 });
    }

    const upload = file as File;
    const safeName = sanitizeDynastyUploadName(upload.name || 'DYNASTY');
    if (typeof upload.size === 'number' && upload.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Dynasty file is too large (max 256MB).' }, { status: 413 });
    }

    const uploadsDir = ensureUploadsDir();
    const savePath = path.join(uploadsDir, safeName);

    const nodeStream = Readable.fromWeb(upload.stream() as import('stream/web').ReadableStream);
    await pipeline(nodeStream, createWriteStream(savePath));

    return NextResponse.json({
      ok: true,
      name: safeName,
      savePath,
      size: upload.size || null,
      viewOnly: true,
      message: 'Uploaded for viewing only. Extract to load the desk.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
