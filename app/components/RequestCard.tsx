'use client';

import { theme, REQUESTS } from '../lib/theme';

type Request = (typeof REQUESTS)[0];

interface RequestCardProps {
  req: Request;
}

export function RequestCard({ req }: RequestCardProps) {
  return (
    <div
      className="flex-shrink-0 w-48 p-3.5 rounded-2xl border cursor-pointer relative overflow-hidden"
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.75"
        style={{
          background: `linear-gradient(90deg,${theme.blue},${theme.mint})`,
          borderRadius: `${theme.r16} ${theme.r16} 0 0`,
        }}
      />

      <div className="text-sm font-bold mb-1" style={{ letterSpacing: '-0.02em', color: theme.txt0 }}>
        {req.from} → {req.to}
      </div>
      <div className="text-xs mb-1.75" style={{ color: theme.mint, fontWeight: 500 }}>
        {req.time}
      </div>
      <div
        className="text-xs line-clamp-2"
        style={{
          color: theme.txt1,
          lineHeight: 1.5,
        }}
      >
        {req.content}
      </div>
    </div>
  );
}
