'use client';

import { MessageSquare, Tv, Video } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { UserAvatar } from '@/components/ui/UserAvatar';

type LayoutMode = 'both' | 'chat_only';

type MobileRoomHeaderProps = {
  connected: boolean;
  username: string;
  partnerUsername: string | null;
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
};

export function MobileRoomHeader({
  connected,
  username,
  partnerUsername,
  layoutMode,
  onLayoutChange,
}: MobileRoomHeaderProps) {
  return (
    <header className="lg:hidden cinema-glass border-b border-white/5 shrink-0 z-20">
      <div className="px-3 pt-2 pb-2 flex items-center gap-2.5">
        <div className="p-2 bg-purple-600/15 border border-purple-500/25 rounded-xl shrink-0">
          <Tv className="w-5 h-5 text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">Private Cinema</p>
          <p className="text-[11px] text-gray-500 truncate">
            {partnerUsername ? `With ${partnerUsername}` : 'Waiting for partner…'}
          </p>
        </div>
        <StatusPill connected={connected} />
        <UserAvatar name={username} size="sm" />
      </div>

      <div className="px-3 pb-2.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => onLayoutChange('both')}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 touch-manipulation ${
            layoutMode === 'both'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-white/5 text-gray-400 border border-white/8'
          }`}
        >
          <Video className="w-4 h-4 shrink-0" />
          Video + Chat
        </button>
        <button
          type="button"
          onClick={() => onLayoutChange('chat_only')}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 touch-manipulation ${
            layoutMode === 'chat_only'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-white/5 text-gray-400 border border-white/8'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          Chat only
        </button>
      </div>
    </header>
  );
}
