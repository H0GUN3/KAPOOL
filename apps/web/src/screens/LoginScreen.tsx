import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import type { SignupRequestDto } from '@kapool/shared';
import { theme } from '../lib/theme';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (credentials: SignupRequestDto) => Promise<void>;
}

type AuthMode = 'login' | 'signup';
type SignupRole = SignupRequestDto['role'];

const signupRoleOptions: { label: string; role: SignupRole; detail: string }[] = [
  { label: '승객', role: 'passenger', detail: '카풀 검색과 탑승 예약' },
  { label: '차주', role: 'driver', detail: '등하교 운행 등록' },
];

const initialSignupForm: SignupRequestDto = {
  email: '',
  password: '',
  role: 'passenger',
  name: '',
  nickname: '',
  schoolEmail: '',
  department: '',
  homeRegion: '',
};

const demoPassword = 'kapool-local-demo';

const loginPresets = [
  { label: '승객', role: 'passenger', email: 'passenger@kapool.local', password: demoPassword },
  { label: '차주', role: 'driver', email: 'driver@kapool.local', password: demoPassword },
  { label: '관리자', role: 'admin', email: 'admin@kapool.local', password: demoPassword },
] as const;

const showLoginPresets = true;

const loginContrast = {
  surface: 'rgba(255,249,239,0.78)',
  surfaceStrong: 'rgba(255,249,239,0.96)',
  field: 'rgba(255,249,239,0.94)',
  border: 'rgba(17,24,39,0.12)',
  borderStrong: 'rgba(17,24,39,0.18)',
  secondaryText: 'rgba(23,19,14,0.66)',
  placeholderText: 'rgba(23,19,14,0.44)',
};

const loginBrand = {
  dim: 'rgba(52,95,83,0.12)',
  border: 'rgba(52,95,83,0.30)',
  glow: 'rgba(52,95,83,0.22)',
  cta: 'linear-gradient(135deg,#345F53,#345F53)',
};

