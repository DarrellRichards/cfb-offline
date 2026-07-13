'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/format';

/** Renders nothing until mounted, then the formatted date — safest for hydration. */
export function ClientDate({ value }: { value: string | number | Date }) {
  const [text, setText] = useState('');
  useEffect(() => {
    setText(formatDateTime(value));
  }, [value]);
  return <>{text}</>;
}
