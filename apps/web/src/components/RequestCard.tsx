import { ArrowDown, Clock, MessageCircle, Users } from 'lucide-react';
import type { RideRequest } from '@kapool/shared';
import { theme } from '../lib/theme';

interface RequestCardProps {
  req: RideRequest;
  onChat?: (request: RideRequest) => void;
}

export function RequestCard({ req, onChat }: RequestCardProps) {
  const displayTime = formatRequestTime(req.time);
  const canChat = Boolean(req.id && onChat);

  return (
    <div
      className="kapool-request-card min-w-0 max-w-full p-3.5 rounded-2xl border relative overflow-hidden"
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.75"
        style={{
          background: `linear-gradient(90deg,${theme.blue},${theme.mint})`,
          borderRadius: `${theme.r16} ${theme.r16} 0 0`,
        }}
      />

      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="inline-flex w-auto min-w-fit shrink-0 items-center whitespace-nowrap rounded-full px-3 py-2 text-xs font-black leading-none" style={{ color: theme.mint, background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
          대기중
        </span>
      </div>
      <div className="mb-2 rounded-2xl px-3 py-2" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}` }}>
        <RouteLine label="출발" value={req.from} />
        <div className="my-1 flex items-center gap-2 pl-1">
          <ArrowDown size={13} color={theme.mint} />
          <span className="h-px flex-1" style={{ background: theme.borderMint }} />
        </div>
        <RouteLine label="도착" value={req.to} />
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <InfoPill icon={<Clock size={12} color={theme.mint} />} text={`${displayTime} 희망`} tone="mint" />
        <InfoPill icon={<Users size={12} color={theme.txt2} />} text="탑승 인원 1명" />
      </div>
      <div
        className="rounded-2xl border p-3"
        style={{
          background: theme.cardStrong,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="mb-1 text-[10px] font-black uppercase" style={{ color: theme.txt2, letterSpacing: '0.06em' }}>
          요청 내용
        </div>
        <div
          className="text-xs line-clamp-3 break-words"
          style={{
            color: theme.txt1,
            lineHeight: 1.55,
          }}
        >
          {req.content}
        </div>
      </div>
      {canChat && (
        <button
          type="button"
          onClick={() => onChat?.(req)}
          className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl text-xs font-black transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}`, outlineColor: theme.mint }}
        >
          <MessageCircle size={13} color={theme.blue} />
          대화하기
        </button>
      )}
    </div>
  );
}

function formatRequestTime(value: string) {
  const trimmedValue = value.trim();
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(trimmedValue);

  if (dateMatch) {
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const time = dateMatch[4] && dateMatch[5] ? ` ${dateMatch[4]}:${dateMatch[5]}` : '';

    return `${month}월 ${day}일${time}`;
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(parsedDate);
}

function RouteLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] font-bold" style={{ color: theme.txt2 }}>{label}</div>
      <div className="text-sm font-black leading-snug" style={{ color: theme.txt0, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>
        {value}
      </div>
    </div>
  );
}

function InfoPill({ icon, text, tone = 'neutral' }: { icon: React.ReactNode; text: string; tone?: 'mint' | 'neutral' }) {
  const color = tone === 'mint' ? theme.mint : theme.txt1;
  const background = theme.cardStrong;
  const border = theme.border;

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold" style={{ color, background, border: `1px solid ${border}` }}>
      {icon}
      <span className="min-w-0 truncate">{text}</span>
    </span>
  );
}
