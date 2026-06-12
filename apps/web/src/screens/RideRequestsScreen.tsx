import { useEffect, useState } from 'react';
import { ArrowDown, CalendarClock, ChevronLeft, MessageSquareText, UserRound } from 'lucide-react';
import type { RideRequest } from '@kapool/shared';
import { theme } from '../lib/theme';
import { fetchRideRequests } from '../lib/api';

interface RideRequestsScreenProps {
  accessToken: string;
  currentUserId: string;
  onChatRequest?: (request: RideRequest) => void;
  onBack: () => void;
}

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

export function RideRequestsScreen({ accessToken, currentUserId, onChatRequest, onBack }: RideRequestsScreenProps) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const hasRequesterIds = requests.some((request) => Boolean(request.passengerId));
  const visibleRequests = hasRequesterIds
    ? requests.filter((request) => request.passengerId === currentUserId)
    : requests;
  const displayLoadState: LoadState = loadState === 'ready' && visibleRequests.length === 0 ? 'empty' : loadState;

  useEffect(() => {
    let cancelled = false;

    fetchRideRequests(accessToken)
      .then((nextRequests) => {
        if (cancelled) return;
        setRequests(nextRequests);
        setLoadState(nextRequests.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setRequests([]);
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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
              내 카풀 요청
            </div>
            <div className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
              {visibleRequests.length}개 요청
            </div>
          </div>
          <div className="text-2xl font-black mb-2" style={{ letterSpacing: '-0.04em', color: theme.txt0 }}>
            내 카풀 요청
          </div>
          <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.55 }}>
            등록한 카풀 요청의 노선, 희망 시간, 요청 내용을 한곳에서 확인합니다.
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end px-5 pb-2.5 text-sm font-bold" style={{ color: theme.txt1 }}>
        <span>
          <span className="block text-base font-black" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>요청 목록</span>
          <span className="text-xs" style={{ color: theme.txt2 }}>최근에 등록한 요청</span>
        </span>
      </div>

      <div className="px-4 pb-6">
        {displayLoadState === 'loading' && <StateCard tone="blue" title="카풀 요청을 불러오는 중" body="내가 등록한 요청을 확인하고 있습니다." />}
        {displayLoadState === 'error' && <StateCard tone="warm" title="카풀 요청을 불러오지 못했습니다" body="네트워크 상태나 로그인 상태를 확인한 뒤 다시 열어 주세요." />}
        {displayLoadState === 'empty' && <StateCard tone="mint" title="등록한 카풀 요청이 없습니다" body="홈 화면의 새 요청 등록에서 출발지, 도착지, 희망 시간을 남기면 여기에 표시됩니다." />}
        {displayLoadState === 'ready' && visibleRequests.map((request, index) => (
          <RideRequestListCard key={request.id ?? `${request.from}-${request.to}-${request.time}-${index}`} request={request} currentUserId={currentUserId} onChatRequest={onChatRequest} />
        ))}
      </div>
    </div>
  );
}

function RideRequestListCard({ request, currentUserId, onChatRequest }: { request: RideRequest; currentUserId: string; onChatRequest?: (request: RideRequest) => void }) {
  return (
    <article className="mb-3 overflow-hidden rounded-3xl border" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg,${theme.blue},${theme.mint})` }} />
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl px-3 py-2" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
              <RouteLine label="출발" value={request.from} />
              <div className="my-1 flex items-center gap-2 pl-1">
                <ArrowDown size={13} color={theme.mint} />
                <span className="h-px flex-1" style={{ background: theme.borderMint }} />
              </div>
              <RouteLine label="도착" value={request.to} />
            </div>
          </div>
          <span className="inline-flex w-auto min-w-fit shrink-0 items-center whitespace-nowrap rounded-full px-3 py-2 text-xs font-black leading-none" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
            카풀 요청
          </span>
        </div>

        <div className="mb-3 flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: theme.border }}>
          <InfoPill icon={<CalendarClock size={12} color={theme.mint} />} text={`${request.time} 희망`} tone="mint" />
          <InfoPill icon={<UserRound size={12} color={theme.txt2} />} text={formatRequester(request, currentUserId)} tone="neutral" />
        </div>

        <div className="rounded-2xl border p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black" style={{ color: theme.blue }}>
            <MessageSquareText size={12} color={theme.blue} />
            요청 메모
          </div>
          <p className="m-0 text-xs" style={{ color: theme.txt1, lineHeight: 1.65, overflowWrap: 'anywhere' }}>
            {request.content}
          </p>
        </div>

        {request.createdAt && (
          <div className="mt-2.5 text-xs" style={{ color: theme.txt3 }}>
            등록 {formatCreatedAt(request.createdAt)}
          </div>
        )}
        {request.id && onChatRequest && (
          <button
            type="button"
            onClick={() => onChatRequest(request)}
            className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-black transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}`, outlineColor: theme.mint }}
          >
            대화하기
          </button>
        )}
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

function InfoPill({ icon, text, tone }: { icon: React.ReactNode; text: string; tone: 'mint' | 'neutral' }) {
  const color = tone === 'mint' ? theme.mint : theme.txt1;
  const background = tone === 'mint' ? theme.mintDim : theme.card;
  const border = tone === 'mint' ? theme.borderMint : theme.border;

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold" style={{ color, background, border: `1px solid ${border}` }}>
      {icon}
      <span className="min-w-0 truncate">{text}</span>
    </div>
  );
}

function StateCard({ tone, title, body }: { tone: 'mint' | 'blue' | 'warm'; title: string; body: string }) {
  const toneStyle = {
    mint: { color: theme.mint, background: theme.mintDim, border: theme.borderMint },
    blue: { color: theme.blue, background: theme.blueDim, border: theme.borderBlue },
    warm: { color: theme.warm, background: theme.warmDim, border: theme.borderWarm },
  }[tone];

  return (
    <div className="mb-3 overflow-hidden rounded-3xl border" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg,${toneStyle.color},transparent)` }} />
      <div className="p-4">
        <span className="mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black" style={{ color: toneStyle.color, background: toneStyle.background, border: `1px solid ${toneStyle.border}` }}>
          요청 상태
        </span>
        <div className="text-base font-black mb-1" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>{title}</div>
        <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.65 }}>{body}</div>
      </div>
    </div>
  );
}

function formatRequester(request: RideRequest, currentUserId: string) {
  if (!request.passengerId) {
    return '요청자 정보 없음';
  }

  if (request.passengerId === currentUserId) {
    return '내 요청';
  }

  return `요청자 ${request.passengerId.slice(-6)}`;
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(createdAt));
}
