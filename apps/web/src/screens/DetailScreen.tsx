import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Clock,
  User,
  Car,
  CheckCircle,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import type { ReportType, Reservation, ReservationStatus, Ride, UserRole } from '@kapool/shared';
import { theme } from '../lib/theme';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Notice } from '../components/Notice';
import {
  createReservation,
  createReport,
  fetchReservations,
  fetchRideDetail,
  updateReservationStatus,
} from '../lib/api';

interface DetailScreenProps {
  accessToken: string;
  currentUserId: string;
  userRole?: UserRole;
  ride: Ride | null;
  onBack: () => void;
  onChat: () => void;
  onReservationChange?: () => void;
}

type RideDetailState = {
  rideId: Ride['id'];
  serverRide: Ride | null;
  reservations: Reservation[];
  loadState: 'ready' | 'error';
  reservationLoadState: 'ready' | 'error';
};

type PendingReservationAction = {
  reservationId: string;
  status: Extract<ReservationStatus, 'rejected' | 'cancelled'>;
} | null;

export function DetailScreen({
  accessToken,
  currentUserId,
  userRole,
  ride,
  onBack,
  onChat,
  onReservationChange,
}: DetailScreenProps) {
  const [detailState, setDetailState] = useState<RideDetailState | null>(null);
  const [actionState, setActionState] = useState<'idle' | 'busy'>('idle');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingReservationAction, setPendingReservationAction] = useState<PendingReservationAction>(null);
  const [reportType, setReportType] = useState<ReportType>('safety_issue');
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    if (!ride) {
      return;
    }

    let cancelled = false;

    Promise.all([
      fetchRideDetail(accessToken, ride.id),
      fetchReservations(accessToken, ride.id),
    ])
      .then(([nextRide, nextReservations]) => {
        if (cancelled) return;
        setDetailState({
          rideId: ride.id,
          serverRide: nextRide,
          reservations: nextReservations,
          loadState: 'ready',
          reservationLoadState: 'ready',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setDetailState({
          rideId: ride.id,
          serverRide: null,
          reservations: [],
          loadState: 'error',
          reservationLoadState: 'error',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, ride]);

  const currentDetailState = ride && detailState && String(detailState.rideId) === String(ride.id)
    ? detailState
    : null;
  const serverRide = currentDetailState?.serverRide ?? null;
  const reservations = currentDetailState?.reservations ?? [];
  const loadState = ride ? currentDetailState?.loadState ?? 'loading' : 'loading';
  const reservationLoadState = ride ? currentDetailState?.reservationLoadState ?? 'loading' : 'loading';
  const detailRide = serverRide ?? ride;

  useEffect(() => {
    if (!actionMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setActionMessage(null), 3600);

    return () => window.clearTimeout(timeoutId);
  }, [actionMessage]);

  if (!detailRide) {
    return <DetailState onBack={onBack} title="운행을 선택해 주세요" body="홈에서 운행 카드를 선택하면 상세 정보를 확인할 수 있습니다." />;
  }

  const displayTime = detailRide.time ?? formatRideTime(detailRide.departureTime);
  const displayDate = formatRideDate(detailRide.departureTime);
  const vehicleLabel = detailRide.vehicle ? `${detailRide.vehicle.color} ${detailRide.vehicle.model}` : '차량 정보 미등록';
  const vehicleCapacity = detailRide.vehicle?.capacity ?? 0;
  const seatTotal = vehicleCapacity || Math.max(detailRide.seats, 1);
  const occupiedSeatCount = Math.max(0, seatTotal - detailRide.seats);
  const isDriverOwner = userRole === 'driver' && detailRide.driverId === currentUserId;
  const myReservation = userRole === 'passenger' ? reservations[0] : null;
  const canOpenChat = isDriverOwner
    ? reservations.some(isChatReadyReservation)
    : Boolean(myReservation && isChatReadyReservation(myReservation));
  const isBusy = actionState === 'busy';

  const replaceReservation = (nextReservation: Reservation) => {
    setDetailState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      const currentReservations = currentState.reservations;
      const existingIndex = currentReservations.findIndex((reservation) => reservation.id === nextReservation.id);

      if (existingIndex === -1) {
        return { ...currentState, reservations: [nextReservation, ...currentReservations] };
      }

      return {
        ...currentState,
        reservations: currentReservations.map((reservation) => (
          reservation.id === nextReservation.id ? nextReservation : reservation
        )),
      };
    });
    onReservationChange?.();
  };

  const runReservationAction = async (
    action: () => Promise<Reservation>,
    successMessage: string,
    failureMessage = '요청 처리에 실패했습니다. 권한 또는 현재 예약 상태를 확인해 주세요.',
  ) => {
    setActionState('busy');
    setActionMessage(null);

    try {
      const nextReservation = await action();
      replaceReservation(nextReservation);
      setActionMessage(successMessage);
    } catch {
      setActionMessage(failureMessage);
    } finally {
      setActionState('idle');
    }
  };

  const handleCreateReservation = (seatCount: number, message: string) => {
    const seatsRequested = clampReservationSeatCount(seatCount, detailRide.seats);

    if (seatsRequested < 1) {
      setActionMessage('신청 가능한 좌석이 없습니다. 다른 운행을 확인해 주세요.');
      return;
    }

    void runReservationAction(
      () => createReservation(accessToken, {
        rideId: String(detailRide.id),
        seatsRequested,
        message: message.trim() || undefined,
      }),
      '예약 요청이 차주에게 전달되었습니다.',
    );
  };

  const handleStatusUpdate = (reservationId: string, status: ReservationStatus, transferInstruction?: string) => {
    void runReservationAction(
      () => updateReservationStatus(accessToken, reservationId, status, transferInstruction),
      status === 'approved'
        ? '예약을 승인했습니다.'
        : status === 'rejected'
          ? '예약을 거절했습니다.'
          : status === 'cancelled'
            ? '예약을 취소했습니다.'
            : '운행 종료로 표시했습니다.',
    );
  };

  const requestStatusUpdate = (reservationId: string, status: ReservationStatus, transferInstruction?: string) => {
    if (status === 'rejected' || status === 'cancelled') {
      setPendingReservationAction({ reservationId, status });
      return;
    }

    handleStatusUpdate(reservationId, status, transferInstruction);
  };

  const confirmPendingReservationAction = () => {
    if (!pendingReservationAction) return;

    const nextAction = pendingReservationAction;
    setPendingReservationAction(null);
    handleStatusUpdate(nextAction.reservationId, nextAction.status);
  };

  const handleCreateReport = () => {
    const contextReservation = myReservation ?? reservations[0];

    setActionState('busy');
    setActionMessage(null);
    createReport(accessToken, {
        type: reportType,
        rideId: String(detailRide.id),
        reservationId: contextReservation?.id,
        paymentRecordId: contextReservation?.payment?.id,
        subjectUserId: isDriverOwner ? contextReservation?.passengerId : detailRide.driverId,
        description: reportDescription || '운행 상세 화면에서 운영자 확인을 요청합니다.',
      })
      .then(() => {
        setReportDescription('');
        setActionMessage('신고가 운영자 검토 목록에 등록되었습니다.');
      })
      .catch(() => setActionMessage('신고를 접수하지 못했습니다. 내용을 확인한 뒤 다시 시도해 주세요.'))
      .finally(() => setActionState('idle'));
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero */}
        <div className="px-4 pt-4 pb-3.5">
          <button
            onClick={onBack}
            aria-label="이전 화면으로 돌아가기"
            className="w-11 h-11 rounded-full flex items-center justify-center mb-3.5 border cursor-pointer transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: theme.cardStrong,
              border: `1px solid ${theme.border}`,
              outlineColor: theme.mint,
            }}
          >
            <ChevronLeft size={16} color={theme.txt1} />
          </button>

          <div className="rounded-3xl border p-4" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <Badge status={detailRide.status} />
              <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.card, color: theme.mint, border: `1px solid ${theme.border}` }}>
                잔여 {detailRide.seats}석
              </span>
            </div>
            <div
              className="mb-2 rounded-2xl px-3 py-2"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <RouteLine label="출발" value={detailRide.from} size="lg" />
              <div className="my-1 flex items-center gap-2 pl-1">
                <span className="text-lg font-black" style={{ color: theme.mint }}>↓</span>
                <span className="h-px flex-1" style={{ background: theme.borderBri }} />
              </div>
              <RouteLine label="도착" value={detailRide.to} size="lg" />
            </div>
            {detailRide.waypoints.length > 0 && (
              <WaypointBlock waypoints={detailRide.waypoints} />
            )}
            <div className="text-sm font-bold" style={{ color: theme.txt1 }}>
              {displayDate} · {displayTime} 출발
            </div>
            {loadState === 'loading' && (
              <div className="text-xs mt-2" style={{ color: theme.mint }}>상세 정보를 새로 확인하는 중입니다.</div>
            )}
            {loadState === 'error' && (
              <div className="text-xs mt-2" style={{ color: theme.warm }}>상세 정보를 불러오지 못해 이전 화면의 정보를 표시합니다.</div>
            )}
          </div>
        </div>

        <div className="px-4 pb-3.5 flex flex-col gap-2.5">
          {reservationLoadState === 'error' && (
            <StatusCard tone="warm" title="예약 정보를 불러오지 못했습니다" body="네트워크 상태를 확인한 뒤 다시 시도해 주세요." />
          )}
          {isDriverOwner ? (
            <DriverReservationPanel
              reservations={reservations}
              isBusy={isBusy}
              onStatusUpdate={requestStatusUpdate}
            />
          ) : (
            <PassengerReservationPanel
              key={String(detailRide.id)}
              reservation={myReservation}
              availableSeats={detailRide.seats}
              isRideOpen={detailRide.status === 'open'}
              isBusy={isBusy || reservationLoadState === 'loading'}
              onCreate={handleCreateReservation}
              onCancel={(reservationId) => requestStatusUpdate(reservationId, 'cancelled')}
            />
          )}
          <button
            onClick={canOpenChat ? onChat : undefined}
            disabled={!canOpenChat}
            className="w-full h-12 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: canOpenChat ? theme.blueDim : theme.disabledSurface,
              color: canOpenChat ? theme.blue : theme.txtDisabled,
              border: `1px solid ${canOpenChat ? theme.borderBlue : theme.borderBri}`,
              cursor: canOpenChat ? 'pointer' : 'not-allowed',
              outlineColor: theme.mint,
            }}
          >
            <MessageCircle size={16} />
            {canOpenChat ? '채팅방 입장' : '승인 후 채팅에서 조율'}
          </button>
        </div>

        <div className="px-4 pb-3.5">
          <Notice title="예약 처리 안내" tone="warm">
            요청 메시지로 먼저 조건을 남기고, 차주 승인 후 채팅에서 탑승 위치와 세부 안내를 확정해 주세요.
          </Notice>
        </div>

        {/* Info Grid */}
        <div className="kapool-grid-pair gap-2.5 px-4 pb-3.5">
          {[
            {
              label: '출발 시간',
              icon: <Clock size={10} color={theme.txt2} />,
               val: displayTime,
               sub: '운행 일정',
              valColor: theme.txt0,
            },
            {
              label: '운행 금액',
              icon: <Car size={10} color={theme.txt2} />,
              val: (
                 <span style={{ color: theme.mint }}>
                    {detailRide.fare.toLocaleString()}원
                 </span>
              ),
              sub: '권역별 운행 금액',
            },
          ].map(({ label, icon, val, sub, valColor }) => (
            <div
              key={label}
              className="rounded-3xl p-4 border"
              style={{
                background: theme.cardStrong,
                border: `1px solid ${theme.border}`,
                boxShadow: theme.shadowCard,
              }}
            >
              <div
                className="flex items-center gap-1 text-xs mb-1.25"
                style={{ color: theme.txt2 }}
              >
                {icon}
                {label}
              </div>
              <div
                 className="text-xl font-black"
                 style={{ letterSpacing: '-0.02em', color: valColor }}
              >
                {val}
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.txt2 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Seats */}
        <div className="px-4 pb-3.5">
          <div className="rounded-3xl border p-4" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-black" style={{ color: theme.txt0 }}>탑승 현황</span>
              <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
                {occupiedSeatCount}/{seatTotal} 탑승
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: seatTotal }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-2xl flex items-center justify-center border"
                  style={{
                    background:
                      i < occupiedSeatCount ? theme.mintDim : 'transparent',
                    borderColor:
                      i < occupiedSeatCount
                        ? theme.borderMint
                        : theme.border,
                    borderStyle: i < occupiedSeatCount ? 'solid' : 'dashed',
                    borderWidth: 2,
                  }}
                >
                  {i < occupiedSeatCount && <User size={16} color={theme.mint} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div
          className="mx-4 mb-3 p-4 rounded-3xl flex gap-3 items-center border"
          style={{
            background: theme.cardStrong,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.shadowCard,
          }}
        >
          <div
            className="w-10.5 h-10.5 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: theme.blueDim,
              border: `1px solid ${theme.borderBlue}`,
            }}
          >
            <Car size={20} color={theme.blue} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold mb-0.75 break-words" style={{ color: theme.txt0 }}>{vehicleLabel}</div>
            <div className="text-xs" style={{ color: theme.txt2 }}>
              승인 후에도 전화번호와 차량번호는 비공개
            </div>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: theme.warmDim,
              color: theme.warm,
              border: `1px solid ${theme.borderWarm}`,
            }}
          >
            {vehicleCapacity ? `${vehicleCapacity}인승` : '비공개'}
          </span>
        </div>

        <div className="px-4 pb-4">
          <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
            <div>
              <div className="text-base font-black" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>차주와 안전</div>
              <div className="text-xs mt-0.5" style={{ color: theme.txt2 }}>예약·채팅 흐름을 방해하지 않는 보조 정보</div>
            </div>
            <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.txtDisabled, background: theme.disabledSurface, border: `1px solid ${theme.border}` }}>
              안전 정보
            </span>
          </div>

          <div
            className="mb-2.5 p-4 rounded-3xl flex items-center gap-3 border"
            style={{
              background: theme.cardStrong,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadowCard,
            }}
          >
            <Avatar name={detailRide.driver} idx={detailRide.avIdx} size={38} photoDataUrl={detailRide.driverPhotoDataUrl} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black mb-0.5" style={{ color: theme.txt0 }}>{detailRide.driver}</div>
              <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.55 }}>
                {detailRide.driverDepartment ?? '학과 정보 미등록'}
                {detailRide.waypoints?.length > 0 && ` · ${detailRide.waypoints.join(', ')} 경유`}
              </div>
            </div>
            <div className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
              차주
            </div>
          </div>

          <div className="rounded-3xl p-3.5 border" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-start gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: theme.warmDim, border: `1px solid ${theme.borderWarm}` }}>
                <ShieldAlert size={14} color={theme.warm} />
              </div>
              <div>
                <div className="text-xs font-black" style={{ color: theme.txt0 }}>안전·운영자 확인 요청</div>
                <div className="text-xs mt-0.5" style={{ color: theme.txt2, lineHeight: 1.55 }}>예약과 채팅 이후 운영자 확인이 필요할 때만 사용합니다.</div>
              </div>
            </div>
            <div className="kapool-grid-actions gap-2 mb-2">
              <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} disabled={isBusy} className="h-11 rounded-xl px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: isBusy ? theme.disabledSurface : theme.field, color: isBusy ? theme.txtDisabled : theme.txt0, border: `1px solid ${isBusy ? theme.borderBri : theme.border}`, outlineColor: theme.mint }}>
                <option value="settlement_missing">운행/정산 확인</option>
                <option value="safety_issue">안전/이용 문제</option>
              </select>
              <button onClick={handleCreateReport} disabled={isBusy} className="h-11 rounded-xl text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: isBusy ? theme.disabledSurface : theme.warmDim, color: isBusy ? theme.txtDisabled : theme.warm, border: `1px solid ${isBusy ? theme.borderBri : theme.borderWarm}`, cursor: isBusy ? 'not-allowed' : 'pointer', outlineColor: theme.mint }}>
                검토 요청
              </button>
            </div>
            <textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} disabled={isBusy} rows={2} placeholder="운영자에게 전달할 내용을 입력해 주세요." className="w-full rounded-xl p-3 text-xs resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: isBusy ? theme.disabledSurface : theme.field, color: isBusy ? theme.txtDisabled : theme.txt0, border: `1px solid ${isBusy ? theme.borderBri : theme.border}`, outlineColor: theme.mint }} />
          </div>
        </div>
      </div>
      {actionMessage && (
        <ActionToast tone={actionMessage.includes('실패') ? 'warm' : 'mint'} message={actionMessage} />
      )}
      {pendingReservationAction && (
        <ReservationConfirmDialog
          status={pendingReservationAction.status}
          disabled={isBusy}
          onCancel={() => setPendingReservationAction(null)}
          onConfirm={confirmPendingReservationAction}
        />
      )}
    </>
  );
}

