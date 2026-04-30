'use client';

import { useState } from 'react';
import { CheckCircle, MapPin, Navigation } from 'lucide-react';
import { theme, FARE_OPTS } from '../../lib/theme';

interface RegisterScreenProps {
  onSuccess?: () => void;
}

export function RegisterScreen({ onSuccess }: RegisterScreenProps) {
  const [region, setRegion] = useState('전주');
  const [seats, setSeats] = useState(3);
  const [submitted, setSubmitted] = useState(false);

  const fare = FARE_OPTS.find((o) => o.key === region)?.price;

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
        <div
          className="w-18 h-18 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg,${theme.mint},${theme.blue})`,
            boxShadow: `0 16px 40px ${theme.mintGlow}`,
          }}
        >
          <CheckCircle size={36} color="#fff" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <div
            className="text-2xl font-black mb-2"
            style={{ letterSpacing: '-0.03em', color: theme.txt0 }}
          >
            등록 완료!
          </div>
          <div className="text-sm" style={{ color: theme.txt2, lineHeight: 1.7 }}>
            운행이 성공적으로 등록되었습니다.<br />
            승객의 예약을 기다려주세요.
          </div>
        </div>
        <button
          onClick={() => setSubmitted(false)}
          className="w-50 h-12 rounded-2xl text-base font-bold flex items-center justify-center cursor-pointer transition-all"
          style={{
            background: `linear-gradient(135deg,${theme.mint},#00C5A0)`,
            color: theme.bg0,
            boxShadow: `0 10px 32px ${theme.mintGlow}`,
          }}
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="px-5 pt-4 pb-3.5 flex-shrink-0">
        <div
          className="text-2xl font-black mb-1"
          style={{ letterSpacing: '-0.035em', color: theme.txt0 }}
        >
          운행 등록
        </div>
        <div className="text-xs" style={{ color: theme.txt2 }}>
          차주로 새 운행을 등록합니다
        </div>
      </div>

      {/* Route */}
      <SectionTitle>출발 · 도착 지역</SectionTitle>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3.5">
        <FieldBox label="출발 지역" value="전주 권역" active />
        <FieldBox label="도착 지역" value="군산대학교" />
      </div>

      {/* Map Select */}
      <SectionTitle>출발지 선택</SectionTitle>
      <div
        className="mx-4 mb-3.5 rounded-2xl h-25 border relative overflow-hidden flex flex-col items-center justify-center gap-1.25 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg,#0C1E35,#091825)',
          border: `1px solid ${theme.border}`,
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="rg"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rg)" />
        </svg>

        <div
          className="w-9.5 h-9.5 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
          style={{
            background: 'rgba(0,229,184,0.15)',
            border: `1.5px solid rgba(0,229,184,0.4)`,
          }}
        >
          <MapPin size={16} color={theme.mint} />
        </div>
        <span className="text-xs font-medium relative z-10" style={{ color: theme.mint }}>
          지도에서 출발지 선택
        </span>
      </div>

      {/* Time & Capacity */}
      <SectionTitle>시간 · 차량 정보</SectionTitle>
      <div className="grid grid-cols-2 gap-2 px-4 pb-2.5">
        <FieldBox label="출발 시간" value="오전 8:30" />
        <div
          className="rounded-xl p-3 border"
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div
            className="text-xs uppercase mb-1.25"
            style={{ color: theme.txt2, letterSpacing: '0.06em' }}
          >
            탑승 인원
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              className="border-none bg-none text-lg font-black cursor-pointer"
              style={{ color: theme.txt2 }}
            >
              −
            </button>
            <span className="text-base font-black" style={{ color: theme.txt0 }}>{seats}</span>
            <button
              onClick={() => setSeats((s) => Math.min(6, s + 1))}
              className="border-none bg-none text-lg font-black cursor-pointer"
              style={{ color: theme.mint }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-2.5">
        <FieldBox label="차량 종류" value="아반떼" />
        <FieldBox label="차량 색상" value="흰색" />
      </div>

      <div className="px-4 pb-3.5">
        <FieldBox label="차량번호 뒷자리" value="1234" />
      </div>

      {/* Fare Region */}
      <SectionTitle>카풀 금액 권역</SectionTitle>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        {FARE_OPTS.map((o) => (
          <button
            key={o.key}
            onClick={() => setRegion(o.key)}
            className="rounded-xl p-3 text-left cursor-pointer border transition-all"
            style={{
              background: region === o.key ? theme.mintDim : theme.card,
              border: `1px solid ${
                region === o.key ? 'rgba(0,229,184,0.4)' : theme.border
              }`,
            }}
          >
            <div className="text-xs font-semibold mb-0.75" style={{ color: theme.txt0 }}>
              {o.label}
            </div>
            <div
              className="text-sm font-black"
              style={{
                color: region === o.key ? theme.mint : theme.txt2,
              }}
            >
              {o.price ? `${o.price.toLocaleString()}원` : '직접 입력'}
            </div>
          </button>
        ))}
      </div>

      {/* Fare Display */}
      {fare && (
        <div
          className="mx-4 mb-3.5 rounded-2xl p-3.5 flex justify-between items-center border"
          style={{
            background: `linear-gradient(135deg,rgba(0,229,184,0.10),rgba(91,126,255,0.07))`,
            border: `1px solid rgba(0,229,184,0.22)`,
          }}
        >
          <div>
            <div className="text-xs mb-1" style={{ color: theme.txt2 }}>
              확정 금액
            </div>
            <div
              className="text-3xl font-black"
              style={{
                color: theme.mint,
                letterSpacing: '-0.04em',
              }}
            >
              {fare.toLocaleString()}
              <span className="text-sm font-normal" style={{ color: theme.txt1 }}>
                원
              </span>
            </div>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{
              background: 'rgba(0,229,184,0.12)',
              border: `1px solid rgba(0,229,184,0.3)`,
              color: theme.mint,
            }}
          >
            {region} 고정
          </span>
        </div>
      )}

      {/* Account */}
      <SectionTitle>계좌 정보</SectionTitle>
      <div className="px-4 pb-2.5 flex flex-col gap-2">
        <FieldBox label="은행명" value="카카오뱅크" />
        <FieldBox label="계좌번호" value="3333-xx-xxxxxxx" />
      </div>

      {/* Extra Note */}
      <SectionTitle>추가 안내 (선택)</SectionTitle>
      <div
        className="mx-4 mb-4 rounded-xl p-3 border"
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
        }}
      >
        <textarea
          placeholder="승객에게 전달할 추가 안내사항을 입력해주세요."
          className="w-full min-h-14 bg-transparent border-none resize-none text-xs outline-none"
          style={{
            color: theme.txt0,
            lineHeight: 1.6,
          }}
          defaultValue=""
        />
      </div>

      {/* Submit */}
      <div className="px-4 pb-7">
        <button
          onClick={() => setSubmitted(true)}
          className="w-full h-12 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
          style={{
            background: `linear-gradient(135deg,${theme.blue},${theme.mint})`,
            color: theme.bg0,
            boxShadow: `0 10px 32px rgba(91,126,255,0.35)`,
          }}
        >
          <Navigation size={16} strokeWidth={2.5} />
          운행 등록하기
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      className="px-5 pb-2 uppercase text-xs font-bold flex items-center gap-2"
      style={{
        color: theme.txt2,
        letterSpacing: '0.08em',
      }}
    >
      {children}
      <div className="flex-1 h-px" style={{ background: theme.border }} />
    </div>
  );
}

function FieldBox({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3 border cursor-pointer transition-all"
      style={{
        background: active ? theme.mintDim : theme.card,
        border: `1px solid ${
          active ? 'rgba(0,229,184,0.35)' : theme.border
        }`,
      }}
    >
      <div
        className="text-xs uppercase mb-1"
        style={{
          color: theme.txt2,
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div className="text-sm font-bold" style={{ letterSpacing: '-0.01em', color: theme.txt0 }}>
        {value}
      </div>
    </div>
  );
}
