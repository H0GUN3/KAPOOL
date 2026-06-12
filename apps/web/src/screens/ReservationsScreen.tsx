import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, CalendarClock, ChevronLeft, CreditCard, MessageSquareText, UsersRound } from 'lucide-react';
import type { PaymentStatus, Reservation, ReservationStatus, Ride, UserRole } from '@kapool/shared';
import { theme } from '../lib/theme';
import { fetchReservations, fetchRides } from '../lib/api';
import { RideCard } from '../components/RideCard';

interface ReservationsScreenProps {
  accessToken: string;
  userRole?: UserRole;
  currentUserId?: string;
  onRideClick?: (ride: Ride) => void;
  onBack: () => void;
}

type LoadState = 'loading' | 'ready' | 'empty' | 'error';
type Tone = 'mint' | 'blue' | 'warm' | 'neutral';

export function ReservationsScreen({ accessToken, userRole, currentUserId, onRideClick, onBack }: ReservationsScreenProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const isDriverView = userRole === 'driver';
  const driverRides = isDriverView ? rides.filter((ride) => ride.driverId === currentUserId) : [];
  const displayLoadState: LoadState = loadState === 'ready' && (isDriverView ? driverRides.length === 0 : reservations.length === 0) ? 'empty' : loadState;

  useEffect(() => {
    let cancelled = false;

    const loadReservations = fetchReservations(accessToken);
    const loadRides = isDriverView ? fetchRides(accessToken) : Promise.resolve([] as Ride[]);

    Promise.all([loadReservations, loadRides])
      .then(([nextReservations, nextRides]) => {
        if (cancelled) return;
        setReservations(nextReservations);
        setRides(nextRides);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setReservations([]);
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, isDriverView]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-4 pt-4 pb-3.5">
        <button
          type="button"
          onClick={onBack}
          className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: theme.cardStrong, borderColor: theme.border, outlineColor: theme.mint }}
          aria-label="프로필로 돌아가기"
        >
          <ChevronLeft size={18} color={theme.txt0} />
        </button>

        <div className="relative overflow-hidden rounded-3xl border p-4" style={{ background: theme.routeWash, border: `1px solid ${theme.borderMint}`, boxShadow: theme.shadowCard }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${theme.mint},transparent)` }} />
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase" style={{ color: theme.mint, letterSpacing: '0.08em' }}>
              Reservation Log
            </div>
            <div className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
              {isDriverView ? `${driverRides.length}개 카풀` : `${reservations.length}개 예약`}
            </div>
          </div>
          <div className="text-2xl font-black mb-2" style={{ letterSpacing: '-0.04em', color: theme.txt0 }}>
            {isDriverView ? '내 카풀 내역' : '내 예약 내역'}
          </div>
          <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.55 }}>
            {isDriverView ? '등록한 카풀과 들어온 예약 요청을 확인합니다.' : '신청한 예약의 승인 상태, 운행 정보, 요청 좌석과 정산 상태를 확인합니다.'}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end px-5 pb-2.5 text-sm font-bold" style={{ color: theme.txt1 }}>
        <span>
          <span className="block text-base font-black" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>{isDriverView ? '카풀 목록' : '예약 목록'}</span>
          <span className="text-xs" style={{ color: theme.txt2 }}>{isDriverView ? '카드를 열어 예약 요청을 승인하거나 거절' : '내 예약 상태와 정산 정보'}</span>
        </span>
      </div>

      <div className="px-4 pb-6">
        {displayLoadState === 'loading' && <StateCard tone="blue" title={isDriverView ? '카풀 내역을 불러오는 중' : '예약 내역을 불러오는 중'} body={isDriverView ? '등록한 카풀과 예약 요청을 확인하고 있습니다.' : '내 예약 상태를 확인하고 있습니다.'} />}
        {displayLoadState === 'error' && <StateCard tone="warm" title={isDriverView ? '카풀 내역을 불러오지 못했습니다' : '예약 내역을 불러오지 못했습니다'} body="네트워크 상태나 로그인 상태를 확인한 뒤 다시 열어 주세요." />}
        {displayLoadState === 'empty' && <StateCard tone="mint" title={isDriverView ? '등록한 카풀이 없습니다' : '신청한 예약이 없습니다'} body={isDriverView ? '등록 탭에서 카풀을 올리면 이 화면에 표시됩니다.' : '홈에서 운행 카드를 선택해 예약을 신청하면 이 화면에 표시됩니다.'} />}
        {displayLoadState === 'ready' && isDriverView && driverRides.map((ride) => (
          <DriverRideListCard key={ride.id} ride={ride} reservations={reservations.filter((reservation) => String(reservation.rideId) === String(ride.id))} onClick={() => onRideClick?.(ride)} />
        ))}
        {displayLoadState === 'ready' && !isDriverView && reservations.map((reservation) => (
          <ReservationListCard key={reservation.id} reservation={reservation} />
        ))}
      </div>
    </div>
  );
}

function DriverRideListCard({ ride, reservations, onClick }: { ride: Ride; reservations: Reservation[]; onClick: () => void }) {
  const pendingCount = reservations.filter((reservation) => reservation.status === 'pending').length;
  const activeCount = reservations.filter((reservation) => reservation.status === 'approved').length;

  return (
    <div className="mb-3">
      <RideCard ride={ride} onClick={onClick} />
      <div className="-mt-2 rounded-3xl border p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="flex flex-wrap gap-2">
          <InfoPill icon={<UsersRound size={12} color={theme.blue} />} text={`승인 대기 ${pendingCount}건`} tone={pendingCount > 0 ? 'blue' : 'neutral'} />
          <InfoPill icon={<CalendarClock size={12} color={theme.mint} />} text={`승인됨 ${activeCount}건`} tone="mint" />
        </div>
        <div className="mt-2 text-xs" style={{ color: theme.txt2, lineHeight: 1.55 }}>
          카드를 누르면 상세 화면에서 예약 요청을 승인하거나 거절할 수 있습니다.
        </div>
      </div>
    </div>
  );
}

function ReservationListCard({ reservation }: { reservation: Reservation }) {
  const ride = reservation.ride;
  const routeLabel = ride ? { from: ride.from, to: ride.to } : { from: '운행', to: `#${reservation.rideId.slice(-6)}` };
  const statusTone = reservationStatusTone(reservation.status);

  return (
    <article className="mb-3 overflow-hidden rounded-3xl border" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg,${toneColor(statusTone)},${theme.mint})` }} />
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl px-3 py-2" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
              <RouteLine label="출발" value={routeLabel.from} />
              <div className="my-1 flex items-center gap-2 pl-1">
                <ArrowDown size={13} color={theme.mint} />
                <span className="h-px flex-1" style={{ background: theme.borderMint }} />
              </div>
              <RouteLine label="도착" value={routeLabel.to} />
            </div>
            {ride?.driver && (
              <div className="mt-1 text-xs" style={{ color: theme.txt2 }}>
                차주 {ride.driver}{ride.driverDepartment ? ` · ${ride.driverDepartment}` : ''}
              </div>
            )}
          </div>
          <StatusBadge tone={statusTone}>{reservationStatusLabel(reservation.status)}</StatusBadge>
        </div>

        <div className="mb-3 flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: theme.border }}>
          <InfoPill icon={<CalendarClock size={12} color={theme.mint} />} text={formatRideSchedule(reservation)} tone="mint" />
          <InfoPill icon={<UsersRound size={12} color={theme.txt2} />} text={`${reservation.seatsRequested}석 요청`} tone="neutral" />
        </div>

        <div className="grid gap-2">
          <div className="rounded-2xl border p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black" style={{ color: theme.blue }}>
              <MessageSquareText size={12} color={theme.blue} />
              예약 메시지
            </div>
            <p className="m-0 text-xs" style={{ color: reservation.message ? theme.txt1 : theme.txt3, lineHeight: 1.65, overflowWrap: 'anywhere' }}>
              {reservation.message || '예약 신청 메시지가 없습니다.'}
            </p>
          </div>

          {reservation.payment && (
            <div className="rounded-2xl border p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: toneColor(paymentStatusTone(reservation.payment.status)) }}>
                  <CreditCard size={12} color={toneColor(paymentStatusTone(reservation.payment.status))} />
                  정산 상태 · {paymentStatusLabel(reservation.payment.status)}
                </div>
                <span className="rounded-full px-2 py-0.75 text-xs font-bold" style={{ color: theme.txt0, background: theme.cardStrong, border: `1px solid ${theme.border}` }}>
                  {reservation.payment.amount.toLocaleString()}원
                </span>
              </div>
              <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                {reservation.payment.note ?? '직접 송금한 내역의 확인 상태를 표시합니다.'}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: theme.txt3 }}>
          <span>신청 {formatDateTime(reservation.createdAt)}</span>
          {reservation.approvedInfo?.vehicle && (
            <span>{reservation.approvedInfo.vehicle.color} {reservation.approvedInfo.vehicle.model}</span>
          )}
        </div>
      </div>
    </article>
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

function InfoPill({ icon, text, tone }: { icon: ReactNode; text: string; tone: Tone }) {
  const color = toneColor(tone);
  const background = toneBackground(tone);
  const border = toneBorder(tone);

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold" style={{ color, background, border: `1px solid ${border}` }}>
      {icon}
      <span className="min-w-0 truncate">{text}</span>
    </div>
  );
}

function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex w-auto min-w-fit flex-shrink-0 items-center whitespace-nowrap rounded-full px-3 py-2 text-xs font-black leading-none" style={{ color: toneColor(tone), background: toneBackground(tone), border: `1px solid ${toneBorder(tone)}` }}>
      {children}
    </span>
  );
}

function StateCard({ tone, title, body }: { tone: 'mint' | 'blue' | 'warm'; title: string; body: string }) {
  const color = toneColor(tone);

  return (
    <div className="mb-3 overflow-hidden rounded-3xl border" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg,${color},transparent)` }} />
      <div className="p-4">
        <span className="mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black" style={{ color, background: toneBackground(tone), border: `1px solid ${toneBorder(tone)}` }}>
          예약 상태
        </span>
        <div className="text-base font-black mb-1" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>{title}</div>
        <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.65 }}>{body}</div>
      </div>
    </div>
  );
}