function PassengerReservationPanel({
  reservation,
  availableSeats,
  isRideOpen,
  isBusy,
  onCreate,
  onCancel,
}: {
  reservation: Reservation | null;
  availableSeats: number;
  isRideOpen: boolean;
  isBusy: boolean;
  onCreate: (seatCount: number, message: string) => void;
  onCancel: (reservationId: string) => void;
}) {
  const [seatCount, setSeatCount] = useState(1);
  const [message, setMessage] = useState('');

  if (!reservation) {
    const canRequestSeats = isRideOpen && availableSeats > 0;
    const requestedSeats = clampReservationSeatCount(seatCount, availableSeats);
    const canSubmit = !isBusy && canRequestSeats;

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onCreate(requestedSeats, message);
        }}
        className="rounded-3xl p-3.5 border"
        style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-sm font-black" style={{ color: theme.txt0 }}>탑승 예약 신청</div>
            <div className="text-xs mt-0.5" style={{ color: theme.txt2, lineHeight: 1.55 }}>
              필요한 좌석과 차주에게 전할 메시지를 남겨 주세요.
            </div>
          </div>
          <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: canRequestSeats ? theme.mint : theme.txtDisabled, background: canRequestSeats ? theme.mintDim : theme.disabledSurface, border: `1px solid ${canRequestSeats ? theme.borderMint : theme.borderBri}` }}>
            잔여 {availableSeats}석
          </span>
        </div>

        <div className="rounded-xl p-3 border mb-2.5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="text-xs uppercase mb-1.5" style={{ color: theme.txt2, letterSpacing: '0.06em' }}>
            요청 좌석
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSeatCount((currentSeatCount) => clampReservationSeatCount(currentSeatCount - 1, availableSeats))}
              disabled={isBusy || requestedSeats <= 1}
              className="w-10 h-10 rounded-full text-lg font-black border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: isBusy || requestedSeats <= 1 ? theme.disabledSurface : theme.card, border: `1px solid ${isBusy || requestedSeats <= 1 ? theme.borderBri : theme.border}`, color: isBusy || requestedSeats <= 1 ? theme.txtDisabled : theme.txt0, cursor: isBusy || requestedSeats <= 1 ? 'not-allowed' : 'pointer', outlineColor: theme.mint }}
            >
              −
            </button>
            <span className="min-w-7 text-center text-base font-black" style={{ color: canRequestSeats ? theme.txt0 : theme.txtDisabled }}>
              {canRequestSeats ? requestedSeats : 0}
            </span>
            <button
              type="button"
              onClick={() => setSeatCount((currentSeatCount) => clampReservationSeatCount(currentSeatCount + 1, availableSeats))}
              disabled={isBusy || !canRequestSeats || requestedSeats >= availableSeats}
              className="w-10 h-10 rounded-full text-lg font-black border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: isBusy || !canRequestSeats || seatCount >= availableSeats ? theme.disabledSurface : theme.mintDim, border: `1px solid ${isBusy || !canRequestSeats || seatCount >= availableSeats ? theme.borderBri : theme.borderMint}`, color: isBusy || !canRequestSeats || seatCount >= availableSeats ? theme.txtDisabled : theme.mint, cursor: isBusy || !canRequestSeats || seatCount >= availableSeats ? 'not-allowed' : 'pointer', outlineColor: theme.mint }}
            >
              +
            </button>
          </div>
        </div>

        <textarea
          value={message}
              onChange={(event) => setMessage(event.target.value)}
          disabled={isBusy || !canRequestSeats}
          rows={2}
          placeholder="예: 경유지에서 탑승하고 싶어요."
          className="w-full rounded-xl p-3 text-xs resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: isBusy || !canRequestSeats ? theme.disabledSurface : theme.bg2, color: isBusy || !canRequestSeats ? theme.txtDisabled : theme.txt0, border: `1px solid ${isBusy || !canRequestSeats ? theme.borderBri : theme.border}`, outlineColor: theme.mint, lineHeight: 1.6 }}
        />

        {!canRequestSeats && (
          <div className="text-xs mt-2" style={{ color: theme.warm, lineHeight: 1.45 }}>
            {isRideOpen ? '현재 신청 가능한 좌석이 없습니다.' : '모집이 종료된 운행입니다.'}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 mt-3 rounded-2xl text-base font-black flex items-center justify-center gap-2 transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: canSubmit ? theme.cta : theme.disabledSurface, color: canSubmit ? '#FFFFFF' : theme.txtDisabled, boxShadow: canSubmit ? theme.shadowMint : 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', outlineColor: theme.mint }}
        >
          <CheckCircle size={18} strokeWidth={2.5} />
          {isBusy ? '예약 확인 중...' : '탑승 예약 신청'}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <StatusCard
        tone={reservation.status === 'approved' || reservation.status === 'completed' ? 'mint' : 'blue'}
        title="예약 상태"
        body={reservationStatusBody(reservation.status)}
      />
      {(reservation.status === 'pending' || reservation.status === 'approved') && (
        <button
          onClick={() => onCancel(reservation.id)}
          disabled={isBusy}
          className="w-full h-11 rounded-2xl text-sm font-bold border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: isBusy ? theme.disabledSurface : theme.warmDim, color: isBusy ? theme.txtDisabled : theme.warm, border: `1px solid ${isBusy ? theme.borderBri : theme.borderWarm}`, cursor: isBusy ? 'not-allowed' : 'pointer', outlineColor: theme.mint }}
        >
          예약 취소
        </button>
      )}
    </div>
  );
}

