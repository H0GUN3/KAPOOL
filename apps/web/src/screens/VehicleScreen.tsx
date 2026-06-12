import { useEffect, useState, type ChangeEvent } from 'react';
import { Camera, Car, ChevronLeft, Save } from 'lucide-react';
import type { UpsertVehicleDto, Vehicle } from '@kapool/shared';
import { theme } from '../lib/theme';
import { fetchMyVehicle, upsertMyVehicle } from '../lib/api';

interface VehicleScreenProps {
  accessToken: string;
  onBack: () => void;
}

type VehicleDraft = {
  model: string;
  color: string;
  capacity: string;
  plateLastFour: string;
  photoDataUrl: string;
};

type VehicleErrors = Partial<Record<keyof VehicleDraft, string>>;

const emptyDraft: VehicleDraft = {
  model: '',
  color: '',
  capacity: '4',
  plateLastFour: '',
  photoDataUrl: '',
};

export function VehicleScreen({ accessToken, onBack }: VehicleScreenProps) {
  const [draft, setDraft] = useState<VehicleDraft>(emptyDraft);
  const [errors, setErrors] = useState<VehicleErrors>({});
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchMyVehicle(accessToken)
      .then((vehicle) => {
        if (cancelled) return;
        setDraft(vehicle ? buildVehicleDraft(vehicle) : emptyDraft);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const updateDraft = (key: keyof VehicleDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setStatusMessage(null);
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 512 * 1024) {
      setErrors((current) => ({ ...current, photoDataUrl: 'PNG, JPG, WebP 이미지를 512KB 이하로 선택해 주세요.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateDraft('photoDataUrl', String(reader.result ?? ''));
    reader.onerror = () => setErrors((current) => ({ ...current, photoDataUrl: '사진을 읽지 못했습니다.' }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const validation = validateVehicleDraft(draft);
    setErrors(validation.errors);

    if (!validation.payload) {
      setStatusMessage('차량 정보를 다시 확인해 주세요.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const vehicle = await upsertMyVehicle(accessToken, validation.payload);
      setDraft(buildVehicleDraft(vehicle));
      setStatusMessage('차량 정보가 저장되었습니다.');
    } catch {
      setStatusMessage('차량 정보 저장에 실패했습니다. 입력값과 로그인 상태를 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-4 pt-4 pb-3.5">
        <button
          type="button"
          onClick={onBack}
          className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: theme.cardStrong, borderColor: theme.border, outlineColor: theme.mint }}
        >
          <ChevronLeft size={18} color={theme.txt0} />
        </button>
        <div className="rounded-3xl border p-4" style={{ background: theme.routeWash, border: `1px solid ${theme.borderBlue}`, boxShadow: theme.shadowCard }}>
          <div className="mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
            차량 정보
          </div>
          <div className="text-2xl font-black" style={{ color: theme.txt0, letterSpacing: '-0.035em' }}>
            내 차량 등록
          </div>
        </div>
      </div>

      {loadState === 'error' && (
        <div className="px-4 pb-3">
          <StatusCard tone="warm" message="차량 정보를 불러오지 못했습니다." />
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 pb-6" noValidate>
        <div className="mb-3 overflow-hidden rounded-3xl border" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
          <div className="relative flex min-h-44 items-center justify-center overflow-hidden" style={{ background: theme.bg2 }}>
            {draft.photoDataUrl ? (
              <img src={draft.photoDataUrl} alt="등록 차량" className="h-full max-h-64 w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
                  <Car size={24} color={theme.mint} />
                </div>
                <div className="text-xs font-bold" style={{ color: theme.txt2 }}>차량 사진을 추가해 주세요</div>
              </div>
            )}
          </div>
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 border-t text-sm font-black" style={{ color: theme.mint, borderColor: theme.border, background: theme.card }}>
            <Camera size={16} />
            사진 선택
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} className="sr-only" />
          </label>
        </div>
        {errors.photoDataUrl && <FieldError>{errors.photoDataUrl}</FieldError>}

        <div className="kapool-grid-pair gap-2 pb-2.5">
          <VehicleField label="차량 종류" value={draft.model} onChange={(value) => updateDraft('model', value)} error={errors.model} placeholder="예: 아반떼" />
          <VehicleField label="차량 색상" value={draft.color} onChange={(value) => updateDraft('color', value)} error={errors.color} placeholder="예: 흰색" />
        </div>
        <div className="kapool-grid-pair gap-2 pb-3">
          <VehicleField label="차량 정원" type="number" value={draft.capacity} onChange={(value) => updateDraft('capacity', value)} error={errors.capacity} placeholder="4" />
          <VehicleField label="번호 뒷자리" value={draft.plateLastFour} onChange={(value) => updateDraft('plateLastFour', value)} error={errors.plateLastFour} placeholder="1234" />
        </div>

        {statusMessage && <StatusCard tone={statusMessage.includes('실패') || statusMessage.includes('확인') ? 'warm' : 'mint'} message={statusMessage} />}

        <button
          type="submit"
          disabled={isSaving || loadState === 'loading'}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-black transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: isSaving || loadState === 'loading' ? theme.disabledSurface : theme.cta, color: isSaving || loadState === 'loading' ? theme.txtDisabled : '#FFFFFF', boxShadow: isSaving || loadState === 'loading' ? 'none' : theme.shadowMint, cursor: isSaving || loadState === 'loading' ? 'not-allowed' : 'pointer', outlineColor: theme.mint }}
        >
          <Save size={16} strokeWidth={2.5} />
          {isSaving ? '저장 중' : '차량 정보 저장'}
        </button>
      </form>
    </div>
  );
}

function buildVehicleDraft(vehicle: Vehicle): VehicleDraft {
  return {
    model: vehicle.model,
    color: vehicle.color,
    capacity: String(vehicle.capacity),
    plateLastFour: vehicle.plateLastFour ?? '',
    photoDataUrl: vehicle.photoDataUrl ?? '',
  };
}

function validateVehicleDraft(draft: VehicleDraft): { errors: VehicleErrors; payload: UpsertVehicleDto | null } {
  const model = draft.model.trim();
  const color = draft.color.trim();
  const capacity = Number(draft.capacity);
  const plateLastFour = draft.plateLastFour.trim();
  const errors: VehicleErrors = {};

  if (!model) errors.model = '차량 종류를 입력해 주세요.';
  if (!color) errors.color = '차량 색상을 입력해 주세요.';
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8) errors.capacity = '차량 정원은 1~8명으로 입력해 주세요.';
  if (plateLastFour && !/^\d{4}$/.test(plateLastFour)) errors.plateLastFour = '번호 뒷자리 4자리를 입력해 주세요.';

  if (Object.keys(errors).length > 0) {
    return { errors, payload: null };
  }

  return {
    errors,
    payload: {
      model,
      color,
      capacity,
      ...(plateLastFour ? { plateLastFour } : {}),
      ...(draft.photoDataUrl ? { photoDataUrl: draft.photoDataUrl } : {}),
    },
  };
}

function VehicleField({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
  type?: 'text' | 'number';
}) {
  const id = `vehicle-${label.replace(/\s+/g, '-')}`;

  return (
    <div className="rounded-xl border p-3" style={{ background: theme.card, border: `1px solid ${error ? theme.borderWarm : theme.border}` }}>
      <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase" style={{ color: theme.txt2, letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full border-none bg-transparent p-0 text-sm font-bold outline-none placeholder:text-white/30"
        style={{ color: theme.txt0, fontFamily: 'inherit' }}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function FieldError({ children }: { children: string }) {
  return <div className="mb-2 text-xs" style={{ color: theme.warm, lineHeight: 1.45 }}>{children}</div>;
}

function StatusCard({ tone, message }: { tone: 'mint' | 'warm'; message: string }) {
  const color = tone === 'mint' ? theme.mint : theme.warm;
  const background = tone === 'mint' ? theme.mintDim : theme.warmDim;
  const border = tone === 'mint' ? theme.borderMint : theme.borderWarm;

  return <div className="rounded-2xl border p-3 text-xs font-bold" style={{ color, background, border: `1px solid ${border}`, lineHeight: 1.55 }}>{message}</div>;
}
