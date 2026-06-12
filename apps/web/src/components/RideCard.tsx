import { Clock, Users, ArrowDown } from 'lucide-react';
import type { Ride } from '@kapool/shared';
import { theme } from '../lib/theme';
import { Badge } from './Badge';
import { Avatar } from './Avatar';

interface RideCardProps {
  ride: Ride;
  onClick?: () => void;
}

export function RideCard({ ride, onClick }: RideCardProps) {
  const displayTime = ride.time ?? formatRideTime(ride.departureTime);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault();
          onClick();
        }
      }}
      className="mb-3 min-w-0 max-w-full w-full p-4 rounded-3xl border cursor-pointer transition-all hover:translate-y-[-1px] active:scale-[0.99] text-left relative overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: theme.cardRide,
        border: `1px solid ${theme.borderRide}`,
        boxShadow: theme.shadowRideCard,
        outlineColor: theme.mint,
      }}
    >
      {/* Shimmer top line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 w-full"
        style={{
          background: `linear-gradient(90deg,${theme.mintDeep},${theme.mint},transparent)`,
        }}
      />

      {/* Top row */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 flex-[1_1_14rem] rounded-2xl px-3 py-2" style={{ background: theme.cardStrong, border: `1px solid ${theme.borderRide}`, boxShadow: theme.shadowRidePanel }}>
          <RouteLine label="출발" value={ride.from} />
          <div className="my-1 flex items-center gap-2 pl-1" style={{ color: theme.mint }}>
            <ArrowDown size={14} color={theme.mint} />
            <span className="h-px flex-1" style={{ background: theme.borderMint }} />
          </div>
          <RouteLine label="도착" value={ride.to} />
        </div>
        <Badge status={ride.status} />
      </div>

      {/* Waypoints */}
      {ride.waypoints?.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {ride.waypoints.map((w) => (
            <span
              key={w}
              className="max-w-full truncate text-xs px-2 py-1 rounded-full font-bold"
              style={{
                background: theme.blueDim,
                color: theme.blue,
                border: `1px solid ${theme.borderBlue}`,
              }}
            >
              {w} 경유
            </span>
          ))}
        </div>
      )}

      {/* Mid row */}
      <div className="flex flex-wrap gap-2 pb-3 mb-3 border-b" style={{ borderColor: theme.borderRide }}>
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold" style={{ color: theme.mintDeep, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
          <Clock size={12} color={theme.mint} />
          {displayTime} 출발
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold" style={{ color: theme.txt1, background: theme.cardRidePanel, border: `1px solid ${theme.border}` }}>
          <Users size={12} color={theme.txt2} />
          {ride.seats}석 남음
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar name={ride.driver} idx={ride.avIdx} size={26} photoDataUrl={ride.driverPhotoDataUrl} />
          <span className="truncate text-xs font-bold" style={{ color: theme.txt1 }}>
            {ride.driver}
          </span>
        </div>
        <span className="rounded-full px-3 py-1.5 text-lg font-black" style={{ letterSpacing: '-0.02em', color: theme.mintDeep, background: theme.cardRidePanel, border: `1px solid ${theme.borderRide}` }}>
          {ride.fare.toLocaleString()}
          <span className="text-xs font-normal" style={{ color: theme.txt2 }}>
            원
          </span>
        </span>
      </div>
    </div>
  );
}

function RouteLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] font-bold" style={{ color: theme.txt2 }}>{label}</div>
      <div className="text-base font-black leading-snug" style={{ color: theme.txt0, letterSpacing: '-0.035em', overflowWrap: 'anywhere' }}>
        {value}
      </div>
    </div>
  );
}

function formatRideTime(departureTime: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(new Date(departureTime));
}
