'use client';

import { Clock, Users, ArrowRight } from 'lucide-react';
import { theme, RIDES } from '../lib/theme';
import { Badge } from './Badge';
import { Avatar } from './Avatar';

type Ride = (typeof RIDES)[0];

interface RideCardProps {
  ride: Ride;
  onClick?: () => void;
}

export function RideCard({ ride, onClick }: RideCardProps) {
  return (
    <div
      onClick={onClick}
      className="mb-2.5 p-3.5 rounded-2xl border cursor-pointer transition-all hover:translate-y-[-1px]"
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Shimmer top line */}
      <div
        className="absolute top-0 left-0 right-0 h-px w-full"
        style={{
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)',
        }}
      />

      {/* Top row */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black" style={{ letterSpacing: '-0.03em', color: theme.txt0 }}>
            {ride.from}
          </span>
          <ArrowRight size={14} color={theme.txt2} />
          <span className="text-base font-black" style={{ letterSpacing: '-0.03em', color: theme.txt0 }}>
            {ride.to}
          </span>
        </div>
        <Badge status={ride.status as any} />
      </div>

      {/* Waypoints */}
      {ride.waypoints?.length > 0 && (
        <div className="flex gap-1 mb-2.5 flex-wrap">
          {ride.waypoints.map((w) => (
            <span
              key={w}
              className="text-xs px-2 py-0.75 rounded-full"
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                background: theme.blueDim,
                color: theme.blue,
                border: `1px solid rgba(91,126,255,0.2)`,
              }}
            >
              {w} 경유
            </span>
          ))}
        </div>
      )}

      {/* Mid row */}
      <div className="flex gap-3.5 pb-2.5 mb-2.5 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-1.25 text-xs" style={{ color: theme.txt1 }}>
          <Clock size={11} color={theme.txt2} />
          {ride.time}
        </div>
        <div className="flex items-center gap-1.25 text-xs" style={{ color: theme.txt1 }}>
          <Users size={11} color={theme.txt2} />
          {ride.seats}석 남음
        </div>
      </div>

      {/* Bottom */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar name={ride.driver} idx={ride.avIdx} size={26} />
          <span className="text-xs" style={{ color: theme.txt1 }}>
            {ride.driver}
          </span>
        </div>
        <span className="font-black" style={{ fontSize: '17px', letterSpacing: '-0.02em', color: theme.txt0 }}>
          {ride.fare.toLocaleString()}
          <span className="text-xs font-normal" style={{ color: theme.txt2 }}>
            원
          </span>
        </span>
      </div>
    </div>
  );
}
