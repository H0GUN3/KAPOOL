'use client';

import { useState } from 'react';
import { Car, Zap } from 'lucide-react';
import { theme } from '../../lib/theme';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  return (
    <div
      className="h-full flex flex-col px-7 pt-16 pb-9 relative overflow-hidden"
    >
      {/* BG Orb */}
      <div
        className="absolute top-[-80px] left-[-60px] rounded-full pointer-events-none"
        style={{
          width: 280,
          height: 280,
          background: 'radial-gradient(circle,rgba(0,229,184,0.10) 0%,transparent 70%)',
        }}
      />

      {/* Logo */}
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center mb-7"
        style={{
          background: `linear-gradient(135deg,${theme.blue},${theme.mint})`,
          boxShadow: `0 10px 30px ${theme.mintGlow}`,
        }}
      >
        <Car size={26} color="#fff" strokeWidth={2} />
      </div>

      <div
        className="text-2xl font-black mb-2"
        style={{ letterSpacing: '-0.035em', lineHeight: 1.2, color: theme.txt0 }}
      >
        함께 타는<br />
        <span style={{ color: theme.mint }}>군산대 카풀</span>
      </div>
      <p className="text-xs mb-9" style={{ color: theme.txt2, lineHeight: 1.7 }}>
        군산대학교 카풀 서비스에 오신 것을 환영합니다.
      </p>

      {/* Inputs */}
      {[
        { label: '이메일', type: 'email', val: email, set: setEmail, ph: 'university@email.com' },
        { label: '비밀번호', type: 'password', val: pw, set: setPw, ph: '••••••••' },
      ].map(({ label, type, val, set, ph }) => (
        <div key={label} className="mb-2.5">
          <div
            className="text-xs font-semibold mb-1.5 uppercase"
            style={{ color: theme.txt2, letterSpacing: '0.06em' }}
          >
            {label}
          </div>
          <input
            type={type}
            value={val}
            onChange={(e) => set(e.target.value)}
            placeholder={ph}
            className="w-full h-12 px-4 rounded-xl text-sm outline-none transition-all"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              color: theme.txt0,
              fontFamily: 'inherit',
            }}
          />
        </div>
      ))}

      <button
        onClick={onLogin}
        className="w-full h-12 mt-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
        style={{
          background: `linear-gradient(135deg,${theme.mint},#00C5A0)`,
          color: theme.bg0,
          boxShadow: `0 10px 32px ${theme.mintGlow}`,
        }}
      >
        <Zap size={16} strokeWidth={2.5} />
        로그인
      </button>

      <div className="flex items-center gap-2 my-4 text-xs" style={{ color: theme.txt2 }}>
        <div className="flex-1 h-px" style={{ background: theme.border }} />
        <span
          className="shrink-0 relative z-10"
          style={{ background: theme.bg0, padding: '0 12px', lineHeight: 1 }}
        >
          또는
        </span>
        <div className="flex-1 h-px" style={{ background: theme.border }} />
      </div>

      <button
        className="w-full h-12 rounded-2xl text-sm font-medium cursor-pointer transition-all"
        style={{
          background: 'transparent',
          border: `1px solid ${theme.border}`,
          color: theme.txt1,
        }}
      >
        이메일로 회원가입
      </button>

      <p className="text-center text-xs mt-4.5 cursor-pointer" style={{ color: theme.txt2 }}>
        비밀번호를 잊으셨나요?
      </p>
    </div>
  );
}
