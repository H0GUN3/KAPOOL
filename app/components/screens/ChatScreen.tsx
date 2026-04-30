'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send, Clock, CreditCard, Car } from 'lucide-react';
import { theme, MSGS_INIT, PRESETS } from '../../lib/theme';
import { Avatar } from '../Avatar';

interface ChatScreenProps {
  onBack: () => void;
}

export function ChatScreen({ onBack }: ChatScreenProps) {
  const [msgs, setMsgs] = useState(MSGS_INIT);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs((prev) => [...prev, { type: 'me' as const, text: text.trim() }]);
    setInput('');
  };

  return (
    <>
      {/* Chat Header */}
      <div
        className="px-4 pt-4 pb-3 flex-shrink-0 border-b"
        style={{
          background: theme.bg1,
          borderColor: theme.border,
        }}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <button
            onClick={onBack}
            className="flex items-center cursor-pointer border-none bg-none"
          >
            <ChevronLeft size={20} color={theme.txt0} />
          </button>
          <div>
          <div
            className="text-base font-black"
            style={{ letterSpacing: '-0.02em' }}
          >
            <span style={{ color: theme.txt0 }}>전주</span> <span style={{ color: theme.txt0 }}>→</span> <span style={{ color: theme.txt0 }}>군산대</span>
          </div>
            <div className="text-xs" style={{ color: theme.txt2 }}>
              4/29 08:30 출발 · 멤버 3명
            </div>
          </div>
        </div>

        {/* Pinned Card */}
        <div
          className="rounded-2xl p-2.5"
          style={{
            background: `linear-gradient(135deg,rgba(91,126,255,0.12),rgba(0,229,184,0.08))`,
            border: `1px solid rgba(91,126,255,0.25)`,
          }}
        >
          <div
            className="text-xs font-bold mb-1.5 uppercase flex items-center gap-1.25"
            style={{
              color: theme.blue,
              letterSpacing: '0.08em',
            }}
          >
            <div className="w-3 h-0.5 rounded" style={{ background: theme.blue }} />
            운행 정보
          </div>
          <div
            className="text-base font-black mb-1.5"
            style={{ letterSpacing: '-0.02em', color: theme.txt0 }}
          >
            전주 → 군산대
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { icon: <Clock size={10} color={theme.txt0} />, val: '08:30 출발' },
              {
                icon: <CreditCard size={10} color={theme.txt0} />,
                val: '5,000원',
              },
              { icon: <Car size={10} color={theme.txt0} />, val: '흰색 아반떼' },
            ].map(({ icon, val }, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-xs"
                style={{ color: theme.txt1 }}
              >
                {icon}
                <strong style={{ color: theme.mint }}>{val}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
        {msgs.map((m, i) => {
          if (m.type === 'system') {
            return (
              <div key={i} className="text-center mb-2.5">
                <span
                  className="text-xs px-3 py-1 rounded-full inline-block"
                  style={{
                    color: theme.txt2,
                    background: theme.card,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {(m as any).text}
                </span>
              </div>
            );
          }

          if (m.type === 'sysinfo') {
            return (
              <div
                key={i}
                className="rounded-2xl p-3 mb-2.5"
                style={{
                  background: 'rgba(91,126,255,0.1)',
                  border: `1px solid rgba(91,126,255,0.25)`,
                }}
              >
                <div
                  className="text-xs font-bold mb-1.25 uppercase"
                  style={{
                    color: theme.blue,
                    letterSpacing: '0.04em',
                  }}
                >
                  🚗 차량 및 송금 안내
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: theme.txt1, whiteSpace: 'pre-line' }}
                >
                  {(m as any).text}
                </div>
              </div>
            );
          }

          if (m.type === 'other') {
            return (
              <div key={i} className="flex gap-1.75 mb-2.5 max-w-[82%]">
                <Avatar name={(m as any).name} idx={(m as any).idx} size={26} />
                <div>
                  <div className="text-xs mb-0.75" style={{ color: theme.txt2 }}>
                    {(m as any).name}
                  </div>
                  <div
                    className="text-xs p-3 rounded-2xl"
                    style={{
                      background: theme.card,
                      border: `1px solid ${theme.border}`,
                      color: theme.txt0,
                      lineHeight: 1.6,
                      borderRadius: '4px 14px 14px 14px',
                    }}
                  >
                    {(m as any).text}
                  </div>
                </div>
              </div>
            );
          }

          if (m.type === 'me') {
            return (
              <div key={i} className="flex justify-end mb-2.5">
                <div
                  className="text-xs p-3 rounded-2xl max-w-[75%] font-medium"
                  style={{
                    background: theme.mint,
                    color: theme.bg0,
                    lineHeight: 1.6,
                    borderRadius: '14px 4px 14px 14px',
                  }}
                >
                  {(m as any).text}
                </div>
              </div>
            );
          }

          return null;
        })}
        <div ref={endRef} />
      </div>

      {/* Presets */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-all whitespace-nowrap"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              color: theme.txt1,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        className="flex gap-2 px-3 pb-3.5 flex-shrink-0 items-center border-t"
        style={{ borderColor: theme.border }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="메시지 입력..."
          className="flex-1 h-9 rounded-full px-4 text-xs outline-none transition-all"
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            color: theme.txt0,
          }}
        />
        <button
          onClick={() => send(input)}
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 border-none"
          style={{
            background: theme.mint,
            boxShadow: `0 4px 14px ${theme.mintGlow}`,
          }}
        >
          <Send size={15} color={theme.bg0} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}
