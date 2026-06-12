import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Reservation, Ride, RideRequest, UserRole } from '@kapool/shared';
import { theme } from '../lib/theme';
import { Avatar } from '../components/Avatar';
import { RideCard } from '../components/RideCard';
import { RequestCard } from '../components/RequestCard';
import { fetchReservations, fetchRideRequests, fetchRides } from '../lib/api';

interface HomeScreenProps {
  accessToken: string;
  userRole?: UserRole;
  currentUserId?: string;
  userName?: string;
  userPhotoDataUrl?: string;
  refreshKey: number;
  onRideClick: (ride: Ride) => void;
  onRideRequestChat?: (request: RideRequest) => void;
}

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

export function HomeScreen({ accessToken, userRole, currentUserId, userName, userPhotoDataUrl, refreshKey, onRideClick, onRideRequestChat }: HomeScreenProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [rideLoadState, setRideLoadState] = useState<LoadState>('loading');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationLoadState, setReservationLoadState] = useState<LoadState>('loading');
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [requestLoadState, setRequestLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    if (userRole !== 'driver') {
      return;
    }

    let cancelled = false;

    fetchRides(accessToken)
      .then((nextRides) => {
        if (cancelled) return;
        setRides(nextRides);
        setRideLoadState(nextRides.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setRides([]);
        setRideLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshKey, userRole]);

  useEffect(() => {
    if (userRole !== 'passenger') {
      return;
    }

    let cancelled = false;

    fetchReservations(accessToken)
      .then((nextReservations) => {
        if (cancelled) return;
        setReservations(nextReservations);
        setReservationLoadState(nextReservations.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setReservations([]);
        setReservationLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshKey, userRole]);

  useEffect(() => {
    let cancelled = false;

    fetchRideRequests(accessToken)
      .then((nextRequests) => {
        if (cancelled) return;
        setRideRequests(nextRequests);
        setRequestLoadState(nextRequests.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setRideRequests([]);
        setRequestLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshKey]);

  const canViewRequests = userRole === 'passenger' || userRole === 'driver';
  const nextReservation = useMemo(() => pickNextReservation(reservations), [reservations]);
  const nextOwnRide = useMemo(() => pickNextOwnRide(rides, currentUserId), [currentUserId, rides]);
  const accountRequests = useMemo(() => filterAccountRequests(rideRequests, userRole, currentUserId), [currentUserId, rideRequests, userRole]);
  const latestRequests = useMemo(() => sortRequestsByCreatedAt(accountRequests).slice(0, 3), [accountRequests]);
  const requestPreviewLoadState: LoadState = requestLoadState === 'ready' && latestRequests.length === 0 ? 'empty' : requestLoadState;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-4 pt-5 pb-3.5">
        <div className="relative overflow-hidden rounded-3xl border p-4" style={{ background: theme.routeWash, border: `1px solid ${theme.borderMint}`, boxShadow: theme.shadowCard }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${theme.mint},transparent)` }} />
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase" style={{ color: theme.mint, letterSpacing: '0.08em' }}>
              My Kapool
            </div>
            <div className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
              {roleLabel(userRole)}
            </div>
          </div>
          <div className="mb-2 flex min-w-0 items-center gap-3">
            <div className="rounded-full p-0.75" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
              <Avatar name={formatGreetingName(userName)} idx={avatarIndex(currentUserId ?? userName ?? 'kapool')} size={42} photoDataUrl={userPhotoDataUrl} />
            </div>
            <div className="min-w-0 text-2xl font-black leading-tight" style={{ letterSpacing: '-0.04em', color: theme.txt0 }}>
              <span className="break-words">{formatGreetingName(userName)}님</span>
              <span className="whitespace-nowrap"> 안녕하세요!</span>
            </div>
          </div>
          <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.55 }}>
            예약, 운행, 요청 상태를 현재 계정 기준으로 빠르게 확인합니다.
          </div>
        </div>
      </div>

      <SectionHeader title="나의 카풀" subtitle="" />
      <div className="px-4 pb-3">
        {userRole === 'passenger' && (
          <>
            {reservationLoadState === 'loading' && <StateCard tone="blue" kicker="예약 확인" title="내 예약을 확인하고 있어요" body="신청한 예약과 다음 이동 정보를 불러오고 있습니다." />}
            {reservationLoadState === 'error' && <StateCard tone="warm" kicker="연결 확인" title="예약 현황을 불러오지 못했습니다" body="네트워크 상태를 확인한 뒤 다시 열어 주세요." />}
            {reservationLoadState === 'empty' && <StateCard tone="mint" kicker="이동 준비" title="예약된 카풀이 없습니다" body="검색 탭에서 빈 좌석을 찾거나 등록 탭에서 원하는 카풀 요청을 남겨 보세요." />}
            {reservationLoadState === 'ready' && !nextReservation && <StateCard tone="mint" kicker="이동 준비" title="진행 중인 예약이 없습니다" body="검색 탭에서 오늘 이동할 운행을 찾거나 등록 탭에서 카풀 요청을 작성해 주세요." />}
            {reservationLoadState === 'ready' && nextReservation && (
              <StateCard tone="mint" kicker="예약 현황" title={`${reservationStatusLabel(nextReservation.status)} · ${formatReservationRoute(nextReservation)}`} body={`${formatReservationSchedule(nextReservation)} · ${nextReservation.seatsRequested}석 요청`}>
                {nextReservation.ride && <RideCard ride={nextReservation.ride} onClick={() => onRideClick(nextReservation.ride as Ride)} />}
              </StateCard>
            )}
          </>
        )}

        {userRole === 'driver' && (
          <>
            {rideLoadState === 'loading' && <StateCard tone="blue" kicker="운행 확인" title="내 운행을 확인하고 있어요" body="등록한 운행 중 가장 가까운 일정을 불러오고 있습니다." />}
            {rideLoadState === 'error' && <StateCard tone="warm" kicker="연결 확인" title="내 운행을 불러오지 못했습니다" body="네트워크 상태를 확인해 주세요." />}
            {rideLoadState === 'empty' && <StateCard tone="mint" kicker="운행 등록" title="등록한 운행이 없습니다" body="하단 등록 탭에서 새 운행을 만들고 카풀 요청을 받을 수 있습니다." />}
            {rideLoadState === 'ready' && !nextOwnRide && <StateCard tone="mint" kicker="운행 등록" title="예정된 내 운행이 없습니다" body="하단 등록 탭에서 다음 운행을 등록해 주세요." />}
            {rideLoadState === 'ready' && nextOwnRide && (
              <StateCard tone="mint" kicker="다음 운행" title={`${nextOwnRide.from} → ${nextOwnRide.to}`} body={`${formatRideSchedule(nextOwnRide)} · ${nextOwnRide.seats}석 가능`}>
                <RideCard ride={nextOwnRide} onClick={() => onRideClick(nextOwnRide)} />
              </StateCard>
            )}
            {requestLoadState === 'loading' && <StateCard tone="blue" kicker="카풀 요청" title="요청 현황을 집계하고 있어요" body="최근 등록된 카풀 요청을 확인하고 있습니다." />}
            {requestLoadState === 'error' && <StateCard tone="warm" kicker="카풀 요청" title="요청 현황을 불러오지 못했습니다" body="네트워크 상태를 확인해 주세요." />}
            {(requestLoadState === 'ready' || requestLoadState === 'empty') && <StateCard tone="blue" kicker="카풀 요청" title={`${accountRequests.length}개 요청 확인 가능`} body={latestRequests[0] ? `${latestRequests[0].from}에서 ${latestRequests[0].to} 이동 요청이 가장 최근에 등록되었습니다.` : '아직 확인할 카풀 요청이 없습니다.'} />}
          </>
        )}

        {!userRole && <StateCard tone="warm" kicker="세션 확인" title="계정 정보를 확인할 수 없습니다" body="다시 로그인한 뒤 홈을 열어 주세요." />}
      </div>

        {canViewRequests && (
        <>
          <SectionHeader title={userRole === 'passenger' ? '내 카풀 요청' : '최신 카풀 요청'} subtitle="" trailing={`${accountRequests.length}개 요청`} />
          <div className="pb-3">
            {requestPreviewLoadState === 'loading' && (
              <div className="px-4">
                <StateCard tone="blue" kicker="불러오는 중" title="카풀 요청을 확인하고 있어요" body="최신 요청을 가져오고 있습니다." />
              </div>
            )}
            {requestPreviewLoadState === 'error' && (
              <div className="px-4">
                <StateCard tone="warm" kicker="연결 확인" title="카풀 요청을 불러오지 못했습니다" body="네트워크 상태를 확인해 주세요." />
              </div>
            )}
            {requestPreviewLoadState === 'empty' && (
              <div className="px-4">
                <StateCard tone="mint" kicker="요청 대기" title="등록된 카풀 요청이 없습니다" body="등록 탭에서 카풀 요청을 작성하면 이곳에 표시됩니다." />
              </div>
            )}
            {requestPreviewLoadState === 'ready' && (
              <div className="grid grid-cols-1 gap-3 px-4 pb-1">
                {latestRequests.map((request, index) => (
                  <RequestCard key={request.id ?? `${request.from}-${request.to}-${request.time}-${index}`} req={request} onChat={onRideRequestChat} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      </div>
  );
}

function SectionHeader({ title, subtitle, trailing }: { title: string; subtitle: string; trailing?: string }) {
  return (
    <div className="flex justify-between items-end px-5 pb-2.5 text-sm font-bold" style={{ color: theme.txt1 }}>
      <span>
        <span className="block text-base font-black" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>{title}</span>
        <span className="text-xs" style={{ color: theme.txt2 }}>{subtitle}</span>
      </span>
      {trailing && (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.txtDisabled, background: theme.disabledSurface, border: `1px solid ${theme.border}` }}>
          {trailing}
        </span>
      )}
    </div>
  );
}

function StateCard({ tone, kicker, title, body, children }: { tone: 'mint' | 'blue' | 'warm'; kicker: string; title: string; body: string; children?: ReactNode }) {
  const toneStyle = {
    mint: { color: theme.mint, background: theme.mintDim, border: theme.borderMint },
    blue: { color: theme.blue, background: theme.blueDim, border: theme.borderBlue },
    warm: { color: theme.warm, background: theme.warmDim, border: theme.borderWarm },
  }[tone];

  return (
    <div
      className="mb-3 overflow-hidden rounded-3xl border"
      style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}
    >
      <div className="h-1" style={{ background: `linear-gradient(90deg,${toneStyle.color},transparent)` }} />
      <div className="p-4">
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ color: toneStyle.color, background: toneStyle.background, border: `1px solid ${toneStyle.border}` }}>
            {kicker}
          </span>
        </div>
        <div className="text-base font-black mb-1" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>{title}</div>
        <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.65 }}>{body}</div>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

function pickNextReservation(reservations: Reservation[]) {
  const activeReservations = reservations.filter((reservation) => !['rejected', 'cancelled', 'completed'].includes(reservation.status));
  const now = Date.now();

  return activeReservations.sort((left, right) => compareCurrentOrNext(reservationSortTime(left), reservationSortTime(right), now))[0] ?? null;
}

function pickNextOwnRide(rides: Ride[], currentUserId?: string) {
  if (!currentUserId) {
    return null;
  }

  const now = Date.now();

  return rides
    .filter((ride) => ride.driverId === currentUserId)
    .sort((left, right) => compareCurrentOrNext(rideSortTime(left), rideSortTime(right), now))[0] ?? null;
}

function sortRequestsByCreatedAt(requests: RideRequest[]) {
  return [...requests].sort((left, right) => parseOptionalDate(right.createdAt) - parseOptionalDate(left.createdAt));
}

function filterAccountRequests(requests: RideRequest[], role?: UserRole, currentUserId?: string) {
  if (role !== 'passenger' || !currentUserId) {
    return requests;
  }

  const hasRequesterIds = requests.some((request) => Boolean(request.passengerId));

  return hasRequesterIds ? requests.filter((request) => request.passengerId === currentUserId) : requests;
}

function formatGreetingName(userName?: string) {
  return userName?.trim() || '계정';
}

function avatarIndex(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
}

function reservationSortTime(reservation: Reservation) {
  return reservation.ride ? rideSortTime(reservation.ride) : parseOptionalDate(reservation.createdAt);
}

function rideSortTime(ride: Ride) {
  return new Date(ride.departureTime).getTime();
}

function compareCurrentOrNext(leftTime: number, rightTime: number, now: number) {
  const leftUpcoming = leftTime >= now;
  const rightUpcoming = rightTime >= now;

  if (leftUpcoming && rightUpcoming) {
    return leftTime - rightTime;
  }

  if (leftUpcoming) {
    return -1;
  }

  if (rightUpcoming) {
    return 1;
  }

  return rightTime - leftTime;
}

function parseOptionalDate(value?: string) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function roleLabel(role?: UserRole) {
  if (role === 'passenger') return '승객';
  if (role === 'driver') return '차주';
  if (role === 'admin') return '운영자';

  return '계정 확인';
}

function reservationStatusLabel(status: Reservation['status']) {
  const labels: Record<Reservation['status'], string> = {
    pending: '승인 대기',
    approved: '예약 승인',
    rejected: '예약 거절',
    cancelled: '예약 취소',
    completed: '운행 완료',
  };

  return labels[status];
}

function formatReservationRoute(reservation: Reservation) {
  if (reservation.ride) {
    return `${reservation.ride.from} → ${reservation.ride.to}`;
  }

  return `운행 #${reservation.rideId.slice(-6)}`;
}

function formatReservationSchedule(reservation: Reservation) {
  if (!reservation.ride) {
    return `신청 ${formatDateTime(reservation.createdAt)}`;
  }

  return formatRideSchedule(reservation.ride);
}

function formatRideSchedule(ride: Ride) {
  return `${formatDateTime(ride.departureTime)} 출발`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}
