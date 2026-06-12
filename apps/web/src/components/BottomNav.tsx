'use client';

import {
  Home,
  Search,
  Plus,
  MessageCircle,
  User,
} from 'lucide-react';
import { theme } from '../lib/theme';

interface BottomNavProps {
  active: string;
  onChange: (tab: string) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  const items = [
    { id: 'home', icon: Home, label: '홈' },
    { id: 'search', icon: Search, label: '검색' },
    { id: 'register', icon: Plus, label: '등록' },
    { id: 'chat', icon: MessageCircle, label: '채팅' },
    { id: 'profile', icon: User, label: '마이' },
  ];

  return (
    <nav
      aria-label="하단 주요 내비게이션"
      data-bottom-nav="true"
      className="kapool-fixed-frame fixed bottom-0 z-50 grid min-h-20 grid-cols-5 items-start gap-1 overflow-hidden px-2 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      style={{
        background: theme.cardHov,
        backdropFilter: 'blur(24px)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
        style={{
          background: `linear-gradient(90deg,transparent,${theme.borderBri},${theme.borderMint},${theme.borderBri},transparent)`,
          boxShadow: `0 -8px 18px ${theme.mintGlow}, 0 1px 10px rgba(28,24,18,0.10)`,
        }}
      />
      {items.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        const isPlus = id === 'register';

        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(id)}
            className="flex min-w-0 w-full flex-col items-center gap-0.75 px-1 py-1 rounded-xl border-none bg-none cursor-pointer transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: theme.mint }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: isPlus ? 44 : 36,
                height: isPlus ? 44 : 36,
                borderRadius: isPlus ? '50%' : theme.r8,
                background: isPlus ? theme.mint : isActive ? theme.mintDim : 'transparent',
                border: isActive && !isPlus ? `1px solid ${theme.borderMint}` : '1px solid transparent',
                boxShadow: isPlus ? `0 8px 24px ${theme.mintGlow}` : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Icon
                size={isPlus ? 20 : 17}
                color={isPlus ? '#FFFFFF' : isActive ? theme.mint : theme.txt2}
                strokeWidth={isPlus ? 2.5 : 2}
              />
            </div>
            <span
              className="max-w-full truncate text-xs font-medium"
              style={{
                color: isActive ? theme.mint : theme.txt2,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
