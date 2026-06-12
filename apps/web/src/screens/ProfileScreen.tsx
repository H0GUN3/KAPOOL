import { useState, type ChangeEvent } from 'react';
import {
  Camera,
  Car,
  Calendar,
  LogOut,
  MessageCircle,
  Shield,
  Star,
  ChevronRight,
  UserRound,
} from 'lucide-react';
import type { AuthUser, UserRole } from '@kapool/shared';
import { theme } from '../lib/theme';
import { Notice } from '../components/Notice';
import { updateCurrentUserProfile } from '../lib/api';

interface ProfileScreenProps {
  onLogout?: () => void;
  user?: AuthUser;
  onVehicleOpen?: () => void;
  onReservationsOpen?: () => void;
  onRideRequestsOpen?: () => void;
  accessToken?: string;
  onUserUpdate?: (user: AuthUser) => void;
}

type ProfileDraft = {
  name: string;
  nickname: string;
  schoolEmail: string;
  department: string;
  homeRegion: string;
};

export function ProfileScreen({ onLogout, user, onVehicleOpen, onReservationsOpen, onRideRequestsOpen, accessToken, onUserUpdate }: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() => buildProfileDraft(user));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(() => ({
    userId: user?.id,
    dataUrl: user?.profile.photoDataUrl ?? '',
  }));
  const roleMeta = getRoleMeta(user?.role);
  const menuItems = getMenuItems(user?.role);
  const canEditProfile = Boolean(user && accessToken && onUserUpdate);
  const profilePhotoDataUrl = profilePhotoPreview.userId === user?.id
    ? profilePhotoPreview.dataUrl
    : user?.profile.photoDataUrl ?? '';

  const updateDraft = (key: keyof ProfileDraft, value: string) => {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  };

  const handleProfilePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!user?.id) {
      setStatusMessage('로그인 상태를 확인한 뒤 사진을 선택할 수 있습니다.');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 512 * 1024) {
      setStatusMessage('PNG, JPG, WebP 이미지를 512KB 이하로 선택해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextPhotoDataUrl = String(reader.result ?? '');
      setProfilePhotoPreview({ userId: user.id, dataUrl: nextPhotoDataUrl });
      setStatusMessage('선택한 사진은 저장 버튼을 눌러야 프로필에 반영됩니다.');
    };
    reader.onerror = () => setStatusMessage('사진을 읽지 못했습니다.');
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    if (!accessToken || !onUserUpdate) {
      setStatusMessage('로그인 상태를 확인한 뒤 프로필을 수정할 수 있습니다.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const nextUser = await updateCurrentUserProfile(accessToken, {
        name: draft.name.trim(),
        nickname: draft.nickname.trim(),
        schoolEmail: draft.schoolEmail.trim(),
        department: draft.department.trim(),
        homeRegion: draft.homeRegion.trim() || undefined,
        photoDataUrl: profilePhotoDataUrl || undefined,
      });

      onUserUpdate(nextUser);
      setDraft(buildProfileDraft(nextUser));
      setProfilePhotoPreview({ userId: nextUser.id, dataUrl: nextUser.profile.photoDataUrl ?? '' });
      setIsEditing(false);
      setStatusMessage('프로필 정보가 저장되었습니다.');
    } catch (error) {
      setStatusMessage(error instanceof Error && error.message === 'school_email_already_exists'
        ? '이미 사용 중인 이메일입니다.'
        : '프로필 수정에 실패했습니다. 입력값과 네트워크 상태를 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const profile = user?.profile ?? buildProfileDraft(user);

  const menuItemsWithIcons = menuItems.map((item) => ({
    ...item,
    icon: item.icon === 'calendar'
      ? <Calendar size={16} color={theme.mint} />
      : <MessageCircle size={16} color={theme.warm} />,
  }));

  const vehicleItems = user?.role === 'driver'
    ? [
        {
          icon: <Car size={16} color={theme.blue} />,
          label: '차량 정보',
        },
      ]
    : [
      ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Profile Hero */}
      <div className="px-5 pt-5 mb-5">
        <div
          className="rounded-2xl p-5 pb-4 relative overflow-hidden border"
          style={{
            background: theme.cardStrong,
            border: `1px solid ${theme.border}`,
          }}
        >
          {/* BG Orb */}
          <div
            className="absolute -top-7.5 -right-4 rounded-full"
            style={{
              width: 120,
              height: 120,
              background: `radial-gradient(circle,rgba(31,92,138,0.10) 0%,transparent 70%)`,
            }}
          />

          <div className="flex items-center gap-3.5">
            <div
              className="w-15 h-15 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0 overflow-hidden"
              style={{
                background: profilePhotoDataUrl ? theme.bg2 : `linear-gradient(135deg,${theme.blue},${theme.mint})`,
                boxShadow: `0 8px 24px ${theme.mintGlow}`,
              }}
            >
              {profilePhotoDataUrl ? (
                <img src={profilePhotoDataUrl} alt="프로필 미리보기" className="h-full w-full object-cover" />
              ) : (
                <UserRound aria-hidden="true" focusable="false" size={34} strokeWidth={2.2} />
              )}
            </div>
            <div className="min-w-0">
              <div
                className="text-lg font-black mb-0.5 break-words"
                style={{ letterSpacing: '-0.02em', color: theme.txt0 }}
              >
                {profile.nickname}
              </div>
              <div className="text-xs break-words" style={{ color: theme.txt2 }}>
                {roleMeta.label} · {profile.department} · {profile.homeRegion || '권역 미설정'}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <span
                  className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full gap-0.75"
                  style={{
                    background: theme.mintDim,
                    color: theme.mint,
                    border: `1px solid ${theme.borderMint}`,
                  }}
                >
                  <Star size={9} color={theme.mint} />
                  {roleMeta.badge}
                </span>
              </div>
            </div>
          </div>

          {/* Stats removed as requested */}
        </div>
      </div>

      {user?.role !== 'admin' && (
        <div className="px-4 pb-3">
          <Notice title="마이페이지 안내" tone="blue">
            {roleMeta.notice} 차량 인증 정보는 차주 계정에서 관리할 수 있습니다.
          </Notice>
        </div>
      )}

      {/* Edit Info Card (styled like menu items) */}
      <div className="px-4 pb-2">
        {isEditing ? (
          <form onSubmit={handleProfileSave} className="rounded-xl p-3.25 border" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: theme.txt0 }}>프로필 정보 수정</div>
                <div className="text-xs mt-0.5" style={{ color: theme.txt2 }}>사진은 저장 후 다른 기기에서도 표시됩니다.</div>
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
                {roleMeta.label}
              </span>
            </div>
            <div className="mb-3 overflow-hidden rounded-2xl border" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}` }}>
              <div className="flex min-h-28 items-center justify-center" style={{ background: theme.bg2 }}>
                {profilePhotoDataUrl ? (
                  <img src={profilePhotoDataUrl} alt="프로필 미리보기" className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
                      <Camera size={20} color={theme.mint} />
                    </div>
                    <div className="text-xs font-bold" style={{ color: theme.txt2 }}>프로필 사진 미리보기를 추가해 주세요</div>
                  </div>
                )}
              </div>
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 border-t text-xs font-black" style={{ color: theme.mint, borderColor: theme.border, background: theme.card }}>
                <Camera size={15} />
                사진 선택
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProfilePhotoChange} className="sr-only" />
              </label>
            </div>
            <div className="kapool-grid-pair gap-2 mb-2">
              <ProfileInput label="이름" value={draft.name} onChange={(value) => updateDraft('name', value)} />
              <ProfileInput label="닉네임" value={draft.nickname} onChange={(value) => updateDraft('nickname', value)} />
              <ProfileInput label="학과" value={draft.department} onChange={(value) => updateDraft('department', value)} />
              <ProfileInput label="권역" value={draft.homeRegion} onChange={(value) => updateDraft('homeRegion', value)} />
            </div>
            <ProfileInput label="이메일" type="email" value={draft.schoolEmail} onChange={(value) => updateDraft('schoolEmail', value)} />
            <div className="kapool-grid-actions gap-2 mt-3">
              <button type="button" onClick={() => { setIsEditing(false); setDraft(buildProfileDraft(user)); setProfilePhotoPreview({ userId: user?.id, dataUrl: user?.profile.photoDataUrl ?? '' }); }} disabled={isSaving} className="h-11 rounded-xl text-xs font-bold border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: theme.cardStrong, color: theme.txt1, border: `1px solid ${theme.border}`, outlineColor: theme.mint }}>
                취소
              </button>
              <button type="submit" disabled={isSaving} className="h-11 rounded-xl text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: isSaving ? theme.disabledSurface : theme.mintDim, color: isSaving ? theme.txtDisabled : theme.mint, border: `1px solid ${isSaving ? theme.borderBri : theme.borderMint}`, outlineColor: theme.mint }}>
                {isSaving ? '저장 중' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!canEditProfile) return;
              setDraft(buildProfileDraft(user));
              setProfilePhotoPreview({ userId: user?.id, dataUrl: user?.profile.photoDataUrl ?? '' });
              setIsEditing(true);
            }}
            disabled={!canEditProfile}
            className="w-full rounded-xl p-3.25 flex items-center gap-3 border text-left transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: canEditProfile ? theme.card : theme.disabledSurface,
              border: `1px solid ${canEditProfile ? theme.border : theme.borderBri}`,
              cursor: canEditProfile ? 'pointer' : 'not-allowed',
              outlineColor: theme.mint,
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.bg2 }}>
              <Shield size={16} color={canEditProfile ? theme.mint : theme.txt1} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold" style={{ color: theme.txt0 }}>
                내 정보수정
              </div>
              <div className="text-xs mt-0.5 break-words" style={{ color: theme.txt2 }}>
                이름: <span style={{ color: theme.txt0, fontWeight: 700 }}>{profile.name}</span>
                {'  '}·{'  '}
                학과: <span style={{ color: theme.txt0, fontWeight: 700 }}>{profile.department}</span>
              </div>
            </div>

            <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: canEditProfile ? theme.mint : theme.txtDisabled, background: canEditProfile ? theme.mintDim : theme.card, border: `1px solid ${canEditProfile ? theme.borderMint : theme.border}` }}>
              {canEditProfile ? '수정' : '로그인 필요'}
            </span>
          </button>
        )}
        {statusMessage && (
          <div role="status" className="mt-2 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: statusMessage.includes('실패') || statusMessage.includes('이미') ? theme.warmDim : theme.mintDim, color: statusMessage.includes('실패') || statusMessage.includes('이미') ? theme.warm : theme.mint }}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="px-4 pb-6 flex flex-col gap-2">
        {menuItemsWithIcons.map(({ icon, label, count }) => {
          const canOpenReservations = (label === '내 예약 내역' || label === '내 카풀 내역') && Boolean(onReservationsOpen);
          const canOpenRideRequests = label === '내 카풀 요청' && Boolean(onRideRequestsOpen);

          if (canOpenReservations || canOpenRideRequests) {
            const onClick = canOpenReservations ? onReservationsOpen : onRideRequestsOpen;
            const description = canOpenReservations
              ? user?.role === 'driver' ? '등록한 카풀과 예약 요청을 확인합니다' : '신청한 예약 상태를 확인합니다'
              : '등록한 카풀 요청을 확인합니다';

            return (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="min-h-14 rounded-xl p-3.25 flex items-center gap-3 border cursor-pointer transition-all text-left active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, outlineColor: theme.mint }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.bg2 }}>
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: theme.txt0 }}>{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: theme.txt2 }}>{description}</div>
                </div>
                <ChevronRight size={15} color={theme.txt2} />
              </button>
            );
          }

          return (
            <div
              key={label}
              className="min-h-14 rounded-xl p-3.25 flex items-center gap-3 border"
              style={{
                background: count === null ? theme.disabledSurface : theme.card,
                border: `1px solid ${count === null ? theme.borderBri : theme.border}`,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: theme.bg2,
                }}
              >
                {icon}
              </div>
              <span className="flex-1 text-sm font-semibold" style={{ color: theme.txt0 }}>{label}</span>
              {count !== null && (
                <span className="text-xs font-bold" style={{ color: theme.mint }}>
                  {count}건
                </span>
              )}
            </div>
          );
        })}

        {vehicleItems.map(({ icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={onVehicleOpen}
            className="min-h-14 rounded-xl p-3.25 flex items-center gap-3 border cursor-pointer transition-all text-left active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: theme.card, border: `1px solid ${theme.border}`, outlineColor: theme.mint }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.bg2 }}>
              {icon}
            </div>
            <span className="flex-1 text-sm font-semibold" style={{ color: theme.txt0 }}>{label}</span>
            <ChevronRight size={15} color={theme.txt2} />
          </button>
        ))}

        {/* Logout item */}
        <button
          type="button"
          className="min-h-14 rounded-xl p-3.25 flex items-center gap-3 border cursor-pointer transition-all text-left active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => onLogout && onLogout()}
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            outlineColor: theme.mint,
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: theme.bg2 }}
          >
            <LogOut size={16} color={theme.txt2} />
          </div>
          <span className="flex-1 text-sm font-semibold" style={{ color: theme.txt0 }}>로그아웃</span>
          <ChevronRight size={15} color={theme.txt2} />
        </button>
      </div>
    </div>
  );
}

function buildProfileDraft(user?: AuthUser): ProfileDraft {
  return {
    name: user?.profile.name ?? '',
    nickname: user?.profile.nickname ?? 'KAPOOL',
    schoolEmail: user?.profile.schoolEmail ?? user?.email ?? '',
    department: user?.profile.department ?? '학과 미설정',
    homeRegion: user?.profile.homeRegion ?? '',
  };
}

function getRoleMeta(role?: UserRole) {
  if (role === 'driver') {
    return {
      label: '차주 계정',
      badge: '운행 등록 가능',
      notice: '차주는 운행 등록과 예약 승인 중심으로 표시됩니다.',
    };
  }

  if (role === 'admin') {
    return {
      label: '운영자 계정',
      badge: '신고 검토 가능',
      notice: '운영자는 신고 검토와 사용자 맥락 확인 중심으로 표시됩니다.',
    };
  }

  return {
    label: '승객 계정',
    badge: '예약 신청 가능',
    notice: '승객은 예약 내역과 카풀 요청 중심으로 표시됩니다.',
  };
}

function getMenuItems(role?: UserRole) {
  if (role === 'driver') {
    return [
      { icon: 'calendar', label: '내 카풀 내역', count: null },
    ] as const;
  }

  if (role === 'admin') {
    return [] as const;
  }

  return [
    { icon: 'calendar', label: '내 예약 내역', count: null },
    { icon: 'message', label: '내 카풀 요청', count: null },
  ] as const;
}

function ProfileInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email';
}) {
  const inputId = `profile-${label.replace(/\s+/g, '-')}`;

  return (
    <label className="block rounded-xl px-3 py-2.5 border" style={{ background: theme.field, border: `1px solid ${theme.border}` }}>
      <span className="block text-xs font-bold mb-1" style={{ color: theme.txt2, letterSpacing: '0.06em' }}>
        {label}
      </span>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none"
        style={{ color: theme.txt0, fontFamily: 'inherit' }}
        required
      />
    </label>
  );
}
