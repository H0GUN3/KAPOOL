import { useCallback, useEffect, useRef, useState } from 'react';
import { Car, ChevronLeft, Clock, Send, Wallet } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import type { ChatHistoryDto, ChatMessage, ChatRoomSummary, Ride } from '@kapool/shared';
import { theme } from '../lib/theme';
import { Avatar } from '../components/Avatar';
import {
  fetchChatHistory,
  fetchChatRoomHistory,
  fetchChatRooms,
  fetchRideRequestChatHistory,
  realtimeBaseUrl,
} from '../lib/api';

interface ChatScreenProps {
  accessToken: string;
  ride: Ride | null;
  rideRequestId?: string | null;
  onBack: () => void;
}

type LoadState = 'loading' | 'ready' | 'denied' | 'error';
type ListLoadState = 'loading' | 'ready' | 'empty' | 'error';

export function ChatScreen({ accessToken, ride, rideRequestId, onBack }: ChatScreenProps) {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [listLoadState, setListLoadState] = useState<ListLoadState>('loading');
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [room, setRoom] = useState<ChatRoomSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(accessToken ? 'loading' : 'denied');
  const [socketState, setSocketState] = useState<'connecting' | 'connected' | 'offline'>('offline');
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldShowList = !ride?.id && !rideRequestId && !selectedRoomId;

  const applyHistory = useCallback((history: ChatHistoryDto) => {
    setRoom(history.room);
    setMsgs(history.messages);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    let cancelled = false;

    socketRef.current?.disconnect();
    socketRef.current = null;

    if (!accessToken) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setLoadState('denied');
        setSocketState('offline');
        setListLoadState('error');
      });
      return () => {
        cancelled = true;
      };
    }

    if (shouldShowList) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setListLoadState('loading');
      });
      fetchChatRooms(accessToken)
        .then((nextRooms) => {
          if (cancelled) return;
          setRooms(nextRooms);
          setListLoadState(nextRooms.length > 0 ? 'ready' : 'empty');
        })
        .catch(() => {
          if (cancelled) return;
          setRooms([]);
          setListLoadState('error');
        });

      return () => {
        cancelled = true;
      };
    }

    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadState('loading');
      setSocketState('offline');
      setMsgs([]);
      setRoom(null);
    });

    const historyPromise = rideRequestId
      ? fetchRideRequestChatHistory(accessToken, rideRequestId)
      : selectedRoomId
        ? fetchChatRoomHistory(accessToken, selectedRoomId)
        : fetchChatHistory(accessToken, ride?.id);

    historyPromise
      .then((history) => {
        if (cancelled) return;
        applyHistory(history);
        setLoadState('ready');
        setSocketState('connecting');

        const socket = io(realtimeBaseUrl, {
          auth: { token: accessToken },
          reconnectionAttempts: 2,
        });

        socketRef.current = socket;
        socket.on('connect', () => {
          setSocketState('connected');
          socket.emit('chat:join', { roomId: history.room.id });
        });
        socket.on('disconnect', () => setSocketState('offline'));
        socket.on('chat:joined', (nextHistory: ChatHistoryDto) => applyHistory(nextHistory));
        socket.on('chat:message', (message: ChatMessage) => {
          setMsgs((currentMessages) => {
            if (message.id && currentMessages.some((currentMessage) => currentMessage.id === message.id)) {
              return currentMessages;
            }

            return [...currentMessages, message];
          });
        });
        socket.on('chat:error', () => {
          setLoadState('denied');
          setSocketState('offline');
        });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setLoadState(error.message === 'chat_access_denied' ? 'denied' : 'error');
        setSocketState('offline');
      });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, applyHistory, ride?.id, rideRequestId, selectedRoomId, shouldShowList]);

  const handleBack = () => {
    if (selectedRoomId && !ride?.id && !rideRequestId) {
      setSelectedRoomId(null);
      return;
    }

    onBack();
  };

  const send = (text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText || !room || !socketRef.current?.connected) return;
    socketRef.current.emit('chat:send', { roomId: room.id, text: trimmedText });
    setInput('');
  };

  if (shouldShowList) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <ChatListHeader onBack={onBack} />
        <div className="px-4 pb-6">
          {listLoadState === 'loading' && <ChatStateCard tone="blue" title="채팅방을 불러오는 중" body="참여 중인 대화방을 확인하고 있습니다." />}
          {listLoadState === 'error' && <ChatStateCard tone="warm" title="채팅방을 불러오지 못했습니다" body="네트워크 상태를 확인한 뒤 다시 열어 주세요." />}
          {listLoadState === 'empty' && <ChatStateCard tone="mint" title="참여 중인 채팅방이 없습니다" body="예약이 승인되거나 카풀 요청에서 대화를 시작하면 이곳에 표시됩니다." />}
          {listLoadState === 'ready' && rooms.map((chatRoom) => (
            <ChatRoomCard key={chatRoom.id} room={chatRoom} onClick={() => setSelectedRoomId(chatRoom.id)} />
          ))}
        </div>
      </div>
    );
  }

  const displayRide = room?.ride ?? ride;
  const displayRequest = room?.rideRequest;
  const displayRequester = room?.requester;
  const displayTime = displayRide ? formatRideTime(displayRide.departureTime) : displayRequest?.time ?? '시간 조율 중';
  const vehicleLabel = displayRide?.vehicle
    ? `${displayRide.vehicle.color} ${displayRide.vehicle.model}`
    : displayRequest
      ? '카풀 대화방'
      : '차량 정보 미등록';
  const canSend = loadState === 'ready' && socketState === 'connected';
  const statusMessage = loadState === 'loading'
    ? '채팅방을 불러오는 중입니다.'
    : loadState === 'denied'
      ? '이 채팅방에 입장할 수 없습니다.'
      : loadState === 'error'
        ? '채팅 내역을 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.'
        : socketState === 'connected'
          ? '새 메시지를 바로 주고받을 수 있습니다.'
          : '이전 메시지를 표시하고 있습니다. 새 메시지 연결을 다시 시도 중입니다.';
  const statusTitle = loadState === 'loading'
    ? '채팅을 불러오는 중'
    : loadState === 'denied'
      ? '입장 권한 없음'
      : loadState === 'error'
        ? '채팅을 불러오지 못했습니다'
        : socketState === 'connected'
          ? '채팅 가능'
          : '새 메시지 연결 중';
  const statusTone = loadState === 'denied' || loadState === 'error'
    ? 'warm'
    : socketState === 'connected'
      ? 'mint'
      : 'blue';

  return (
    <>
      <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b" style={{ background: theme.bg1, borderColor: theme.border }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={handleBack}
            className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: theme.cardStrong, borderColor: theme.border, outlineColor: theme.mint }}
          >
            <ChevronLeft size={18} color={theme.txt0} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="min-w-0 text-lg font-black break-words" style={{ letterSpacing: '-0.035em' }}>
                <span style={{ color: theme.txt0 }}>{formatRoomTitle(room, displayRide)}</span>
              </div>
              <ConnectionBadge tone={statusTone} label={statusTitle} />
            </div>
            <div className="text-xs" style={{ color: theme.txt1 }}>
              {displayRequest ? `${displayRequester?.nickname ?? '요청자'} · 카풀 요청 대화` : `${displayTime} 출발 · 승인 참여자 채팅`}
            </div>
          </div>
        </div>

        <div className="rounded-3xl p-3.5 border" style={{ background: theme.routeWash, border: `1px solid ${theme.borderBlue}`, boxShadow: theme.shadowCard }}>
          <div className="text-xs font-bold mb-1.5 uppercase flex items-center gap-1.25" style={{ color: theme.blue, letterSpacing: '0.08em' }}>
            <div className="w-3 h-0.5 rounded" style={{ background: theme.blue }} />
            {displayRequest ? '카풀 요청' : '운행 정보'}
          </div>
          <div className="text-base font-black mb-1.5" style={{ letterSpacing: '-0.02em', color: theme.txt0 }}>
            {formatRoomTitle(room, displayRide)}
          </div>
          <div className="flex gap-2 flex-wrap">
            <InfoPill icon={<Clock size={10} color={theme.txt0} />} value={displayRequest ? `${displayTime} 희망` : `${displayTime} 출발`} />
            <InfoPill icon={<Wallet size={10} color={theme.txt0} />} value={displayRide ? `${displayRide.fare.toLocaleString()}원` : '요금 조율'} />
            <InfoPill icon={<Car size={10} color={theme.txt0} />} value={vehicleLabel} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4">
        {msgs.length === 0 && (
          <ChatStateCard tone={statusTone} title={loadState === 'ready' ? '아직 메시지가 없습니다' : statusTitle} body={loadState === 'ready' ? '첫 메시지는 아래 입력창에서 보낼 수 있습니다.' : statusMessage} />
        )}
        {msgs.map((m, i) => renderMessage(m, i))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 px-3 pt-2 pb-3.5 flex-shrink-0 items-center border-t" style={{ borderColor: theme.border, background: theme.bg1 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          disabled={!canSend}
          placeholder={loadState === 'ready' ? '메시지 입력...' : '채팅방 확인 중...'}
          className="flex-1 h-11 rounded-full px-4 text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background: canSend ? theme.field : theme.disabledSurface,
            border: `1px solid ${canSend ? theme.border : theme.borderBri}`,
            color: canSend ? theme.txt0 : theme.txtDisabled,
            outlineColor: theme.mint,
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!canSend}
          className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 border-none transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background: canSend ? theme.mint : theme.disabledSurface,
            boxShadow: canSend ? theme.shadowMint : 'none',
            cursor: canSend ? 'pointer' : 'not-allowed',
            outlineColor: theme.mint,
          }}
        >
          <Send size={15} color={canSend ? '#FFFFFF' : theme.txtDisabled} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}

function ChatListHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-4 pt-4 pb-3.5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: theme.cardStrong, borderColor: theme.border, outlineColor: theme.mint }}
        aria-label="이전 화면으로 돌아가기"
      >
        <ChevronLeft size={18} color={theme.txt0} />
      </button>
      <div className="relative overflow-hidden rounded-3xl border p-4" style={{ background: theme.routeWash, border: `1px solid ${theme.borderMint}`, boxShadow: theme.shadowCard }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${theme.mint},transparent)` }} />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase" style={{ color: theme.mint, letterSpacing: '0.08em' }}>
            Chat
          </div>
          <div className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
            대화 목록
          </div>
        </div>
        <div className="text-2xl font-black mb-2" style={{ letterSpacing: '-0.04em', color: theme.txt0 }}>
          채팅
        </div>
        <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.55 }}>
          예약 채팅과 카풀 요청 대화를 한곳에서 확인합니다.
        </div>
      </div>
    </div>
  );
}

function ChatRoomCard({ room, onClick }: { room: ChatRoomSummary; onClick: () => void }) {
  const isRequestRoom = Boolean(room.rideRequest);
  const isReportRoom = Boolean(room.report);
  const requester = room.requester;

  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 w-full overflow-hidden rounded-3xl border text-left transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard, outlineColor: theme.mint }}
    >
      <div className="h-1" style={{ background: `linear-gradient(90deg,${isReportRoom ? theme.warm : isRequestRoom ? theme.blue : theme.mint},transparent)` }} />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-base font-black" style={{ color: theme.txt0, letterSpacing: '-0.03em', overflowWrap: 'anywhere' }}>
              {formatRoomTitle(room, room.ride)}
            </div>
            <div className="mt-1 text-xs" style={{ color: theme.txt2 }}>
              {isReportRoom ? '신고자와 운영자가 확인하는 별도 대화' : isRequestRoom ? `${requester?.nickname ?? '요청자'} · ${room.rideRequest?.time ?? '시간 조율'} 희망` : room.ride ? `${formatRideTime(room.ride.departureTime)} 출발` : '대화방'}
            </div>
          </div>
          {requester && <Avatar name={requester.nickname} idx={avatarIndex(requester.id)} size={30} photoDataUrl={requester.photoDataUrl} />}
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-black" style={{ color: isReportRoom ? theme.warm : isRequestRoom ? theme.blue : theme.mint, background: isReportRoom ? theme.warmDim : isRequestRoom ? theme.blueDim : theme.mintDim, border: `1px solid ${isReportRoom ? theme.borderWarm : isRequestRoom ? theme.borderBlue : theme.borderMint}` }}>
            {isReportRoom ? '신고 운영' : isRequestRoom ? '카풀 요청' : '예약 채팅'}
          </span>
        </div>
        {room.rideRequest?.content && (
          <div className="line-clamp-2 rounded-2xl px-3 py-2 text-xs" style={{ background: theme.card, color: theme.txt1, border: `1px solid ${theme.border}`, lineHeight: 1.55 }}>
            {room.rideRequest.content}
          </div>
        )}
        {room.report?.description && (
          <div className="line-clamp-2 rounded-2xl px-3 py-2 text-xs" style={{ background: theme.card, color: theme.txt1, border: `1px solid ${theme.border}`, lineHeight: 1.55 }}>
            {room.report.description}
          </div>
        )}
      </div>
    </button>
  );
}

function renderMessage(m: ChatMessage, index: number) {
  if (m.type === 'system') {
    return (
      <div key={m.id ?? index} className="text-center mb-2.5">
        <span className="text-xs px-3 py-1.5 rounded-full inline-block" style={{ color: theme.txt2, background: theme.card, border: `1px solid ${theme.border}` }}>
          {m.text}
        </span>
      </div>
    );
  }

  if (isTransferInstructionMessage(m.text)) {
    return <TransferInstructionCard key={m.id ?? index} text={formatTransferInstructionText(m.text)} />;
  }

  if (m.type === 'sysinfo') {
    return <SystemInfoCard key={m.id ?? index} text={m.text} />;
  }

  if (m.type === 'other') {
    return (
      <div key={m.id ?? index} className="flex gap-2 mb-3 max-w-[84%]">
        <Avatar name={m.name} idx={m.idx} size={26} photoDataUrl={m.photoDataUrl} />
        <div>
          <div className="text-xs mb-0.75" style={{ color: theme.txt2 }}>{m.name}</div>
          <div className="text-sm p-3.5 rounded-2xl" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, color: theme.txt0, lineHeight: 1.65, borderRadius: `${theme.r8} ${theme.r16} ${theme.r16} ${theme.r16}` }}>
            {m.text}
          </div>
        </div>
      </div>
    );
  }

  if (m.type === 'me') {
    return (
      <div key={m.id ?? index} className="flex justify-end mb-3">
        <div className="text-sm p-3.5 rounded-2xl max-w-[78%] font-bold" style={{ background: theme.mint, color: '#FFFFFF', lineHeight: 1.65, borderRadius: `${theme.r16} ${theme.r8} ${theme.r16} ${theme.r16}` }}>
          {m.text}
        </div>
      </div>
    );
  }

  return null;
}

function SystemInfoCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl p-3.5 mb-3 border" style={{ background: theme.blueDim, border: `1px solid ${theme.borderBlue}` }}>
      <div className="text-xs font-bold mb-1.25 uppercase" style={{ color: theme.blue, letterSpacing: '0.04em' }}>운행 안내</div>
      <div className="text-xs leading-relaxed" style={{ color: theme.txt1, whiteSpace: 'pre-line' }}>{text}</div>
    </div>
  );
}

function TransferInstructionCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl p-3.5 mb-3 border" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase" style={{ color: theme.mint, letterSpacing: '0.04em' }}>차주 송금 안내</div>
        <span className="rounded-full px-2 py-1 text-xs font-black" style={{ color: '#FFFFFF', background: theme.mint }}>안내</span>
      </div>
      <div className="mb-2 rounded-2xl px-3 py-2 text-xs font-bold" style={{ color: theme.mint, background: theme.card, border: `1px solid ${theme.border}` }}>
        KAPOOL 밖에서 직접 확인하는 안내문입니다.
      </div>
      <div className="text-xs leading-relaxed" style={{ color: theme.txt1, whiteSpace: 'pre-line' }}>{text}</div>
    </div>
  );
}

function InfoPill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.txt1, background: theme.card, border: `1px solid ${theme.border}` }}>
      {icon}
      <strong style={{ color: theme.mint }}>{value}</strong>
    </div>
  );
}

function ConnectionBadge({ tone, label }: { tone: 'mint' | 'blue' | 'warm'; label: string }) {
  const styles = toneStyle(tone);

  return (
    <span className="hidden flex-shrink-0 rounded-full px-2 py-1 text-xs font-black sm:inline-flex" style={{ color: styles.color, background: styles.background, border: `1px solid ${styles.border}` }}>
      {label}
    </span>
  );
}

function ChatStateCard({ tone, title, body }: { tone: 'mint' | 'blue' | 'warm'; title: string; body: string }) {
  const styles = toneStyle(tone);

  return (
    <div className="rounded-3xl p-4 text-center border" style={{ background: theme.cardStrong, border: `1px solid ${styles.border}` }}>
      <div className="text-sm font-black mb-1" style={{ color: styles.color }}>{title}</div>
      <div className="text-xs" style={{ color: theme.txt2, lineHeight: 1.65 }}>{body}</div>
    </div>
  );
}

function toneStyle(tone: 'mint' | 'blue' | 'warm') {
  if (tone === 'mint') return { color: theme.mint, background: theme.mintDim, border: theme.borderMint };
  if (tone === 'warm') return { color: theme.warm, background: theme.warmDim, border: theme.borderWarm };
  return { color: theme.blue, background: theme.blueDim, border: theme.borderBlue };
}

function formatRoomTitle(room: ChatRoomSummary | null, ride?: ChatRoomSummary['ride'] | Ride | null) {
  if (room?.report) {
    return '신고 운영 대화';
  }

  if (room?.rideRequest) {
    return `${room.rideRequest.from} → ${room.rideRequest.to}`;
  }

  if (ride) {
    return `${ride.from} → ${ride.to}`;
  }

  return '채팅방';
}

function avatarIndex(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
}

function isTransferInstructionMessage(text: string) {
  return text.trim().startsWith('차주 송금 안내');
}

function formatTransferInstructionText(text: string) {
  return text.trim().replace(/^차주 송금 안내\s*/, '');
}

function formatRideTime(departureTime: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(new Date(departureTime));
}
