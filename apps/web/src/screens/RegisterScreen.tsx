import type { HTMLAttributes, HTMLInputTypeAttribute } from 'react';
import { useState } from 'react';
import { CheckCircle, MapPin, Navigation } from 'lucide-react';
import type { CreateRideDto, CreateRideRequestDto, UserRole } from '@kapool/shared';
import { theme, FARE_OPTS } from '../lib/theme';
import { Notice } from '../components/Notice';
import { createRide, createRideRequest } from '../lib/api';

type FareRegion = CreateRideDto['fareRegion'];

const defaultDepartureLocal = toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000));

type ErrorKey =
  | 'from'
  | 'to'
  | 'departureTime'
  | 'vehicleModel'
  | 'vehicleColor'
  | 'vehicleCapacity'
  | 'plateLastFour'
  | 'seats'
  | 'fareRegion';

type FormErrors = Partial<Record<ErrorKey, string>>;
type RequestFormErrors = Partial<Record<keyof CreateRideRequestDto, string>>;
type RegisterMode = 'request' | 'ride';
type Feedback = { tone: 'mint' | 'warm'; message: string } | null;

const initialRequestForm: CreateRideRequestDto = {
  from: '',
  to: '',
  time: '',
  content: '',
};

interface RegisterScreenProps {
  accessToken: string;
  userRole?: UserRole;
  userName?: string;
  onSuccess?: () => void;
}

