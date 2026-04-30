'use client';

import { AVATAR_COLORS } from '@/lib/theme';

interface AvatarProps {
  name: string;
  idx?: number;
  size?: number;
}

export function Avatar({ name, idx = 0, size = 32 }: AvatarProps) {
  const [a, b] = AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-bold text-white rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: size * 0.35,
      }}
    >
      {name[0]}
    </div>
  );
}
