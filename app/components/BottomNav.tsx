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
    { id: 'search', icon: Search, label: '탐색' },
    { id: 'register', icon: Plus, label: '등록' },
    { id: 'chat', icon: MessageCircle, label: '채팅' },
    { id: 'profile', icon: User, label: '마이' },
  ];

  return (
    <div
      className="h-16 flex items-center justify-around px-2 pb-1.5 flex-shrink-0 z-50 border-t"
      style={{
        background: 'rgba(11,17,32,0.92)',
        backdropFilter: 'blur(24px)',
        borderColor: theme.border,
      }}
    >
      {items.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        const isPlus = id === 'register';

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-0.75 px-2.5 py-1.5 rounded-xl border-none bg-none cursor-pointer transition-all"
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: isPlus ? 44 : 36,
                height: isPlus ? 44 : 36,
                borderRadius: isPlus ? '50%' : theme.r8,
                background: isPlus ? theme.mint : isActive ? theme.mintDim : 'transparent',
                border: isActive && !isPlus ? `1px solid rgba(0,229,184,0.3)` : '1px solid transparent',
                boxShadow: isPlus ? `0 8px 24px ${theme.mintGlow}` : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Icon
                size={isPlus ? 20 : 17}
                color={isPlus ? '#05091A' : isActive ? theme.mint : theme.txt2}
                strokeWidth={isPlus ? 2.5 : 2}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{
                color: isActive ? theme.mint : theme.txt2,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
