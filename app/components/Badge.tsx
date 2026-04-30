'use client';

import { theme } from '../lib/theme';

interface BadgeProps {
  status: 'open' | 'full' | 'closed';
}

export function Badge({ status }: BadgeProps) {
  const map = {
    open: {
      label: '모집중',
      bg: theme.mintDim,
      color: theme.mint,
      border: 'rgba(0,229,184,0.25)',
    },
    full: {
      label: '정원마감',
      bg: theme.warmDim,
      color: theme.warm,
      border: 'rgba(255,143,94,0.25)',
    },
    closed: { label: '모집종료', bg: theme.card, color: theme.txt2, border: theme.border },
  };

  const m = map[status] || map.closed;

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
      }}
    >
      {m.label}
    </span>
  );
}
