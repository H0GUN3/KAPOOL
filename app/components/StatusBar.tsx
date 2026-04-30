'use client';

import { useEffect, useState } from 'react';
import { theme } from '../lib/theme';

export function StatusBar() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex justify-between items-center px-6 pt-2 pb-1 text-xs font-semibold flex-shrink-0 z-10 relative"
      style={{ color: theme.txt0 }}
    >
      <span>{time}</span>
      <div className="flex gap-1.5 items-center text-xs">
        <span style={{ letterSpacing: '0.1em' }}>●●●</span>
        <span>WiFi</span>
        <span className="text-sm">🔋</span>
      </div>
    </div>
  );
}