export function RegisterScreen({ accessToken, userRole, userName, onSuccess }: RegisterScreenProps) {
  const [mode, setMode] = useState<RegisterMode>(userRole === 'driver' ? 'ride' : 'request');
  const [from, setFrom] = useState('전주');
  const [to, setTo] = useState('군산대');
  const [departureTime, setDepartureTime] = useState(defaultDepartureLocal);
  const [waypointsText, setWaypointsText] = useState('팔복동, 개정IC');
  const [vehicleModel, setVehicleModel] = useState('아반떼');
  const [vehicleColor, setVehicleColor] = useState('흰색');
  const [vehicleCapacity, setVehicleCapacity] = useState('4');
  const [plateLastFour, setPlateLastFour] = useState('1234');
  const [region, setRegion] = useState<FareRegion>('전주');
  const [seats, setSeats] = useState(3);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<CreateRideRequestDto>(initialRequestForm);
  const [requestErrors, setRequestErrors] = useState<RequestFormErrors>({});
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<Feedback>(null);

  const fare = FARE_OPTS.find((o) => o.key === region)?.price;
  const capacityValue = parsePositiveInteger(vehicleCapacity);
  const canSubmit = userRole === 'driver' && !submitting;
  const canSubmitRequest = (userRole === 'passenger' || userRole === 'driver') && !requestSubmitting;

  const updateVehicleCapacity = (nextValue: string) => {
    setVehicleCapacity(nextValue);
    const nextCapacity = parsePositiveInteger(nextValue);

    if (nextCapacity) {
      setSeats((currentSeats) => clamp(currentSeats, 1, nextCapacity));
    }
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    if (!fare) {
      setErrorMessage('기타 권역은 아직 직접 금액 입력을 지원하지 않습니다. 전주·익산·군산 권역을 선택해 주세요.');
      return;
    }

    if (userRole !== 'driver') {
      setErrorMessage('차주 계정으로 로그인해야 운행을 등록할 수 있습니다.');
      return;
    }

    const validation = validateRegisterForm({
      from,
      to,
      departureTime,
      vehicleModel,
      vehicleColor,
      vehicleCapacity,
      plateLastFour,
      seats,
      fareRegion: region,
    });

    setFormErrors(validation.errors);

    if (!validation.payload) {
      setErrorMessage('필수 입력값을 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const payload: CreateRideDto = {
      from: validation.payload.from,
      to: validation.payload.to,
      departureTime: validation.payload.departureTime,
      seats: validation.payload.seats,
      fareRegion: region,
      waypoints: parseWaypoints(waypointsText),
      vehicle: {
        model: validation.payload.vehicleModel,
        color: validation.payload.vehicleColor,
        capacity: validation.payload.vehicleCapacity,
        plateLastFour: validation.payload.plateLastFour,
      },
    };

    try {
      await createRide(accessToken, payload);
      setSubmitted(true);
    } catch {
      setErrorMessage('운행 등록에 실패했습니다. 네트워크 상태와 로그인 권한을 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestField = <Key extends keyof CreateRideRequestDto>(field: Key, value: CreateRideRequestDto[Key]) => {
    setRequestForm((current) => ({ ...current, [field]: value }));
    setRequestErrors((current) => ({ ...current, [field]: undefined }));
    setRequestFeedback(null);
  };

  const handleRequestSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    if (userRole === 'admin') {
      setRequestFeedback({ tone: 'warm', message: '관리자 계정은 카풀 요청을 등록할 수 없습니다.' });
      return;
    }

    const validation = validateRequestForm(requestForm);
    setRequestErrors(validation.errors);

    if (!validation.payload) {
      setRequestFeedback({ tone: 'warm', message: '출발지, 도착지, 시간, 요청 내용을 모두 입력해 주세요.' });
      return;
    }

    setRequestSubmitting(true);
    setRequestFeedback(null);

    try {
      await createRideRequest(accessToken, validation.payload);
      setRequestForm(initialRequestForm);
      setRequestErrors({});
      setRequestFeedback({ tone: 'mint', message: '카풀 요청이 등록되었습니다. 홈의 내 요청 현황에서 확인할 수 있습니다.' });
    } catch {
      setRequestFeedback({ tone: 'warm', message: '요청 등록에 실패했습니다. 네트워크 상태와 로그인 권한을 확인해 주세요.' });
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
        <div
          className="w-18 h-18 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg,${theme.mint},${theme.blue})`,
            boxShadow: `0 16px 40px ${theme.mintGlow}`,
          }}
        >
          <CheckCircle size={36} color="#fff" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <div
            className="text-2xl font-black mb-2"
            style={{ letterSpacing: '-0.03em', color: theme.txt0 }}
          >
            운행 등록 완료
          </div>
        </div>
        <button
          onClick={() => {
            onSuccess?.();
            setSubmitted(false);
          }}
          className="w-50 h-12 rounded-2xl text-base font-bold flex items-center justify-center cursor-pointer transition-all"
          style={{
            background: theme.cta,
            color: '#FFFFFF',
            boxShadow: `0 10px 32px ${theme.mintGlow}`,
          }}
        >
          확인
        </button>
      </div>
    );
  }

  if (mode === 'request' || userRole !== 'driver') {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-5 pt-4 pb-3.5 flex-shrink-0">
          <div
            className="text-2xl font-black mb-1"
            style={{ letterSpacing: '-0.035em', color: theme.txt0 }}
          >
            카풀 요청 등록
          </div>
          <div className="text-xs" style={{ color: theme.txt1 }}>
            {formatName(userName)}님이 필요한 이동을 차주에게 남깁니다
          </div>
        </div>

        <ModeSwitch mode={mode} userRole={userRole} onChange={setMode} />

        <div className="px-4 pb-4">
          <Notice title="요청 안내" tone="blue">
            탑승 위치나 시간처럼 모호한 내용은 요청 메모에 먼저 남기고, 대화하기에서 차주와 조율합니다.
          </Notice>
        </div>

        <form onSubmit={handleRequestSubmit} noValidate className="px-4 pb-6">
          <div className="rounded-3xl border overflow-hidden" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
            <div className="h-1" style={{ background: `linear-gradient(90deg,${theme.blue},${theme.mint})` }} />
            <div className="p-3.5">
              <div className="kapool-grid-pair gap-2 pb-2.5">
                <TextField label="출발지" value={requestForm.from} onChange={(value) => updateRequestField('from', value)} error={requestErrors.from} autoComplete="address-level2" />
                <TextField label="도착지" value={requestForm.to} onChange={(value) => updateRequestField('to', value)} error={requestErrors.to} autoComplete="address-level2" />
              </div>
              <div className="pb-2.5">
                <TextField label="희망 시간" value={requestForm.time} onChange={(value) => updateRequestField('time', value)} error={requestErrors.time} autoComplete="off" />
                <div className="kapool-grid-presets gap-2 pt-2">
                  {buildQuickTimeOptions().map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateRequestField('time', option.value)}
                      className="min-h-10 rounded-xl px-3 text-xs font-bold border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        background: requestForm.time === option.value ? theme.mintDim : theme.card,
                        color: requestForm.time === option.value ? theme.mint : theme.txt1,
                        border: `1px solid ${requestForm.time === option.value ? theme.borderMint : theme.border}`,
                        outlineColor: theme.mint,
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pb-3">
                <TextAreaField label="요청 내용" value={requestForm.content} onChange={(value) => updateRequestField('content', value)} error={requestErrors.content} placeholder="예: 1명 탑승, 호남제일문 근처에서 타고 싶어요." />
              </div>

              {requestFeedback && <FeedbackCard feedback={requestFeedback} />}

              <button
                type="submit"
                disabled={!canSubmitRequest}
                className="w-full h-12 rounded-2xl text-base font-black flex items-center justify-center cursor-pointer transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: canSubmitRequest ? theme.cta : theme.disabledSurface,
                  color: canSubmitRequest ? '#FFFFFF' : theme.txtDisabled,
                  boxShadow: canSubmitRequest ? theme.shadowMint : 'none',
                  cursor: canSubmitRequest ? 'pointer' : 'not-allowed',
                  outlineColor: theme.mint,
                }}
              >
                {requestSubmitting ? '요청 등록 중...' : '카풀 요청 등록하기'}
              </button>
            </div>
          </div>
        </form>

        {userRole === 'admin' && (
          <div className="px-4 pb-4">
            <Notice title="요청 등록 제한" tone="warm">
              관리자 계정은 카풀 요청을 등록할 수 없습니다.
            </Notice>
          </div>
        )}

        {userRole !== 'driver' && (
          <div
            className="mx-4 mb-6 rounded-3xl border p-5"
            style={{
              background: theme.card,
              borderColor: theme.border,
              boxShadow: theme.shadowCard,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}
              >
                <Navigation size={20} color={theme.mint} />
              </div>
              <div>
                <div className="text-base font-black mb-1" style={{ color: theme.txt0 }}>
                  운행 등록은 차주 계정에서 사용할 수 있습니다
                </div>
                <p className="text-sm m-0" style={{ color: theme.txt2, lineHeight: 1.7 }}>
                  승객 계정에서는 이 화면에서 카풀 요청을 올리고 홈에서 내 요청 현황을 확인합니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="px-5 pt-4 pb-3.5 flex-shrink-0">
        <div
          className="text-2xl font-black mb-1"
          style={{ letterSpacing: '-0.035em', color: theme.txt0 }}
        >
          운행 등록
        </div>
        <div className="text-xs" style={{ color: theme.txt1 }}>
          차주 계정으로 새 운행을 등록합니다
        </div>
      </div>

      <ModeSwitch mode={mode} userRole={userRole} onChange={setMode} />

      <div className="px-4 pb-3.5">
        <Notice title="등록 안내" tone="warm">
          경유지는 쉼표로 여러 개 입력할 수 있습니다. 저장된 경유지는 운행 카드와 상세 화면에서 작은 경유 블록으로 표시됩니다.
        </Notice>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Route */}
        <SectionTitle>출발 · 도착 지역</SectionTitle>
        <div className="kapool-grid-pair gap-2 px-4 pb-3.5">
          <TextField label="출발지" value={from} onChange={setFrom} error={formErrors.from} autoComplete="address-level2" />
          <TextField label="도착지" value={to} onChange={setTo} error={formErrors.to} autoComplete="address-level2" />
        </div>

        <SectionTitle>경유지 안내</SectionTitle>
        <div
          className="mx-4 mb-3.5 rounded-2xl border p-3.5 flex items-start gap-3"
          style={{
            background: theme.cardStrong,
            border: `1px solid ${theme.borderMint}`,
          }}
        >
        <div
          className="w-9.5 h-9.5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: theme.mintDim,
            border: `1.5px solid ${theme.borderMint}`,
          }}
        >
          <MapPin size={16} color={theme.mint} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-black mb-1" style={{ color: theme.mint }}>
            쉼표로 경유지 입력
          </div>
          <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.6 }}>
            예: 팔복동, 개정IC처럼 입력하면 각각 나뉘어 표시됩니다.
          </div>
        </div>
        </div>

        <div className="px-4 pb-3.5">
          <TextAreaField label="경유지" value={waypointsText} onChange={setWaypointsText} placeholder="예: 팔복동, 개정IC" />
          <WaypointPreview waypoints={parseWaypoints(waypointsText)} />
        </div>

        {/* Time & Capacity */}
        <SectionTitle>시간 · 차량 정보</SectionTitle>
        <div className="px-4 pb-2.5">
          <TextField label="출발 일시" type="datetime-local" value={departureTime} onChange={setDepartureTime} error={formErrors.departureTime} />
        </div>
        <div className="kapool-grid-pair gap-2 px-4 pb-2.5">
          <TextField label="차량 종류" value={vehicleModel} onChange={setVehicleModel} error={formErrors.vehicleModel} autoComplete="off" />
          <TextField label="차량 색상" value={vehicleColor} onChange={setVehicleColor} error={formErrors.vehicleColor} autoComplete="off" />
        </div>
        <div className="kapool-grid-pair gap-2 px-4 pb-2.5">
          <TextField label="차량 정원" type="number" value={vehicleCapacity} onChange={updateVehicleCapacity} error={formErrors.vehicleCapacity} min={1} max={8} inputMode="numeric" />
          <TextField label="번호 뒷자리" value={plateLastFour} onChange={setPlateLastFour} error={formErrors.plateLastFour} maxLength={4} inputMode="numeric" autoComplete="off" />
        </div>
        <div className="px-4 pb-2.5">
        <div
          className="rounded-xl p-3 border"
          style={{
            background: theme.cardStrong,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div
            className="text-xs uppercase mb-1.25"
            style={{ color: theme.txt2, letterSpacing: '0.06em' }}
          >
            탑승 인원
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              disabled={seats <= 1}
              className="w-11 h-11 rounded-full text-lg font-black border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: seats <= 1 ? theme.disabledSurface : theme.card,
                border: `1px solid ${seats <= 1 ? theme.borderBri : theme.border}`,
                color: seats <= 1 ? theme.txtDisabled : theme.txt0,
                cursor: seats <= 1 ? 'not-allowed' : 'pointer',
                outlineColor: theme.mint,
              }}
            >
              −
            </button>
            <span className="min-w-7 text-center text-base font-black" style={{ color: theme.txt0 }}>{seats}</span>
            <button
              type="button"
              onClick={() => setSeats((s) => Math.min(capacityValue ?? s, s + 1))}
              disabled={!capacityValue || seats >= capacityValue}
              className="w-11 h-11 rounded-full text-lg font-black border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: !capacityValue || seats >= capacityValue ? theme.disabledSurface : theme.mintDim,
                border: `1px solid ${!capacityValue || seats >= capacityValue ? theme.borderBri : theme.borderMint}`,
                color: !capacityValue || seats >= capacityValue ? theme.txtDisabled : theme.mint,
                cursor: !capacityValue || seats >= capacityValue ? 'not-allowed' : 'pointer',
                outlineColor: theme.mint,
              }}
            >
              +
            </button>
          </div>
          {formErrors.seats && <FieldError>{formErrors.seats}</FieldError>}
        </div>
        </div>

        {/* Fare Region */}
        <SectionTitle>운행 금액 권역</SectionTitle>
        <div className="kapool-grid-pair gap-2 px-4 pb-3">
        {FARE_OPTS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => isFareRegion(o.key) && setRegion(o.key)}
            disabled={o.price === null}
            className="min-h-14 rounded-xl p-3 text-left border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: o.price === null ? theme.disabledSurface : region === o.key ? theme.mintDim : theme.card,
              border: `1px solid ${
                o.price === null ? theme.borderBri : region === o.key ? theme.borderMint : theme.border
              }`,
              cursor: o.price === null ? 'not-allowed' : 'pointer',
              outlineColor: theme.mint,
            }}
          >
            <div className="text-xs font-semibold mb-0.75" style={{ color: theme.txt0 }}>
              {o.label}
            </div>
            <div
              className="text-sm font-black"
              style={{
                color: o.price === null ? theme.txtDisabled : region === o.key ? theme.mint : theme.txt1,
              }}
            >
              {o.price ? `${o.price.toLocaleString()}원` : '직접 입력 미지원'}
            </div>
          </button>
        ))}
        </div>

      {/* Fare Display */}
        {fare && (
        <div
          className="mx-4 mb-3.5 rounded-2xl p-3.5 flex justify-between items-center border"
          style={{
            background: theme.routeWash,
            border: `1px solid ${theme.borderMint}`,
          }}
        >
          <div>
            <div className="text-xs mb-1" style={{ color: theme.txt2 }}>
              권역별 운행 금액
            </div>
            <div
              className="text-3xl font-black"
              style={{
                color: theme.mint,
                letterSpacing: '-0.04em',
              }}
            >
              {fare.toLocaleString()}
              <span className="text-sm font-normal" style={{ color: theme.txt1 }}>
                원
              </span>
            </div>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{
              background: theme.mintDim,
              border: `1px solid ${theme.borderMint}`,
              color: theme.mint,
            }}
          >
            운행 금액
          </span>
        </div>
        )}

        {/* Ride Guidance */}
        <SectionTitle>운행 안내</SectionTitle>
        <div className="px-4 pb-3.5">
          <Notice title="예약 이후 안내" tone="blue">
            승인 이후 세부 안내는 채팅에서 직접 조율합니다. 이 화면에는 운행 조건만 저장합니다.
          </Notice>
        </div>

        {/* Submit */}
        <div className="px-4 pb-6">
        {errorMessage && (
          <div
            className="mb-2.5 rounded-xl p-3 text-xs border"
            style={{ background: theme.warmDim, border: `1px solid ${theme.borderWarm}`, color: theme.warm, lineHeight: 1.6 }}
          >
            {errorMessage}
          </div>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
          style={{
            background: canSubmit ? theme.logo : theme.disabledSurface,
            color: canSubmit ? '#FFFFFF' : theme.txtDisabled,
            boxShadow: canSubmit ? theme.shadowMint : 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          <Navigation size={16} strokeWidth={2.5} />
          {submitting ? '등록 중...' : '운행 등록하기'}
        </button>
        {userRole !== 'driver' && (
          <div className="text-xs mt-2 text-center" style={{ color: theme.txt2 }}>
            승객 계정은 등록 버튼이 비활성화됩니다.
          </div>
        )}
        </div>
      </form>
    </div>
  );
}

function isFareRegion(value: string): value is FareRegion {
  return value === '전주' || value === '익산' || value === '군산';
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function buildQuickTimeOptions() {
  return [
    { dayOffset: 0, hour: 18, minute: 30 },
    { dayOffset: 1, hour: 8, minute: 30 },
    { dayOffset: 2, hour: 8, minute: 30 },
  ].map((option) => buildQuickTimeOption(option.dayOffset, option.hour, option.minute));
}

function buildQuickTimeOption(dayOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  const label = `${date.getDate()}일`;
  const value = formatRequestDateTime(date);

  return { label, value };
}

function formatRequestDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parsePositiveInteger(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseWaypoints(value: string) {
  return value
    .split(',')
    .map((waypoint) => waypoint.trim())
    .filter(Boolean);
}

function validateRegisterForm({
  from,
  to,
  departureTime,
  vehicleModel,
  vehicleColor,
  vehicleCapacity,
  plateLastFour,
  seats,
  fareRegion,
}: {
  from: string;
  to: string;
  departureTime: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleCapacity: string;
  plateLastFour: string;
  seats: number;
  fareRegion: string;
}): {
  errors: FormErrors;
  payload: null | {
    from: string;
    to: string;
    departureTime: string;
    vehicleModel: string;
    vehicleColor: string;
    vehicleCapacity: number;
    plateLastFour: string;
    seats: number;
  };
} {
  const errors: FormErrors = {};
  const trimmedFrom = from.trim();
  const trimmedTo = to.trim();
  const trimmedModel = vehicleModel.trim();
  const trimmedColor = vehicleColor.trim();
  const trimmedPlate = plateLastFour.trim();
  const capacity = parsePositiveInteger(vehicleCapacity);
  const parsedDepartureTime = new Date(departureTime);

  if (!trimmedFrom) errors.from = '출발지를 입력해 주세요.';
  if (!trimmedTo) errors.to = '도착지를 입력해 주세요.';
  if (!departureTime || Number.isNaN(parsedDepartureTime.getTime())) errors.departureTime = '출발 일시를 선택해 주세요.';
  if (!trimmedModel) errors.vehicleModel = '차량 종류를 입력해 주세요.';
  if (!trimmedColor) errors.vehicleColor = '차량 색상을 입력해 주세요.';
  if (!capacity) errors.vehicleCapacity = '차량 정원은 1명 이상이어야 합니다.';
  if (!/^\d{4}$/.test(trimmedPlate)) errors.plateLastFour = '차량번호 뒷자리 4자리를 입력해 주세요.';
  if (!isFareRegion(fareRegion)) errors.fareRegion = '지원 권역을 선택해 주세요.';
  if (capacity && (seats < 1 || seats > capacity)) errors.seats = '탑승 가능 좌석은 차량 정원 이하여야 합니다.';

  if (Object.keys(errors).length > 0 || !capacity) {
    return { errors, payload: null };
  }

  return {
    errors,
    payload: {
      from: trimmedFrom,
      to: trimmedTo,
      departureTime: parsedDepartureTime.toISOString(),
      vehicleModel: trimmedModel,
      vehicleColor: trimmedColor,
      vehicleCapacity: capacity,
      plateLastFour: trimmedPlate,
      seats: clamp(seats, 1, capacity),
    },
  };
}

function validateRequestForm(form: CreateRideRequestDto): {
  errors: RequestFormErrors;
  payload: CreateRideRequestDto | null;
} {
  const payload: CreateRideRequestDto = {
    from: form.from.trim(),
    to: form.to.trim(),
    time: form.time.trim(),
    content: form.content.trim(),
  };
  const errors: RequestFormErrors = {};

  if (!payload.from) errors.from = '출발지를 입력해 주세요.';
  if (!payload.to) errors.to = '도착지를 입력해 주세요.';
  if (!payload.time) errors.time = '희망 시간을 입력해 주세요.';
  if (!payload.content) errors.content = '요청 내용을 입력해 주세요.';

  return Object.keys(errors).length > 0 ? { errors, payload: null } : { errors, payload };
}

function ModeSwitch({ mode, userRole, onChange }: { mode: RegisterMode; userRole?: UserRole; onChange: (mode: RegisterMode) => void }) {
  return (
    <div className="px-4 pb-3.5">
      <div className="kapool-grid-pair gap-2 rounded-3xl border p-1.5" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}` }}>
        <ModeButton active={mode === 'request'} label="카풀 요청" onClick={() => onChange('request')} />
        <ModeButton active={mode === 'ride'} label="운행 등록" disabled={userRole !== 'driver'} onClick={() => onChange('ride')} />
      </div>
    </div>
  );
}

function ModeButton({ active, label, disabled = false, onClick }: { active: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 rounded-2xl px-3 text-sm font-black transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: disabled ? theme.disabledSurface : active ? theme.mintDim : theme.card,
        color: disabled ? theme.txtDisabled : active ? theme.mint : theme.txt1,
        border: `1px solid ${disabled ? theme.borderBri : active ? theme.borderMint : theme.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outlineColor: theme.mint,
      }}
    >
      {label}
    </button>
  );
}

function FeedbackCard({ feedback }: { feedback: Exclude<Feedback, null> }) {
  return (
    <div
      className="mb-2.5 rounded-xl p-3 text-xs border"
      style={{
        background: feedback.tone === 'mint' ? theme.mintDim : theme.warmDim,
        border: `1px solid ${feedback.tone === 'mint' ? theme.borderMint : theme.borderWarm}`,
        color: feedback.tone === 'mint' ? theme.mint : theme.warm,
        lineHeight: 1.6,
      }}
    >
      {feedback.message}
    </div>
  );
}

function formatName(userName?: string) {
  return userName?.trim() || '계정';
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      className="px-5 pb-2 uppercase text-xs font-bold flex items-center gap-2"
      style={{
        color: theme.txt2,
        letterSpacing: '0.08em',
      }}
    >
      {children}
      <div className="flex-1 h-px" style={{ background: theme.border }} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  inputMode,
  min,
  max,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  min?: number;
  max?: number;
  maxLength?: number;
}) {
  const inputId = `register-${label.replace(/\s+/g, '-')}`;

  return (
    <div
      className="rounded-xl p-3 border"
      style={{
        background: theme.card,
        border: `1px solid ${error ? theme.borderWarm : theme.border}`,
      }}
    >
      <label
        htmlFor={inputId}
        className="mb-1 block text-[13px] font-extrabold uppercase"
        style={{
          color: theme.txt2,
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        min={min}
        max={max}
        maxLength={maxLength}
        className="w-full min-h-10 bg-transparent border-none p-0 text-base font-extrabold outline-none"
        style={{ letterSpacing: '-0.01em', color: theme.txt0, fontFamily: 'inherit' }}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
}) {
  const inputId = `register-${label.replace(/\s+/g, '-')}`;

  return (
    <div className="rounded-xl p-3 border" style={{ background: theme.card, border: `1px solid ${error ? theme.borderWarm : theme.border}` }}>
      <label htmlFor={inputId} className="mb-1 block text-[13px] font-extrabold uppercase" style={{ color: theme.txt2, letterSpacing: '0.06em' }}>
        {label}
      </label>
      <textarea
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full min-h-12 bg-transparent border-none resize-none p-0 text-base font-extrabold outline-none"
        style={{ color: theme.txt0, lineHeight: 1.6, fontFamily: 'inherit' }}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function WaypointPreview({ waypoints }: { waypoints: string[] }) {
  if (waypoints.length === 0) {
    return (
      <div className="mt-2 text-xs" style={{ color: theme.txt2, lineHeight: 1.5 }}>
        입력한 경유지가 없으면 카드에는 출발지와 도착지만 표시됩니다.
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {waypoints.map((waypoint) => (
        <span
          key={waypoint}
          className="max-w-full truncate rounded-full px-2 py-1 text-xs font-bold"
          style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}
        >
          {waypoint} 경유
        </span>
      ))}
    </div>
  );
}

function FieldError({ children }: { children: string }) {
  return (
    <div className="text-xs mt-1.5" style={{ color: theme.warm, lineHeight: 1.45 }}>
      {children}
    </div>
  );
}
