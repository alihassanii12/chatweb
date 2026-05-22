'use client';

import { CinemaModeToggle } from './CinemaModeToggle';

type MobileRoomHeaderProps = {
  connected: boolean;
  partnerUsername: string | null;
  cinemaMode: boolean;
  onCinemaToggle: () => void;
};

export function MobileRoomHeader({
  connected,
  partnerUsername,
  cinemaMode,
  onCinemaToggle,
}: MobileRoomHeaderProps) {
  return (
    <header className="lg:hidden border-b border-white/5 shrink-0 z-20 bg-[#0a0a0c]/95">
      <div className="px-2.5 py-2 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            connected ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">Private Cinema</p>
          <p className="text-[10px] text-gray-600 truncate">
            {partnerUsername ?? 'Chat & call'}
          </p>
        </div>
        <CinemaModeToggle enabled={cinemaMode} onToggle={onCinemaToggle} />
      </div>
    </header>
  );
}