function DriverReservationPanel({
  reservations,
  isBusy,
  onStatusUpdate,
}: {
  reservations: Reservation[];
  isBusy: boolean;
  onStatusUpdate: (reservationId: string, status: ReservationStatus, transferInstruction?: string) => void;
}) {
  const [instructionReservationId, setInstructionReservationId] = useState<string | null>(null);
  const [transferInstruction, setTransferInstruction] = useState('');

  if (reservations.length === 0) {
    return <StatusCard tone="blue" title="예약 요청 없음" body="승객이 이 운행 상세에서 탑승 예약을 신청하면 여기에 표시됩니다. 등록 탭의 카풀 요청은 별도 요청 게시글이라 예약 승인 목록에는 들어오지 않습니다." />;
  }

  const openInstructionEditor = (reservation: Reservation) => {
    setInstructionReservationId(reservation.id);
    setTransferInstruction(defaultTransferInstruction(reservation));
  };

  const closeInstructionEditor = () => {
    if (isBusy) return;
    setInstructionReservationId(null);
    setTransferInstruction('');
  };

  const submitInstruction = (reservationId: string) => {
    const trimmedInstruction = transferInstruction.trim();

    if (!trimmedInstruction) return;
    onStatusUpdate(reservationId, 'completed', trimmedInstruction);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {reservations.map((reservation) => (
        <div key={reservation.id} className="rounded-3xl p-4 border" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black" style={{ color: theme.txt0 }}>
                {reservation.passenger?.nickname ?? '승객'} · {reservation.seatsRequested}석
              </div>
              <div className="text-xs mt-0.5 break-words" style={{ color: theme.txt2 }}>
                {reservation.message ?? '요청 메시지 없음'}
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
              {reservationStatusLabel(reservation.status)}
            </span>
          </div>
          {reservation.status === 'pending' && (
            <div className="kapool-grid-actions gap-2">
              <ActionButton label="승인" disabled={isBusy} tone="mint" onClick={() => onStatusUpdate(reservation.id, 'approved')} />
              <ActionButton label="거절" disabled={isBusy} tone="warm" onClick={() => onStatusUpdate(reservation.id, 'rejected')} />
            </div>
          )}
          {reservation.status === 'approved' && (
            instructionReservationId === reservation.id ? (
              <TransferInstructionEditor
                value={transferInstruction}
                disabled={isBusy}
                onChange={setTransferInstruction}
                onCancel={closeInstructionEditor}
                onSubmit={() => submitInstruction(reservation.id)}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <ActionButton label="운행 종료 안내 작성" disabled={isBusy} tone="blue" onClick={() => openInstructionEditor(reservation)} />
              </div>
            )
          )}
          {reservation.status === 'completed' && (
            <StatusCard tone="mint" title="운행 종료" body="승객 예약이 운행 종료 상태로 표시되었습니다." />
          )}
        </div>
      ))}
    </div>
  );
}

