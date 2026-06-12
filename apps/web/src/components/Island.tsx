'use client';

import { theme } from '../lib/theme';

export function Island() {
  return (
    <div
      className="absolute top-0 left-1/2 -translate-x-1/2 z-[100]"
      style={{
        width: 120,
        height: 32,
        background: theme.bg0,
        borderRadius: '0 0 20px 20px',
      }}
    />
  );
}
