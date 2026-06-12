'use client';

import { useId } from 'react';
import { theme } from '../lib/theme';

interface MapPreviewProps {
  height?: number;
  from?: string;
  to?: string;
  waypoints?: string[];
}

export function MapPreview({ height = 130, from = '출발지', to = '도착지', waypoints = [] }: MapPreviewProps) {
  const rawId = useId().replace(/:/g, '');
  const gridId = `${rawId}-grid`;
  const gradientId = `${rawId}-route`;
  const stops = [from, ...waypoints.filter(Boolean), to];
  const points = stops.map((stop, index) => {
    const total = Math.max(stops.length - 1, 1);
    const isEndpoint = index === 0 || index === stops.length - 1;

    return {
      stop,
      x: 14 + (72 / total) * index,
      y: isEndpoint ? (index === 0 ? 58 : 42) : index % 2 === 0 ? 56 : 44,
      isEndpoint,
    };
  });
  const routePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const ariaLabel = `경로 미리보기: ${stops.join('에서 ')}까지`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="mx-4 mb-3.5 rounded-2xl border overflow-hidden relative"
      style={{
        height,
        background: theme.mapBg,
        border: `1px solid ${theme.border}`,
      }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={gridId}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke={theme.border}
              strokeWidth="1"
            />
          </pattern>
          <linearGradient
            id={gradientId}
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
        <rect width="100" height="100" fill={`url(#${gridId})`} />

        <polyline
          points={routePoints}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={`${point.stop}-${index}`}>
            <circle cx={point.x} cy={point.y} r={point.isEndpoint ? 9 : 7} fill={index === 0 ? theme.blueDim : theme.mintDim} />
            <circle
              cx={point.x}
              cy={point.y}
              r={point.isEndpoint ? 4.5 : 3.5}
              fill={index === 0 ? theme.blue : theme.mint}
              stroke={theme.mapInk}
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>

      <div
        className="absolute top-2 left-2 text-xs font-bold rounded-full"
        style={{
          color: theme.blue,
          background: theme.blueDim,
          border: `1px solid ${theme.borderBri}`,
          padding: '4px 8px',
        }}
      >
        {waypoints.length > 0 ? `${waypoints.length}개 경유` : '직행 경로'}
      </div>

      <div
        className="absolute top-2 right-2 text-xs font-semibold rounded-full"
        style={{
          color: theme.txt1,
          background: theme.card,
          border: `1px solid ${theme.border}`,
          padding: '4px 8px',
        }}
      >
        경로 미리보기
      </div>

      {/* Labels */}
      <div
        className="absolute bottom-2 left-[10%] text-xs font-semibold rounded"
        style={{
          color: theme.txt0,
          background: theme.mapInk,
          padding: '2px 6px',
        }}
      >
        {from} 출발
      </div>
      <div
        className="absolute bottom-2 right-[5%] text-xs font-semibold rounded"
        style={{
          color: theme.txt0,
          background: theme.mapInk,
          padding: '2px 6px',
        }}
      >
        {to}
      </div>
      {waypoints.length > 0 && (
        <div className="absolute left-2 right-2 bottom-8 flex flex-wrap gap-1.5" aria-hidden="true">
          {waypoints.slice(0, 3).map((waypoint) => (
            <span key={waypoint} className="rounded-full px-2 py-0.75 text-xs font-semibold" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
              {waypoint}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