function RouteLine({ label, value, size = 'base' }: { label: string; value: string; size?: 'base' | 'lg' }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] font-bold" style={{ color: theme.txt2 }}>{label}</div>
      <div
        className={`${size === 'lg' ? 'text-2xl' : 'text-base'} font-black leading-snug`}
        style={{ color: theme.txt0, letterSpacing: '-0.045em', overflowWrap: 'anywhere' }}
      >
        {value}
      </div>
    </div>
  );
}

function WaypointBlock({ waypoints }: { waypoints: string[] }) {
  return (
    <div className="mb-2 rounded-2xl border p-3" style={{ background: theme.blueDim, border: `1px solid ${theme.borderBlue}` }}>
      <div className="mb-2 text-[10px] font-black uppercase" style={{ color: theme.blue, letterSpacing: '0.08em' }}>
        경유지 정보
      </div>
      <div className="flex flex-wrap gap-1.5">
        {waypoints.map((waypoint) => (
          <span key={waypoint} className="max-w-full truncate rounded-full px-2.5 py-1.5 text-xs font-bold" style={{ background: theme.cardStrong, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
            {waypoint} 경유
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionToast({ tone, message }: { tone: 'mint' | 'warm'; message: string }) {
  const color = tone === 'mint' ? theme.mint : theme.warm;
  const background = tone === 'mint' ? theme.mintDim : theme.warmDim;
  const border = tone === 'mint' ? theme.borderMint : theme.borderWarm;

  return (
    <div className="pointer-events-none absolute inset-x-4 top-5 z-40 rounded-2xl border p-3 text-xs font-bold" style={{ background, border: `1px solid ${border}`, color, boxShadow: theme.shadowCard, lineHeight: 1.55 }}>
      {message}
    </div>
  );
}

function ReservationConfirmDialog({
  status,
  disabled,
  onCancel,
  onConfirm,
}: {
  status: Extract<ReservationStatus, 'rejected' | 'cancelled'>;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isCancel = status === 'cancelled';
  const title = isCancel ? '예약을 취소할까요?' : '예약을 거절할까요?';
  const body = isCancel
    ? '취소하면 이 예약 요청이 철회됩니다.\n필요하면 같은 운행에서 다시 신청할 수 있습니다.'
    : '거절하면 승객에게 예약이 거절된 상태로 표시됩니다.';
  const confirmLabel = isCancel ? '예약 취소' : '예약 거절';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5" role="presentation">
      <div className="absolute inset-0 bg-black/35" onClick={disabled ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-confirm-title"
        className="relative w-full max-w-[320px] rounded-3xl border p-5 text-center"
        style={{ background: '#FFFFFF', border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}
      >
        <div id="reservation-confirm-title" className="text-lg font-black" style={{ color: theme.txt0, letterSpacing: '-0.03em' }}>
          {title}
        </div>
        <div className="mt-2 whitespace-pre-line text-sm" style={{ color: theme.txt1, lineHeight: 1.65 }}>
          {body}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="h-11 rounded-2xl text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: disabled ? theme.disabledSurface : '#FFFFFF', color: disabled ? theme.txtDisabled : theme.txt1, border: `1px solid ${disabled ? theme.borderBri : theme.border}`, outlineColor: theme.mint }}
          >
            아니요
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="h-11 rounded-2xl text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: disabled ? theme.disabledSurface : theme.warmDim, color: disabled ? theme.txtDisabled : theme.warm, border: `1px solid ${disabled ? theme.borderBri : theme.borderWarm}`, outlineColor: theme.mint }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferInstructionEditor({
  value,
  disabled,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const canSubmit = !disabled && value.trim().length > 0;

  return (
    <div className="rounded-3xl p-3.5 border" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black" style={{ color: theme.txt0 }}>운행 종료 안내 작성</div>
          <div className="text-xs mt-0.5" style={{ color: theme.txt2, lineHeight: 1.55 }}>
            운행 종료 전에 승객 채팅방에 남길 안내문을 확인해 주세요.
          </div>
        </div>
        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.blue, background: theme.blueDim, border: `1px solid ${theme.borderBlue}` }}>
          안내
        </span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={7}
        className="w-full rounded-2xl p-3 text-xs resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: disabled ? theme.disabledSurface : theme.bg2, color: disabled ? theme.txtDisabled : theme.txt0, border: `1px solid ${disabled ? theme.borderBri : theme.border}`, outlineColor: theme.mint, lineHeight: 1.6 }}
      />
      <div className="mt-2 text-xs" style={{ color: theme.txt2, lineHeight: 1.55 }}>
        입력한 안내는 제출 후 승객 채팅방에만 전달됩니다.
      </div>
      <div className="kapool-grid-actions mt-3 gap-2">
        <ActionButton label="취소" disabled={disabled} tone="warm" onClick={onCancel} />
        <ActionButton label="안내 보내고 운행 종료" disabled={!canSubmit} tone="mint" onClick={onSubmit} />
      </div>
    </div>
  );
}

function ActionButton({ label, disabled, tone, onClick }: { label: string; disabled: boolean; tone: 'mint' | 'blue' | 'warm'; onClick: () => void }) {
  const color = tone === 'mint' ? theme.mint : tone === 'blue' ? theme.blue : theme.warm;
  const background = tone === 'mint' ? theme.mintDim : tone === 'blue' ? theme.blueDim : theme.warmDim;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-11 rounded-xl text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: disabled ? theme.disabledSurface : background, color: disabled ? theme.txtDisabled : color, border: `1px solid ${disabled ? theme.borderBri : `${color}33`}`, cursor: disabled ? 'not-allowed' : 'pointer', outlineColor: theme.mint }}
    >
      {label}
    </button>
  );
}

function StatusCard({ tone, title, body }: { tone: 'mint' | 'blue' | 'warm'; title: string; body: string }) {
  const color = tone === 'mint' ? theme.mint : tone === 'blue' ? theme.blue : theme.warm;
  const background = tone === 'mint' ? theme.mintDim : tone === 'blue' ? theme.blueDim : theme.warmDim;

  return (
    <div className="rounded-3xl p-4 border" style={{ background, border: `1px solid ${color}33` }}>
      <div className="text-sm font-black mb-1" style={{ color }}>{title}</div>
      <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.6 }}>{body}</div>
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

function reservationStatusBody(status: ReservationStatus) {
  const labels: Record<ReservationStatus, string> = {
    pending: '차주 승인을 기다리는 중입니다.',
    approved: '차주가 예약을 승인했습니다. 채팅에서 탑승 위치를 확인해 주세요.',
    rejected: '차주가 이번 예약을 거절했습니다. 다른 운행을 확인해 주세요.',
    cancelled: '예약이 취소되었습니다. 필요하면 다시 신청할 수 있습니다.',
    completed: '운행이 종료된 예약입니다.',
  };

  return labels[status];
}

function isChatReadyReservation(reservation: Reservation) {
  return reservation.status === 'approved' || reservation.status === 'completed';
}

function clampReservationSeatCount(value: number, availableSeats: number) {
  if (availableSeats < 1) {
    return 0;
  }

  return Math.min(Math.max(value, 1), availableSeats);
}

function defaultTransferInstruction(reservation: Reservation) {
  const passengerName = reservation.passenger?.nickname ?? '승객';

  return [
    '운행 종료 안내',
    `대상: ${passengerName}`,
    '',
    '탑승이 끝난 뒤 필요한 안내를 이곳에 적어 주세요.',
    '정산은 KAPOOL 앱 밖에서 참여자가 직접 확인합니다.',
  ].join('\n');
}

function DetailState({ onBack, title, body }: { onBack: () => void; title: string; body: string }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-5">
      <button
        onClick={onBack}
        aria-label="이전 화면으로 돌아가기"
        className="w-11 h-11 rounded-full flex items-center justify-center mb-3.5 border cursor-pointer transition-all"
        style={{ background: theme.card, border: `1px solid ${theme.border}` }}
      >
        <ChevronLeft size={16} color={theme.txt1} />
      </button>
      <div className="rounded-2xl p-4 border" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="text-base font-black mb-1" style={{ color: theme.txt0 }}>{title}</div>
        <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.7 }}>{body}</div>
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

function formatRideDate(departureTime: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(new Date(departureTime));
}
