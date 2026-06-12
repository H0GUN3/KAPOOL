'use client';

import { UserRound } from 'lucide-react';
import { AVATAR_COLORS, theme } from '@/lib/theme';

interface AvatarProps {
  name: string;
  idx?: number;
  size?: number;
  photoDataUrl?: string;
}

export function Avatar({ name, idx = 0, size = 32, photoDataUrl }: AvatarProps) {
  const [a, b] = AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-bold text-white rounded-full overflow-hidden"
      style={{
        width: size,
        height: size,
        background: photoDataUrl ? theme.bg2 : `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: size * 0.35,
      }}
    >
      {photoDataUrl ? (
        <img src={photoDataUrl} alt={`${name} 프로필`} className="h-full w-full object-cover" />
      ) : (
        <UserRound aria-hidden="true" focusable="false" size={size * 0.58} strokeWidth={2.2} />
      )}
    </div>
  );
}
