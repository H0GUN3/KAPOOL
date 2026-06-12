import type { RideStatus } from '@kapool/shared';
import { theme } from '../lib/theme';

interface BadgeProps {
  status: RideStatus;
}

export function Badge({ status }: BadgeProps) {
  const map = {
    open: {
      label: '모집중',
      bg: theme.mintDim,
      color: theme.mint,
      border: theme.borderMint,
    },
    full: {
      label: '정원마감',
      bg: theme.warmDim,
      color: theme.warm,
      border: theme.borderWarm,
    },
    closed: { label: '모집종료', bg: theme.card, color: theme.txt2, border: theme.border },
  };

  const m = map[status] || map.closed;

  return (
    <span
      className="inline-flex w-auto min-w-fit shrink-0 items-center whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold leading-none"
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