export function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState<string>('');
  const [pw, setPw] = useState<string>('');
  const [signupForm, setSignupForm] = useState<SignupRequestDto>(initialSignupForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignupMode = mode === 'signup';

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
  };

  const applyLoginPreset = (preset: (typeof loginPresets)[number]) => {
    setEmail(preset.email);
    setPw(preset.password);
    setError('');
  };

  const updateSignupField = <Key extends keyof SignupRequestDto>(field: Key, value: SignupRequestDto[Key]) => {
    setSignupForm((current) => ({ ...current, [field]: value }));
  };

  const handleLoginSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onLogin(email, pw);
    } catch {
      setError('로그인 정보가 올바르지 않습니다. 계정과 비밀번호를 확인해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const normalizedEmail = signupForm.email.trim();
    const homeRegion = signupForm.homeRegion?.trim();
    const payload: SignupRequestDto = {
      email: normalizedEmail,
      password: signupForm.password,
      role: signupForm.role,
      name: signupForm.name.trim(),
      nickname: signupForm.nickname.trim(),
      schoolEmail: normalizedEmail,
      department: signupForm.department.trim(),
      ...(homeRegion ? { homeRegion } : {}),
    };

    try {
      await onSignup(payload);
    } catch (signupError) {
      setError(
        signupError instanceof Error && signupError.message === 'account_already_exists'
          ? '이미 등록된 계정 정보입니다. 다른 이메일을 입력해 주세요.'
          : '회원가입 정보를 다시 확인해 주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTextInput = ({
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    autoComplete,
    required = true,
    helperText,
  }: {
    id: string;
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    autoComplete?: string;
    required?: boolean;
    helperText?: string;
  }) => (
    <div className="mb-3 last:mb-0">
      <label
        htmlFor={id}
        className="block pl-1 mb-1.5 text-xs font-bold uppercase"
        style={{ color: loginContrast.secondaryText, letterSpacing: '0.06em' }}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-describedby={helperText ? `${id}-helper` : undefined}
        className="login-contrast-input w-full h-11 px-3.5 rounded-2xl text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          background: loginContrast.field,
          border: `1px solid ${loginContrast.borderStrong}`,
          color: theme.txt0,
          fontFamily: 'inherit',
          outlineColor: theme.brandMint,
        }}
      />
      {helperText && (
        <div id={`${id}-helper`} className="pl-1 mt-1.5 text-xs" style={{ color: theme.txt2, lineHeight: 1.45 }}>
          {helperText}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="flex-1 overflow-y-auto scrollbar-hide px-6 relative overflow-x-hidden"
      style={{ paddingBlock: isSignupMode ? '1.25rem' : 'clamp(0.75rem, 2dvh, 1.25rem)' }}
    >
      <style>{`.login-contrast-input::placeholder{color:${loginContrast.placeholderText};opacity:1;}`}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* BG Orb */}
        <div
          className="absolute left-2 top-2 rounded-full"
          style={{
            width: 220,
            height: 220,
            background: `radial-gradient(circle,${loginBrand.dim} 0%,transparent 70%)`,
          }}
        />
        <div
          className="absolute bottom-2 right-2 rounded-full"
          style={{ width: 210, height: 210, background: `radial-gradient(circle,${theme.blueDim} 0%,transparent 68%)` }}
        />
      </div>

      <div
        className="relative z-10 mx-auto flex w-full max-w-[360px] flex-col"
        style={{
          justifyContent: isSignupMode ? undefined : 'center',
          minHeight: isSignupMode ? undefined : 'calc(100dvh - clamp(4rem, 10dvh, 5.5rem))',
          paddingBlock: isSignupMode ? undefined : 'clamp(0.25rem, 1dvh, 0.75rem)',
        }}
      >
        {/* Logo */}
        <img
          src="/icons/kapool-logo.png"
          alt="KAPOOL"
          className="relative z-10 mb-4 h-20 w-20 object-contain"
        />

        <div
          className="text-3xl font-black mb-2 relative z-10"
          style={{ letterSpacing: '-0.035em', lineHeight: 1.32, color: theme.txt0 }}
        >
          함께 타는<br />
          <span style={{ color: theme.brandMint }}>KAPOOL</span>
        </div>
        <p className="text-sm mb-4 relative z-10" style={{ color: theme.txt1, lineHeight: 1.65 }}>
          학교까지 함께 이동하는 군산대 카풀
        </p>

        <div
          role="tablist"
          aria-label="로그인 또는 회원가입 선택"
          className="relative z-10 grid grid-cols-2 gap-2 rounded-2xl border p-1 mb-6"
          style={{ background: loginContrast.surface, border: `1px solid ${loginContrast.border}` }}
        >
          {[
            { id: 'login', label: '로그인' },
            { id: 'signup', label: '회원가입' },
          ].map((item) => {
            const isSelected = mode === item.id;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleModeChange(item.id as AuthMode)}
                className="h-10 rounded-xl text-sm font-bold transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: isSelected ? loginBrand.dim : 'transparent',
                  color: isSelected ? theme.brandMint : loginContrast.secondaryText,
                  border: `1px solid ${isSelected ? loginBrand.border : 'transparent'}`,
                  outlineColor: theme.brandMint,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {mode === 'login' ? (
          <>
            {showLoginPresets && (
              <div
                className="relative z-10 mb-4 rounded-3xl border p-3"
                style={{ background: loginContrast.surfaceStrong, border: `1px solid ${loginContrast.border}`, boxShadow: theme.shadowCard }}
              >
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase" style={{ color: theme.brandMint, letterSpacing: '0.08em' }}>
                      빠른 로그인
                    </div>
                    <div className="text-xs mt-1" style={{ color: loginContrast.secondaryText }}>
                      역할을 선택해 KAPOOL을 바로 둘러볼 수 있어요.
                    </div>
                  </div>
                </div>

                <div className="kapool-grid-presets gap-2" aria-label="빠른 로그인 역할 선택">
                  {loginPresets.map((preset) => {
                    const isSelected = email === preset.email && pw === preset.password;

                    return (
                      <button
                        key={preset.role}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${preset.label}로 빠른 로그인`}
                        onClick={() => applyLoginPreset(preset)}
                        className="min-h-12 rounded-2xl border px-2 py-2 text-center transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{
                          background: isSelected ? loginBrand.dim : loginContrast.surface,
                          border: `1px solid ${isSelected ? loginBrand.border : loginContrast.border}`,
                          color: isSelected ? theme.brandMint : theme.txt0,
                          outlineColor: theme.brandMint,
                        }}
                      >
                        <span className="block text-sm font-black">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="relative z-10 rounded-3xl border p-3.5" style={{ background: loginContrast.surfaceStrong, border: `1px solid ${loginContrast.border}`, boxShadow: theme.shadowCard }}>
              {renderTextInput({
                id: 'login-email',
                label: '이메일',
                type: 'email',
                value: email,
                onChange: setEmail,
                placeholder: '이메일을 입력하세요',
                autoComplete: 'username',
              })}
              {renderTextInput({
                id: 'login-password',
                label: '비밀번호',
                type: 'password',
                value: pw,
                onChange: setPw,
                placeholder: '비밀번호를 입력하세요',
                autoComplete: 'current-password',
              })}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mt-2 rounded-2xl text-base font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: loginBrand.cta,
                  color: '#FFFFFF',
                  boxShadow: `0 12px 30px ${loginBrand.glow}`,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  outlineColor: theme.brandMint,
                }}
              >
                <LogIn size={16} strokeWidth={2.5} />
                {isSubmitting ? '확인 중' : '로그인'}
              </button>
            </form>
          </>
        ) : (
          <>
            <form onSubmit={handleSignupSubmit} className="relative z-10">
              <div className="kapool-grid-pair gap-2 mb-3" aria-label="가입 역할 선택">
                {signupRoleOptions.map((option) => {
                  const isSelected = signupForm.role === option.role;

                  return (
                    <button
                      key={option.role}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        updateSignupField('role', option.role);
                        setError('');
                      }}
                      className="min-h-16 rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        background: isSelected ? loginBrand.dim : loginContrast.surface,
                        border: `1px solid ${isSelected ? loginBrand.border : loginContrast.border}`,
                        outlineColor: theme.brandMint,
                      }}
                    >
                      <span className="block text-sm font-black" style={{ color: isSelected ? theme.brandMint : theme.txt0 }}>
                        {option.label}
                      </span>
                      <span className="block text-xs mt-1" style={{ color: loginContrast.secondaryText, lineHeight: 1.35 }}>
                        {option.detail}
                      </span>
                    </button>
                  );
                })}
              </div>

              {renderTextInput({
                id: 'signup-email',
                label: '이메일',
                type: 'email',
                value: signupForm.email,
                onChange: (value) => updateSignupField('email', value),
                placeholder: 'kapool-user@email.com',
                autoComplete: 'email',
              })}
              {renderTextInput({
                id: 'signup-password',
                label: '비밀번호',
                type: 'password',
                value: signupForm.password,
                onChange: (value) => updateSignupField('password', value),
                placeholder: '새 비밀번호',
                autoComplete: 'new-password',
              })}
              {renderTextInput({
                id: 'signup-name',
                label: '이름',
                value: signupForm.name,
                onChange: (value) => updateSignupField('name', value),
                placeholder: '홍길동',
                autoComplete: 'name',
              })}
              {renderTextInput({
                id: 'signup-nickname',
                label: '닉네임',
                value: signupForm.nickname,
                onChange: (value) => updateSignupField('nickname', value),
                placeholder: '캠퍼스라이더',
                autoComplete: 'nickname',
              })}
              {renderTextInput({
                id: 'signup-department',
                label: '학과',
                value: signupForm.department,
                onChange: (value) => updateSignupField('department', value),
                placeholder: '컴퓨터소프트웨어학부',
                autoComplete: 'organization-title',
              })}
              {renderTextInput({
                id: 'signup-home-region',
                label: '주요 출발 지역',
                value: signupForm.homeRegion ?? '',
                onChange: (value) => updateSignupField('homeRegion', value),
                placeholder: '전주, 익산, 군산 등',
                autoComplete: 'address-level2',
                required: false,
              })}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mt-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: loginBrand.cta,
                  color: '#FFFFFF',
                  boxShadow: `0 12px 30px ${loginBrand.glow}`,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  outlineColor: theme.brandMint,
                }}
              >
                <UserPlus size={16} strokeWidth={2.5} />
                {isSubmitting ? '생성 중' : 'KAPOOL 시작하기'}
              </button>
            </form>
          </>
        )}

        {error && (
          <div role="alert" className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold relative z-10" style={{ background: theme.roseDim, color: theme.rose }}>
            {error}
          </div>
        )}

        <div className="relative z-10 mt-4 pb-2 text-center text-sm" style={{ color: loginContrast.secondaryText }}>
          <span>{mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}</span>
          <button
            type="button"
            onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
            className="ml-2 font-black underline-offset-4 transition-colors active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ color: theme.brandMint, cursor: 'pointer', outlineColor: theme.brandMint }}
          >
            {mode === 'login' ? '회원가입하기' : '로그인하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
