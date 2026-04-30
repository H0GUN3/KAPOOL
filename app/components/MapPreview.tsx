'use client';

import { theme } from '../lib/theme';

interface MapPreviewProps {
  height?: number;
}

export function MapPreview({ height = 130 }: MapPreviewProps) {
  return (
    <div
      className="mx-4 mb-3.5 rounded-2xl border overflow-hidden relative"
      style={{
        height,
        background: 'linear-gradient(135deg, #0C1E35 0%, #091825 100%)',
        border: `1px solid ${theme.border}`,
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="g"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient
            id="routeGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={theme.blue} />
            <stop offset="100%" stopColor={theme.mint} />
          </linearGradient>
        </defs>

        {/* Grid */}
        <rect width="100%" height="100%" fill="url(#g)" />

        {/* Route line (selected) */}
        <line
          x1="14%"
          y1="50%"
          x2="86%"
          y2="50%"
          stroke={theme.txt0}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Origin */}
        <circle cx="14%" cy="50%" r="5" fill={theme.blue} />
        <circle cx="14%" cy="50%" r="9" fill={theme.blue} opacity="0.2" />

        {/* Waypoints */}
        <circle cx="42%" cy="50%" r="4" fill={theme.mint} stroke="#091825" strokeWidth="2" />
        <circle cx="62%" cy="50%" r="4" fill={theme.mint} stroke="#091825" strokeWidth="2" />

        {/* Destination */}
        <circle cx="86%" cy="50%" r="5" fill={theme.mint} />
        <circle cx="86%" cy="50%" r="9" fill={theme.mint} opacity="0.2" />
      </svg>

      {/* Labels */}
      <div
        className="absolute bottom-2 left-[10%] text-xs font-semibold rounded"
        style={{
          color: theme.txt0,
          background: 'rgba(9,24,37,0.85)',
          padding: '2px 6px',
        }}
      >
        전주 출발
      </div>
      <div
        className="absolute bottom-2 right-[5%] text-xs font-semibold rounded"
        style={{
          color: theme.txt0,
          background: 'rgba(9,24,37,0.85)',
          padding: '2px 6px',
        }}
      >
        군산대
      </div>
    </div>
  );
}
