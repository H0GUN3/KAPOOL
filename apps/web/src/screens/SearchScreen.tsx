import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Ride } from '@kapool/shared';
import { theme } from '../lib/theme';
import { RideCard } from '../components/RideCard';
import { fetchRides } from '../lib/api';

interface SearchScreenProps {
  accessToken: string;
  refreshKey: number;
  onRideClick: (ride: Ride) => void;
}

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: '전주', label: '전주' },
  { id: '군산', label: '군산' },
  { id: '익산', label: '익산' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function SearchScreen({ accessToken, refreshKey, onRideClick }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [dateIdx, setDateIdx] = useState(0);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const dateOptions = useMemo(() => buildRollingDateOptions(), []);

  useEffect(() => {
    let cancelled = false;

    fetchRides(accessToken)
      .then((nextRides) => {
        if (cancelled) return;
        setRides(nextRides);
        setLoadState(nextRides.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setRides([]);
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshKey]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedDateKey = dateOptions[dateIdx]?.key ?? dateOptions[0].key;

    return rides.filter((ride) => {
      const routeParts = [ride.from, ride.to, ...(ride.waypoints ?? [])];
      const searchableParts = [
        ...routeParts,
        ride.driver,
      ].map((part) => part.toLowerCase());
      const matchesQuery = normalizedQuery === '' || searchableParts.some((part) => part.includes(normalizedQuery));
      const matchesFilter = activeFilter === 'all'
        || routeParts.some((part) => part.includes(activeFilter));
      const matchesDate = formatLocalDateKey(new Date(ride.departureTime)) === selectedDateKey;

      return matchesQuery && matchesFilter && matchesDate;
    });
  }, [activeFilter, dateIdx, dateOptions, query, rides]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div
          className="rounded-3xl border p-4 relative overflow-hidden"
          style={{ background: theme.routeWash, border: `1px solid ${theme.borderMint}`, boxShadow: theme.shadowCard }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg,transparent,${theme.mint},transparent)` }}
          />
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold uppercase" style={{ color: theme.mint, letterSpacing: '0.08em' }}>
              카풀 검색
            </div>
            <div className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
              {filtered.length}개 결과
            </div>
          </div>
          <div className="text-2xl font-black mb-2" style={{ letterSpacing: '-0.04em', color: theme.txt0 }}>
            카풀 검색
          </div>
          <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.55 }}>
            출발지와 도착지만 입력해 빠르게 빈 좌석을 찾습니다.
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <label
          className="rounded-2xl border px-3.5 py-3 flex items-center gap-2.5"
          style={{ background: theme.field, border: `1px solid ${theme.border}` }}
        >
          <Search size={16} color={theme.mint} strokeWidth={2.4} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="출발지, 도착지, 경유지 검색"
            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold placeholder:font-medium"
            style={{ color: theme.txt0 }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3 flex-shrink-0">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className="inline-flex h-11 w-auto min-w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-xs font-bold cursor-pointer border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                border: isActive ? `1px solid ${theme.borderMint}` : `1px solid ${theme.border}`,
                background: isActive ? theme.mint : theme.card,
                color: isActive ? '#FFFFFF' : theme.txt1,
                outlineColor: theme.mint,
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {dateOptions.map((dateOption, i) => {
          const isActive = i === dateIdx;

          return (
            <button
              key={dateOption.key}
              type="button"
              onClick={() => setDateIdx(i)}
              className="flex-shrink-0 flex min-w-14 min-h-11 flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: isActive ? theme.cardStrong : theme.card,
                border: `1px solid ${isActive ? theme.borderMint : theme.border}`,
                outlineColor: theme.mint,
              }}
            >
              <span className="text-sm font-black" style={{ color: isActive ? theme.mint : theme.txt0 }}>
                {dateOption.label}
              </span>
              <span className="text-[11px] font-bold" style={{ color: isActive ? theme.mint : theme.txt2 }}>
                {dateOption.dateLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="flex justify-between items-end px-5 pb-2.5 text-sm font-bold"
        style={{ color: theme.txt1 }}
      >
        <span>
          <span className="block text-base font-black" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>검색 결과</span>
          <span className="text-xs" style={{ color: theme.txt2 }}>입력한 조건에 맞는 운행</span>
        </span>
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
          {filtered.length}개
        </span>
      </div>

      <div className="px-4 pb-6">
        {loadState === 'loading' && <StateCard title="운행 목록을 불러오는 중" body="지금 검색할 수 있는 카풀을 확인하고 있습니다." />}
        {loadState === 'error' && <StateCard title="운행 목록을 불러오지 못했습니다" body="네트워크 상태를 확인한 뒤 다시 시도해 주세요." />}
        {loadState === 'empty' && <StateCard title="검색 가능한 운행이 없습니다" body="차주가 운행을 등록하면 검색 결과에 표시됩니다." />}
        {loadState === 'ready' && filtered.length === 0 && <StateCard title="조건에 맞는 운행이 없습니다" body="검색어를 줄이거나 다른 지역을 선택해 보세요." />}
        {loadState === 'ready' && filtered.map((ride) => (
          <RideCard key={ride.id} ride={ride} onClick={() => onRideClick(ride)} />
        ))}
      </div>
    </div>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="mb-2.5 p-4 rounded-2xl border"
      style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}
    >
      <div className="text-sm font-black mb-1" style={{ color: theme.txt0 }}>{title}</div>
      <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

function buildRollingDateOptions() {
  return [0, 1, 2].map((offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);

    return {
      key: formatLocalDateKey(date),
      label: formatDateOptionLabel(offset),
      dateLabel: `${date.getDate()}일`,
    };
  });
}

function formatDateOptionLabel(offset: number) {
  if (offset === 0) return '오늘';
  if (offset === 1) return '내일';
  if (offset === 2) return '모레';

  return '날짜';
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
