'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  Clock,
  CreditCard,
  User,
  Car,
  CheckCircle,
  MessageCircle,
} from 'lucide-react';
import { theme, RIDES } from '../../lib/theme';
import { Badge } from '../Badge';
import { Avatar } from '../Avatar';
import { MapPreview } from '../MapPreview';

type Ride = (typeof RIDES)[0];

interface DetailScreenProps {
  ride: Ride | null;
  onBack: () => void;
  onChat: () => void;
}

export function DetailScreen({ ride, onBack, onChat }: DetailScreenProps) {
  const [reserved, setReserved] = useState(false);

  if (!ride) return null;

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero */}
        <div className="px-5 pt-4 pb-3.5">
          <button
            onClick={onBack}
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center mb-3.5 border cursor-pointer transition-all"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
            }}
          >
            <ChevronLeft size={16} color={theme.txt1} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <Badge status={ride.status as 'open' | 'full' | 'closed'} />
            <span className="text-xs" style={{ color: theme.txt2 }}>
              잔여 {ride.seats}석
            </span>
          </div>

          <div
            className="text-2xl font-black mb-1 leading-tight"
            style={{ letterSpacing: '-0.04em' }}
          >
            <span style={{ color: theme.txt0 }}>{ride.from}</span> <span style={{ color: theme.txt0 }}>→</span> <span style={{ color: theme.txt0 }}>{ride.to}</span>
          </div>
          <div className="text-xs" style={{ color: theme.txt2 }}>
            2025년 4월 29일 · {ride.time} 출발
          </div>
        </div>

        <MapPreview />

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2.5 px-4 pb-3.5">
          {[
            {
              label: '출발 시간',
              icon: <Clock size={10} color={theme.txt2} />,
              val: ride.time,
              sub: '오늘 출발',
              valColor: theme.txt0,
            },
            {
              label: '카풀 금액',
              icon: <CreditCard size={10} color={theme.txt2} />,
              val: (
                <span style={{ color: theme.mint }}>
                  {ride.fare.toLocaleString()}
                </span>
              ),
              sub: '권역 고정',
            },
          ].map(({ label, icon, val, sub, valColor }) => (
            <div
              key={label}
              className="rounded-2xl p-3.5"
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div
                className="flex items-center gap-1 text-xs mb-1.25"
                style={{ color: theme.txt2 }}
              >
                {icon}
                {label}
              </div>
              <div
                className="text-lg font-black"
                style={{ letterSpacing: '-0.02em', color: valColor }}
              >
                {val}
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.txt2 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Seats */}
        <div className="px-4 pb-3.5 flex items-center gap-2.5">
          <span className="text-xs" style={{ color: theme.txt2 }}>
            탑승 현황
          </span>
          <div className="flex gap-1.25">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-lg flex items-center justify-center border"
                style={{
                  background:
                    i < 3 - ride.seats ? theme.mintDim : 'transparent',
                  borderColor:
                    i < 3 - ride.seats
                      ? 'rgba(0,229,184,0.4)'
                      : theme.border,
                  borderStyle: i < 3 - ride.seats ? 'solid' : 'dashed',
                }}
              >
                {i < 3 - ride.seats && <User size={10} color={theme.mint} />}
              </div>
            ))}
          </div>
          <span className="text-xs" style={{ color: theme.txt2 }}>
            {3 - ride.seats}/3 확정
          </span>
        </div>

        {/* Vehicle */}
        <div
          className="mx-4 mb-3 p-3.5 rounded-2xl flex gap-2.5 items-center border"
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div
            className="w-10.5 h-10.5 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: theme.blueDim,
            }}
          >
            <Car size={20} color={theme.blue} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold mb-0.75" style={{ color: theme.txt0 }}>흰색 아반떼</div>
            <div className="text-xs" style={{ color: theme.txt2 }}>
              승인 후 차량번호 공개
            </div>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: theme.warmDim,
              color: theme.warm,
              border: `1px solid rgba(255,143,94,0.25)`,
            }}
          >
            4인승
          </span>
        </div>

        {/* Driver */}
        <div
          className="mx-4 mb-4 p-3.5 rounded-2xl flex items-center gap-2.5 border"
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
          }}
        >
          <Avatar name={ride.driver} idx={ride.avIdx} size={38} />
          <div className="flex-1">
            <div className="text-sm font-bold mb-0.5" style={{ color: theme.txt0 }}>{ride.driver}</div>
            <div className="text-xs" style={{ color: theme.txt2 }}>
              컴퓨터공학과
              {ride.waypoints?.length > 0 && ` · ${ride.waypoints.join(', ')} 경유`}
            </div>
          </div>
          <div className="text-xs cursor-pointer" style={{ color: theme.mint, fontWeight: 500 }}>
            차주 ›
          </div>
        </div>

        {/* Buttons */}
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {reserved ? (
            <div
              className="h-12 rounded-2xl flex items-center justify-center gap-2 font-bold"
              style={{
                background: `linear-gradient(135deg,rgba(0,229,184,0.15),rgba(0,229,184,0.08))`,
                border: `1px solid rgba(0,229,184,0.3)`,
                color: theme.mint,
              }}
            >
              <CheckCircle size={18} color={theme.mint} />
              예약 요청 완료!
            </div>
          ) : (
            <button
              onClick={() => setReserved(true)}
              className="w-full h-12 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              style={{
                background: `linear-gradient(135deg,${theme.mint},#00C5A0)`,
                color: theme.bg0,
                boxShadow: `0 10px 32px ${theme.mintGlow}`,
              }}
            >
              <CheckCircle size={18} strokeWidth={2.5} />
              탑승 예약 신청
            </button>
          )}
          <button
            onClick={onChat}
            className="w-full h-12 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border"
            style={{
              background: 'transparent',
              color: theme.txt1,
              border: `1px solid ${theme.border}`,
            }}
          >
            <MessageCircle size={16} />
            채팅방 입장
          </button>
        </div>
      </div>
    </>
  );
}
