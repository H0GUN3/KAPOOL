'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { theme, RIDES, REQUESTS, REGIONS, DATES } from '../../lib/theme';
import { RideCard } from '../RideCard';
import { RequestCard } from '../RequestCard';

interface HomeScreenProps {
  onRideClick: (ride: any) => void;
}

export function HomeScreen({ onRideClick }: HomeScreenProps) {
  const [region, setRegion] = useState('전체');
  const [dateIdx, setDateIdx] = useState(1);

  const filtered = RIDES.filter((r) => region === '전체' || r.from === region);

  return (
    <>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="text-xs mb-0.75" style={{ color: theme.txt2 }}>
          오늘의 카풀
        </div>
        <div
          className="text-xl font-black flex items-center gap-1.5"
          style={{ letterSpacing: '-0.03em', color: theme.txt0 }}
        >
          전주 <ArrowRight size={16} color={theme.mint} /> 군산대
        </div>
      </div>

      {/* Region Tabs */}
      <div className="flex gap-1.75 px-5 pb-3 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all"
            style={{
              border: region === r ? 'none' : `1px solid ${theme.border}`,
              background: region === r ? theme.mint : 'transparent',
              color: region === r ? theme.bg0 : theme.txt1,
              fontWeight: region === r ? 700 : 500,
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Date Strip */}
      <div className="flex gap-1.75 px-5 pb-4 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {DATES.map((d, i) => (
          <button
            key={i}
            onClick={() => setDateIdx(i)}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 px-2.75 py-1.75 rounded-xl border cursor-pointer transition-all"
            style={{
              background: i === dateIdx ? theme.mintDim : 'transparent',
              border: `1px solid ${i === dateIdx ? 'rgba(0,229,184,0.3)' : theme.border}`,
            }}
          >
            <span className="text-xs font-normal" style={{ color: i === dateIdx ? theme.mint : theme.txt2 }}>
              {d.day}
            </span>
            <span className="text-sm font-black" style={{ color: i === dateIdx ? theme.mint : theme.txt0 }}>
              {d.date}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Ride List */}
        <div
          className="flex justify-between items-center px-5 pb-2.5 text-sm font-bold"
          style={{ color: theme.txt1 }}
        >
          <span>모집중 운행</span>
          <span className="text-xs cursor-pointer" style={{ color: theme.mint }}>
            전체보기
          </span>
        </div>
        <div className="px-4">
          {filtered.map((r) => (
            <RideCard key={r.id} ride={r} onClick={() => onRideClick(r)} />
          ))}
        </div>

        {/* Request Section */}
        <div
          className="flex justify-between items-center px-5 pb-2.5 pt-2 text-sm font-bold"
          style={{ color: theme.txt1 }}
        >
          <span>승객 요청</span>
          <span className="text-xs cursor-pointer" style={{ color: theme.mint }}>
            더보기
          </span>
        </div>
        <div className="flex gap-2.5 px-4 pb-6 overflow-x-auto scrollbar-hide">
          {REQUESTS.map((req, i) => (
            <RequestCard key={i} req={req} />
          ))}
        </div>
      </div>
    </>
  );
}
