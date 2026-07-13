import { NextResponse } from 'next/server';
import { getDefaultSavesDir } from '@/lib/saves';

export async function GET() {
  return NextResponse.json({ dir: getDefaultSavesDir() });
}
