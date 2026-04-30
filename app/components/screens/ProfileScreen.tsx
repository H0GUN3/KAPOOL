'use client';

import {
  Car,
  Calendar,
  MessageCircle,
  Shield,
  CreditCard,
  Star,
  ChevronRight,
} from 'lucide-react';
import { theme } from '../../lib/theme';

interface ProfileScreenProps {
  onLogout?: () => void;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const menuItems = [
    { icon: <Car size={16} color={theme.blue} />, label: '내 등록 운행', count: 3 },
    { icon: <Calendar size={16} color={theme.mint} />, label: '내 예약 내역', count: 7 },
    { icon: <MessageCircle size={16} color={theme.warm} />, label: '내 요청글', count: 2 },
    {
      icon: <Shield size={16} color={theme.rose} />,
      label: '차량 정보 수정',
      count: null,
    },
    {
      icon: <CreditCard size={16} color={theme.txt2} />,
      label: '계좌 정보 수정',
      count: null,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Profile Hero */}
      <div className="px-5 pt-5 mb-5">
        <div
          className="rounded-2xl p-5 pb-4 relative overflow-hidden border"
          style={{
            background: `linear-gradient(135deg,rgba(91,126,255,0.12),rgba(0,229,184,0.08))`,
            border: `1px solid rgba(91,126,255,0.2)`,
          }}
        >
          {/* BG Orb */}
          <div
            className="absolute -top-7.5 -right-7.5 rounded-full"
            style={{
              width: 120,
              height: 120,
              background: 'radial-gradient(circle,rgba(0,229,184,0.1) 0%,transparent 70%)',
            }}
          />

          <div className="flex items-center gap-3.5">
            <div
              className="w-15 h-15 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg,${theme.blue},${theme.mint})`,
                boxShadow: `0 8px 24px ${theme.mintGlow}`,
              }}
            >
              김
            </div>
            <div>
              <div
                className="text-lg font-black mb-0.5"
                style={{ letterSpacing: '-0.02em', color: theme.txt0 }}
              >
                김민준
              </div>
              <div className="text-xs" style={{ color: theme.txt2 }}>
                컴퓨터공학과 · 전주 권역
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <span
                  className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full gap-0.75"
                  style={{
                    background: theme.mintDim,
                    color: theme.mint,
                    border: `1px solid rgba(0,229,184,0.25)`,
                  }}
                >
                  <Star size={9} color={theme.mint} />
                  차주 14회
                </span>
              </div>
            </div>
          </div>

          {/* Stats removed as requested */}
        </div>
      </div>

      {/* Edit Info Card (styled like menu items) */}
      <div className="px-4 pb-2">
        <div
          className="rounded-xl p-3.25 flex items-center gap-3 border"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: theme.bg2 }}
          >
            <Shield size={16} color={theme.txt1} />
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: theme.txt0 }}>
              내 정보수정
            </div>
            <div className="text-xs mt-0.5" style={{ color: theme.txt2 }}>
              이름: <span style={{ color: theme.txt0, fontWeight: 700 }}>김민준</span>
              {'  '}·{'  '}
              학과: <span style={{ color: theme.txt0, fontWeight: 700 }}>컴퓨터공학과</span>
            </div>
          </div>

          <ChevronRight size={15} color={theme.txt2} />
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 pb-6 flex flex-col gap-2">
        {menuItems.map(({ icon, label, count }) => (
          <div
            key={label}
            className="rounded-xl p-3.25 flex items-center gap-3 border cursor-pointer transition-all"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
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
            <ChevronRight size={15} color={theme.txt2} />
          </div>
        ))}

        {/* Logout item */}
        <div
          className="rounded-xl p-3.25 flex items-center gap-3 border cursor-pointer transition-all"
          onClick={() => onLogout && onLogout()}
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: theme.bg2 }}
          >
            <MessageCircle size={16} color={theme.txt2} />
          </div>
          <span className="flex-1 text-sm font-semibold" style={{ color: theme.txt0 }}>로그아웃</span>
          <ChevronRight size={15} color={theme.txt2} />
        </div>
      </div>
    </div>
  );
}
