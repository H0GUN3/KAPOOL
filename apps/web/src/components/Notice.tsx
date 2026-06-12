import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { theme } from '../lib/theme';

type NoticeTone = 'mint' | 'blue' | 'warm';

interface NoticeProps {
  title: string;
  children: ReactNode;
  tone?: NoticeTone;
  className?: string;
}

const toneMap = {
  mint: { color: theme.mint, background: theme.mintDim, border: theme.borderMint },
  blue: { color: theme.blue, background: theme.blueDim, border: theme.borderBlue },
  warm: { color: theme.warm, background: theme.warmDim, border: theme.borderWarm },
};

export function Notice({ title, children, tone = 'mint', className = '' }: NoticeProps) {
  const styles = toneMap[tone];

  return (
    <div
      className={`rounded-2xl p-3.5 border flex gap-2.5 ${className}`}
      style={{
        background: styles.background,
        border: `1px solid ${styles.border}`,
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: theme.cardStrong,
          border: `1px solid ${theme.border}`,
        }}
      >
        <Info size={13} color={styles.color} strokeWidth={2.4} />
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold mb-1" style={{ color: styles.color }}>
          {title}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: theme.txt1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