function reservationStatusLabel(status: ReservationStatus) {
  const labels: Record<ReservationStatus, string> = {
    pending: '승인 대기',
    approved: '승인됨',
    rejected: '거절됨',
    cancelled: '취소됨',
    completed: '운행 종료',
  };

  return labels[status];
}

function reservationStatusTone(status: ReservationStatus): Tone {
  if (status === 'approved' || status === 'completed') {
    return 'mint';
  }

  if (status === 'rejected' || status === 'cancelled') {
    return 'warm';
  }

  return 'blue';
}

function paymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    unpaid: '미정산',
    paid: '송금 완료',
    disputed: '확인 필요',
    waived: '정산 면제',
  };

  return labels[status];
}

function paymentStatusTone(status: PaymentStatus): Tone {
  if (status === 'paid' || status === 'waived') {
    return 'mint';
  }

  return status === 'disputed' ? 'warm' : 'blue';
}

function formatRideSchedule(reservation: Reservation) {
  if (!reservation.ride) {
    return `신청 ${formatDateTime(reservation.createdAt)}`;
  }

  return `${formatDate(reservation.ride.departureTime)} ${reservation.ride.time ?? formatTime(reservation.ride.departureTime)}`;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function toneColor(tone: Tone) {
  if (tone === 'mint') return theme.mint;
  if (tone === 'blue') return theme.blue;
  if (tone === 'warm') return theme.warm;
  return theme.txt1;
}

function toneBackground(tone: Tone) {
  if (tone === 'mint') return theme.mintDim;
  if (tone === 'blue') return theme.blueDim;
  if (tone === 'warm') return theme.warmDim;
  return theme.card;
}

function toneBorder(tone: Tone) {
  if (tone === 'mint') return theme.borderMint;
  if (tone === 'blue') return theme.borderBlue;
  if (tone === 'warm') return theme.borderWarm;
  return theme.border;
}
