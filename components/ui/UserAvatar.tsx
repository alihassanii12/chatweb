const PALETTE = [
  'from-violet-500 to-purple-700',
  'from-fuchsia-500 to-pink-700',
  'from-indigo-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

type UserAvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
};

export function UserAvatar({ name, size = 'md', className = '' }: UserAvatarProps) {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  const gradient = colorForName(name || 'guest');

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shadow-lg shadow-black/30 ring-2 ring-white/10 shrink-0 ${className}`}
      title={name}
    >
      {initial}
    </div>
  );
}
